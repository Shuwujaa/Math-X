import React, { useState } from 'react';
import './FamousPracticeBooks.css';
import practiceBooks from '../../Data/practiceBooks.json';

const FamousPracticeBooks = ({ onStartPractice }) => {
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Filter all books based on the search query
  const filteredBooks = practiceBooks.filter(book => 
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.series.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.publisher.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 2. Organize the filtered books dynamically by Subject
  const booksBySubject = filteredBooks.reduce((acc, book) => {
    const subject = book.subject || 'Uncategorized';
    if (!acc[subject]) acc[subject] = [];
    acc[subject].push(book);
    return acc;
  }, {});

  // Sort subjects alphabetically, putting Uncategorized at the end
  const sortedSubjects = Object.keys(booksBySubject).sort((a, b) => {
    if (a === 'Uncategorized') return 1;
    if (b === 'Uncategorized') return -1;
    return a.localeCompare(b);
  });

  const renderBookCard = (book) => (
    <div key={book.id} className={`book-card premium ${!book.isAvailable ? 'upcoming' : ''}`}>
      {book.isAvailable ? (
        <>
          <div className="book-cover" style={{ background: book.coverColor }}>
            <div className="book-spine"></div>
            <i className={book.icon}></i>
            <span className="book-grade">{book.grade}</span>
          </div>
          <div className="book-details">
            <span className="book-series">{book.series}</span>
            <h3>{book.title}</h3>
            <p>{book.description}</p>
            <button 
              className="btn-practice"
              onClick={() => onStartPractice(book)}
            >
              Start Practice <i className="fas fa-arrow-right"></i>
            </button>
          </div>
        </>
      ) : (
          <>
            <div className="book-cover placeholder">
              <i className={book.icon}></i>
            </div>
            <div className="book-details">
              <h3>{book.series}</h3>
              <p>Coming Soon</p>
            </div>
          </>
      )}
    </div>
  );

  return (
    <section className="famous-practice-books">
      <div className="section-header">
        <div className="header-title-wrapper">
          <h2>Famous Practice Books</h2>
          <p>Featured prep material for your exams</p>
        </div>
        
        <div className="search-bar-wrapper">
          <i className="fas fa-search"></i>
          <input 
            type="text" 
            placeholder="Search books, series, or publishers..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="book-search-input"
          />
        </div>
      </div>

      {sortedSubjects.map(subject => (
        <div key={subject} className="subject-section">
          <h3 className="subject-title">{subject}</h3>
          <div className="books-grid">
            {booksBySubject[subject].map(renderBookCard)}
          </div>
        </div>
      ))}

      {/* Show a message if no books match the search */}
      {filteredBooks.length === 0 && (
        <div className="no-books-found">
          <div className="empty-state-icon">
            <i className="fas fa-search"></i>
          </div>
          <h3>No books found</h3>
          <p>We couldn't find any books matching "{searchQuery}"</p>
        </div>
      )}
    </section>
  );
};

export default FamousPracticeBooks;
