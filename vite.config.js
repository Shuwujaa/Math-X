import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// Custom Vite plugin to handle local CMS API requests
const localCmsPlugin = () => ({
  name: 'local-cms-plugin',
  configureServer(server) {
    // JSON body parser middleware
    server.middlewares.use((req, res, next) => {
      if (req.url.startsWith('/api/admin/')) {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          if (body) {
            try { req.body = JSON.parse(body); } 
            catch (e) { req.body = {}; }
          }
          next();
        });
      } else {
        next();
      }
    });

    server.middlewares.use(async (req, res, next) => {
      // Endpoint 1: Create a Book
      if (req.url === '/api/admin/create-book' && req.method === 'POST') {
        try {
          const { id, title, series, publisher, grade, description, coverColor, icon } = req.body;
          
          const booksPath = path.resolve(__dirname, 'src/Data/practiceBooks.json');
          let books = [];
          if (fs.existsSync(booksPath)) {
            books = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
          }

          if (books.find(b => b.id === id)) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: 'Book already exists! Try a different ID.' }));
          }

          books.push({
            id, title, series, publisher, grade, description, coverColor, icon, isAvailable: true
          });

          fs.writeFileSync(booksPath, JSON.stringify(books, null, 2));

          // Create the public assessments folder & an empty index file
          const assessmentsDir = path.resolve(__dirname, `public/assessments/${id}`);
          if (!fs.existsSync(assessmentsDir)) {
            fs.mkdirSync(assessmentsDir, { recursive: true });
          }
          const indexPath = path.join(assessmentsDir, 'index.json');
          if (!fs.existsSync(indexPath)) {
            fs.writeFileSync(indexPath, JSON.stringify([]));
          }

          res.statusCode = 200;
          return res.end(JSON.stringify({ success: true }));
        } catch (error) {
          res.statusCode = 500;
          return res.end(JSON.stringify({ error: error.message }));
        }
      }

      // Endpoint 2: Create a Chapter
      if (req.url === '/api/admin/create-chapter' && req.method === 'POST') {
        try {
          const { bookId, chapterNumber, chapterTitle, jsonPayload } = req.body;
          
          const assessmentsDir = path.resolve(__dirname, `public/assessments/${bookId}`);
          if (!fs.existsSync(assessmentsDir)) {
            fs.mkdirSync(assessmentsDir, { recursive: true });
          }

          // 1. Write the chapter data file
          const fileName = `chapter-${chapterNumber}.json`;
          fs.writeFileSync(path.join(assessmentsDir, fileName), JSON.stringify(jsonPayload, null, 2));

          // 2. Update the chapter index natively in the public folder
          const indexPath = path.join(assessmentsDir, 'index.json');
          let chapters = [];
          if (fs.existsSync(indexPath)) {
            chapters = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
          }

          const newChapterData = {
            id: `test-${bookId.replace('book-', '')}-ch${chapterNumber}`,
            chapterNumber: parseInt(chapterNumber),
            title: chapterTitle,
            questionsCount: jsonPayload.questions.length,
            dataFile: `/assessments/${bookId}/${fileName}`
          };

          const existingIndex = chapters.findIndex(c => c.chapterNumber === parseInt(chapterNumber));
          if (existingIndex !== -1) {
            chapters[existingIndex] = newChapterData;
          } else {
            chapters.push(newChapterData);
          }

          chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);
          fs.writeFileSync(indexPath, JSON.stringify(chapters, null, 2));

          res.statusCode = 200;
          return res.end(JSON.stringify({ success: true }));
        } catch (error) {
          res.statusCode = 500;
          return res.end(JSON.stringify({ error: error.message }));
        }
      }

      // Endpoint 3: Update a Book
      if (req.url === '/api/admin/update-book' && req.method === 'PUT') {
        try {
          const { id, title, series, publisher, grade, description, coverColor, icon } = req.body;
          const booksPath = path.resolve(__dirname, 'src/Data/practiceBooks.json');
          
          if (!fs.existsSync(booksPath)) throw new Error('Database file missing');
          let books = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
          
          const bookIndex = books.findIndex(b => b.id === id);
          if (bookIndex === -1) throw new Error('Book not found to update!');

          books[bookIndex] = {
            id, title, series, publisher, grade, description, coverColor, icon, 
            isAvailable: books[bookIndex].isAvailable
          };

          fs.writeFileSync(booksPath, JSON.stringify(books, null, 2));

          res.statusCode = 200;
          return res.end(JSON.stringify({ success: true }));
        } catch (error) {
          res.statusCode = 500;
          return res.end(JSON.stringify({ error: error.message }));
        }
      }

      // Endpoint 4: Delete a Book
      if (req.url === '/api/admin/remove-book' && req.method === 'DELETE') {
        try {
          const { id } = req.body;
          
          // 1. Remove from practiceBooks.json
          const booksPath = path.resolve(__dirname, 'src/Data/practiceBooks.json');
          if (fs.existsSync(booksPath)) {
             let books = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
             books = books.filter(b => b.id !== id);
             fs.writeFileSync(booksPath, JSON.stringify(books, null, 2));
          }

          // 2. Erase the empty chapter index reference
          const relativeId = id.replace('book-', '');
          const chaptersIndexPath = path.resolve(__dirname, `src/Data/${relativeId}-chapters.json`);
          if (fs.existsSync(chaptersIndexPath)) {
             fs.unlinkSync(chaptersIndexPath);
          }

          // 3. Purge the entire public folder including all massive JSON payload chapters
          const assessmentsDir = path.resolve(__dirname, `public/assessments/${id}`);
          if (fs.existsSync(assessmentsDir)) {
             fs.rmSync(assessmentsDir, { recursive: true, force: true });
          }

          res.statusCode = 200;
          return res.end(JSON.stringify({ success: true }));
        } catch (error) {
          res.statusCode = 500;
          return res.end(JSON.stringify({ error: error.message }));
        }
      }

      // Endpoint 5: Delete a Chapter
      if (req.url === '/api/admin/remove-chapter' && req.method === 'DELETE') {
        try {
          const { bookId, chapterNumber } = req.body;
          
          const assessmentsDir = path.resolve(__dirname, `public/assessments/${bookId}`);
          const indexPath = path.join(assessmentsDir, 'index.json');
          
          if (fs.existsSync(indexPath)) {
            let chapters = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
            chapters = chapters.filter(c => c.chapterNumber !== parseInt(chapterNumber));
            fs.writeFileSync(indexPath, JSON.stringify(chapters, null, 2));
          }

          const chapterFilePath = path.join(assessmentsDir, `chapter-${chapterNumber}.json`);
          if (fs.existsSync(chapterFilePath)) {
            fs.unlinkSync(chapterFilePath);
          }

          res.statusCode = 200;
          return res.end(JSON.stringify({ success: true }));
        } catch (error) {
          res.statusCode = 500;
          return res.end(JSON.stringify({ error: error.message }));
        }
      }

      next();
    });
  }
});

export default defineConfig({
  plugins: [react(), localCmsPlugin()]
});
