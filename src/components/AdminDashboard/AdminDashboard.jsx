import React, { useState } from 'react';
import './AdminDashboard.css';
import practiceBooks from '../../Data/practiceBooks.json';

const AdminDashboard = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('manage');

  // --- General State ---
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // --- Manage Library / Chapter View State ---
  const [selectedManageBook, setSelectedManageBook] = useState(null);
  const [manageChapters, setManageChapters] = useState([]);
  const [isFetchingChapters, setIsFetchingChapters] = useState(false);

  // --- Book Form State ---
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingBookId, setEditingBookId] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [bookSeries, setBookSeries] = useState('');
  const [bookSubject, setBookSubject] = useState('');
  const [bookGrade, setBookGrade] = useState('');
  const [bookPublisher, setBookPublisher] = useState('');
  const [bookColor, setBookColor] = useState('#3b82f6');
  const [bookIcon, setBookIcon] = useState('fas fa-book');
  const [bookDesc, setBookDesc] = useState('');
  const [isPublishingBook, setIsPublishingBook] = useState(false);
  const [isDeletingBook, setIsDeletingBook] = useState(false);

  // --- Chapter Form State ---
  const [selectedBookId, setSelectedBookId] = useState('');
  const [chapterNum, setChapterNum] = useState('');
  const [chapterTitle, setChapterTitle] = useState('');
  
  // JSON Upload Modes
  const [uploadMode, setUploadMode] = useState('file'); // 'file' or 'raw'
  const [selectedFile, setSelectedFile] = useState(null); 
  const [rawJsonData, setRawJsonData] = useState('');
  
  const [isPublishingChapter, setIsPublishingChapter] = useState(false);

  /* ================== ROOT CONTROLS ================== */
  const switchTab = (tab) => {
    setActiveTab(tab); 
    setErrorMsg(''); 
    setSuccessMsg('');
    if (tab === 'manage') setSelectedManageBook(null); // Return to grid view
    if (tab === 'book' && !isEditMode) resetBookForm();
  };

  /* ================== BOOK CRUD ================== */
  const resetBookForm = () => {
    setIsEditMode(false);
    setEditingBookId('');
    setBookTitle(''); setBookSeries(''); setBookSubject(''); setBookGrade(''); setBookDesc('');
    setBookPublisher(''); setBookColor('#3b82f6'); setBookIcon('fas fa-book');
  };

  const handleEditClick = (book) => {
    setErrorMsg(''); setSuccessMsg('');
    setActiveTab('book');
    setIsEditMode(true);
    setEditingBookId(book.id);
    setBookTitle(book.title.trim());
    setBookSeries(book.series.trim());
    setBookSubject(book.subject || '');
    setBookGrade(book.grade);
    setBookPublisher(book.publisher);
    setBookDesc(book.description || '');
    setBookColor(book.coverColor || '#3b82f6');
    setBookIcon(book.icon || 'fas fa-book');
  };

  const handleDeleteBook = async (book) => {
    if (!window.confirm(`⚠️ WARNING ⚠️\n\nPermanently delete "${book.title}" and all its chapters? This physically deletes files from your hard drive.`)) return;

    try {
      setIsDeletingBook(true);
      setErrorMsg(''); setSuccessMsg('');

      const response = await fetch('/api/admin/remove-book', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: book.id })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setSuccessMsg(`"${book.title}" was purged from the codebase successfully.`);
      if (activeTab !== 'manage') setActiveTab('manage');
      resetBookForm();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete book.');
    } finally {
      setIsDeletingBook(false);
    }
  };

  const handleCreateOrUpdateBook = async (e) => {
    e.preventDefault();
    if (!bookTitle || !bookSeries || !bookSubject || !bookGrade) return;

    try {
      setIsPublishingBook(true);
      setErrorMsg(''); setSuccessMsg('');

      const bookId = isEditMode && editingBookId 
        ? editingBookId 
        : `book-${bookTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

      const payload = {
        id: bookId, title: bookTitle, series: bookSeries, subject: bookSubject, publisher: bookPublisher || 'Independent',
        grade: bookGrade, description: bookDesc, coverColor: bookColor, icon: bookIcon
      };

      const routeName = isEditMode ? '/api/admin/update-book' : '/api/admin/create-book';
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(routeName, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      if (isEditMode) setSuccessMsg(`Book "${bookTitle}" was successfully updated.`);
      else {
        setSuccessMsg(`Book "${bookTitle}" was structurally created in the project!`);
        resetBookForm();
      }
      setActiveTab('manage');
      setSelectedManageBook(null);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to process book.');
    } finally {
      setIsPublishingBook(false);
    }
  };

  /* ================== CHAPTER CRUD ================== */
  const handleViewChapters = async (book) => {
    setSelectedManageBook(book);
    setIsFetchingChapters(true);
    setManageChapters([]);
    try {
      const response = await fetch(`/assessments/${book.id}/index.json`);
      if (response.ok) {
        const data = await response.json();
        setManageChapters(data);
      }
    } catch (e) {
       console.warn("No chapters published yet for this book.");
    } finally {
      setIsFetchingChapters(false);
    }
  };

  const handleEditChapter = async (chapter) => {
    try {
      setErrorMsg(''); setSuccessMsg('');
      const response = await fetch(chapter.dataFile); 
      if (!response.ok) throw new Error("Could not locate the physical chapter JSON file on the disk.");
      const jsonData = await response.json();
      
      // Auto-populate the injection tab with the fetched data
      setSelectedBookId(selectedManageBook.id);
      setChapterNum(chapter.chapterNumber.toString());
      setChapterTitle(chapter.title);
      setUploadMode('raw');
      setRawJsonData(JSON.stringify(jsonData, null, 2));
      
      setActiveTab('chapter');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to initialize editing context.');
    }
  };

  const handleDeleteChapter = async (chapter) => {
    if (!window.confirm(`Permanently wipe Chapter ${chapter.chapterNumber} (${chapter.title}) and its JSON file payload from reality?`)) return;
    try {
      const response = await fetch('/api/admin/remove-chapter', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: selectedManageBook.id, chapterNumber: chapter.chapterNumber })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      setSuccessMsg(`Chapter ${chapter.chapterNumber} was deleted from the disk.`);
      setManageChapters(manageChapters.filter(c => c.chapterNumber !== chapter.chapterNumber));
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handlePublishChapter = async (e) => {
    e.preventDefault();
    if (!selectedBookId || !chapterNum || !chapterTitle) return;
    if (uploadMode === 'file' && !selectedFile) return;
    if (uploadMode === 'raw' && !rawJsonData.trim()) return;

    try {
      setIsPublishingChapter(true);
      setErrorMsg(''); setSuccessMsg('');

      const processPayload = async (jsonPayload) => {
        if (!jsonPayload.questions || !Array.isArray(jsonPayload.questions)) {
          throw new Error("Invalid format. The JSON data must have a root 'questions' property containing an array.");
        }

        const payload = {
          bookId: selectedBookId, chapterNumber: chapterNum, chapterTitle: chapterTitle, jsonPayload: jsonPayload 
        };

        const response = await fetch('/api/admin/create-chapter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        setSuccessMsg(`Success! Chapter ${chapterNum} uploaded accurately with ${jsonPayload.questions.length} questions.`);
        setChapterNum(''); setChapterTitle(''); setSelectedFile(null); setRawJsonData('');
      };

      if (uploadMode === 'file') {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const jsonPayload = JSON.parse(event.target.result);
            await processPayload(jsonPayload);
          } catch (err) {
            setErrorMsg("Failed to process uploaded JSON code. Syntax Error: " + err.message);
          } finally {
            setIsPublishingChapter(false);
          }
        };
        reader.readAsText(selectedFile);
      } else {
        try {
          const jsonPayload = JSON.parse(rawJsonData);
          await processPayload(jsonPayload);
        } catch (err) {
          setErrorMsg("Syntax Error in Raw JSON! Make sure formatting is extremely precise: " + err.message);
        } finally {
          setIsPublishingChapter(false);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to publish chapter.');
      setIsPublishingChapter(false);
    }
  };

  return (
    <div className="admin-dashboard-layout">
      {/* SIDEBAR NAVIGATION */}
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-logo-glow">
            <i className="fas fa-project-diagram"></i>
          </div>
          <div>
            <h2>MATH-X CMS</h2>
            <span>System Administrator</span>
          </div>
        </div>
        
        <nav className="admin-nav-menu">
          <p className="admin-nav-label">Database Control</p>
          <button 
            className={`admin-nav-btn ${activeTab === 'manage' ? 'active' : ''}`}
            onClick={() => switchTab('manage')}
          >
            <i className="fas fa-database"></i> 
            <span>Manage Library</span>
          </button>
          
          <button 
            className={`admin-nav-btn ${activeTab === 'book' ? 'active' : ''}`}
            onClick={() => switchTab('book')}
          >
            <i className="fas fa-folder-plus"></i> 
            <span>{isEditMode ? 'Edit Book Properties' : 'Initialize New Book'}</span>
            {isEditMode && <span className="nav-pulse"></span>}
          </button>
          
          <button 
            className={`admin-nav-btn ${activeTab === 'chapter' ? 'active' : ''}`}
            onClick={() => switchTab('chapter')}
          >
            <i className="fas fa-file-upload"></i> 
            <span>Inject Chapter JSON</span>
          </button>
        </nav>

        <div className="admin-sidebar-footer">
          <button className="btn-exit-admin" onClick={onBack}>
            <i className="fas fa-sign-out-alt"></i> Return to LMS
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT WORKSPACE */}
      <main className="admin-workspace">
        <header className="workspace-header">
          <div>
            <h1>{
              activeTab === 'manage' ? 'Library Architecture' : 
              activeTab === 'book' ? (isEditMode ? 'Update Book Schema' : 'Initialize Book Schema') : 
              'Chapter Payload Injector'
            }</h1>
            <p>Direct File-System Bridge Protocol</p>
          </div>
          <div className="server-status">
            <span className="status-dot green"></span> Vite API Connected
          </div>
        </header>

        <div className="workspace-content">
          {errorMsg && (
            <div className="admin-toast error">
              <div className="toast-icon"><i className="fas fa-times-circle"></i></div>
              <div className="toast-content">{errorMsg}</div>
            </div>
          )}
          
          {successMsg && (
            <div className="admin-toast success">
              <div className="toast-icon"><i className="fas fa-check-circle"></i></div>
              <div className="toast-content">{successMsg}</div>
            </div>
          )}

          {/* ======================= MANAGE LIBRARY / CHAPTER VIEW ======================= */}
          {activeTab === 'manage' && (
            <div className="admin-fade-in">
              {/* BOOK LIST VIEW */}
              {!selectedManageBook ? (
                <>
                  <div className="stats-row">
                    <div className="admin-stat-card">
                      <div className="stat-icon"><i className="fas fa-books"></i></div>
                      <div className="stat-data">
                        <h3>{practiceBooks.length}</h3>
                        <p>Total Books Tracked</p>
                      </div>
                    </div>
                  </div>

                  <div className="admin-books-grid">
                    {practiceBooks.map(b => (
                      <div key={b.id} className="admin-book-card">
                        <div className="book-card-color-stripe" style={{ background: b.coverColor }}></div>
                        
                        <div className="book-card-content-area" onClick={() => handleViewChapters(b)}>
                          <div className="book-card-main">
                            <div className="book-icon-wrapper" style={{ color: b.coverColor, background: `${b.coverColor}15` }}>
                              <i className={b.icon}></i>
                            </div>
                            <div className="book-card-info">
                              <h4>{b.series}: {b.title}</h4>
                              <span>Grade: {b.grade}</span>
                            </div>
                          </div>
                          <div className="book-card-hover-hint">
                            <i className="fas fa-chevron-right"></i> View Chapters
                          </div>
                        </div>
                        
                        <div className="book-card-actions">
                          <button className="btn-glass edit" onClick={() => handleEditClick(b)}>
                            <i className="fas fa-pen"></i> Edit Mode
                          </button>
                          <button className="btn-glass delete" onClick={() => handleDeleteBook(b)} disabled={isDeletingBook}>
                            <i className="fas fa-trash"></i> Purge Node
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {practiceBooks.length === 0 && (
                      <div className="admin-empty-state">
                        <i className="fas fa-database"></i>
                        <h3>Database Empty</h3>
                        <p>Initialize a new book to generate the directory structure.</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* CHAPTER LIST VIEW */
                <div className="admin-chapters-view">
                  <div className="manage-chapters-header">
                    <div>
                      <button className="btn-back-manage" onClick={() => setSelectedManageBook(null)}>
                        <i className="fas fa-arrow-left"></i> Back to Books
                      </button>
                      <h3 style={{ marginTop: '1rem', color: 'white' }}>Chapters for "{selectedManageBook.title}"</h3>
                    </div>
                    <button className="btn-primary-glow small" onClick={() => switchTab('chapter')}>
                       <i className="fas fa-plus"></i> Inject Chapter
                    </button>
                  </div>

                  <div className="admin-chapters-list">
                    {isFetchingChapters ? (
                      <div className="admin-empty-state"><i className="fas fa-spinner fa-spin"></i><p>Loading nodes...</p></div>
                    ) : manageChapters.length === 0 ? (
                      <div className="admin-empty-state">
                        <i className="fas fa-layer-group"></i>
                        <p>No Chapters exist inside `public/assessments/{selectedManageBook.id}`.</p>
                      </div>
                    ) : (
                      manageChapters.map(c => (
                        <div key={c.id} className="admin-chapter-row">
                          <div className="admin-chapter-info">
                            <h4><i className="fas fa-file-code" style={{color: '#10b981'}}></i> Chapter {c.chapterNumber}: {c.title}</h4>
                            <span>{c.questionsCount} Data Objects Registered (ID: {c.id})</span>
                          </div>
                          <div className="admin-chapter-actions">
                            <button className="btn-glass edit" onClick={() => handleEditChapter(c)}>
                              <i className="fas fa-code"></i> Edit JSON
                            </button>
                            <button className="btn-glass delete" onClick={() => handleDeleteChapter(c)}>
                              <i className="fas fa-trash"></i> Delete
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================= UPLOAD CHAPTER JSON ======================= */}
          {activeTab === 'chapter' && (
            <form className="admin-glass-form admin-fade-in" onSubmit={handlePublishChapter}>
              <div className="form-legend">
                <i className="fas fa-bolt"></i>
                <div>
                  <strong>JSON Payload Injector</strong>
                  <p>Upload or Paste a standard QuizEngine JSON payload directly into the database.</p>
                </div>
              </div>
              
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Target Database (Book ID)</label>
                  <select value={selectedBookId} onChange={e => setSelectedBookId(e.target.value)} required className="admin-input">
                    <option value="">-- Select Root Dictionary --</option>
                    {practiceBooks.map(b => <option key={b.id} value={b.id}>[{b.id}] {b.title}</option>)}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Chapter / Sequence Number</label>
                  <input type="number" min="1" value={chapterNum} onChange={e => setChapterNum(e.target.value)} placeholder="e.g. 5" required className="admin-input" />
                </div>
              </div>

              <div className="form-group">
                <label>Chapter Display Title <span className="hint-badge">Updates if edited</span></label>
                <input type="text" value={chapterTitle} onChange={e => setChapterTitle(e.target.value)} placeholder="e.g. Thermodynamics" required className="admin-input" />
              </div>

              <div className="form-group expand">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.6rem' }}>
                  <label style={{ marginBottom: 0 }}>
                    Upload Chapter Database Object
                    <span className="hint-badge">Verified JSON Required</span>
                  </label>
                  
                  <div className="upload-mode-toggles">
                    <button type="button" className={`btn-mode-toggle ${uploadMode === 'file' ? 'active' : ''}`} onClick={() => setUploadMode('file')}>
                      <i className="fas fa-file-upload"></i> .json File
                    </button>
                    <button type="button" className={`btn-mode-toggle ${uploadMode === 'raw' ? 'active' : ''}`} onClick={() => setUploadMode('raw')}>
                      <i className="fas fa-code"></i> Raw Code
                    </button>
                  </div>
                </div>

                {uploadMode === 'file' ? (
                  <div className="admin-file-upload">
                    <input 
                      type="file" 
                      accept=".json" 
                      onChange={e => setSelectedFile(e.target.files[0])}
                      className="admin-file-picker"
                      required={uploadMode === 'file'}
                    />
                    {!selectedFile ? (
                      <div className="upload-placeholder">
                        <i className="fas fa-file-invoice"></i> click to select or drag a .json file here
                      </div>
                    ) : (
                      <div className="upload-active">
                        <i className="fas fa-file-check"></i> {selectedFile.name}
                      </div>
                    )}
                  </div>
                ) : (
                  <textarea 
                    className="admin-textarea code-font"
                    value={rawJsonData}
                    onChange={e => setRawJsonData(e.target.value)}
                    placeholder='{ "questions": [ { "id": 1, "text": "What is x?", "options": ["1","2","3","4"], "correctAnswerIndex": 0, "explanation": "..." } ] }'
                    required={uploadMode === 'raw'}
                  ></textarea>
                )}
              </div>

              <div className="form-actions right">
                <button type="submit" className="btn-primary-glow" disabled={isPublishingChapter || !selectedBookId || (uploadMode === 'file' && !selectedFile) || (uploadMode === 'raw' && !rawJsonData)}>
                  {isPublishingChapter ? <><i className="fas fa-compact-disc fa-spin"></i> Processing...</> : <><i className="fas fa-upload"></i> Stream to Codebase</>}
                </button>
              </div>
            </form>
          )}

          {/* ======================= INITIALIZE BOOK ======================= */}
          {activeTab === 'book' && (
            <form className="admin-glass-form admin-fade-in" onSubmit={handleCreateOrUpdateBook}>
              <div className="form-legend">
                <i className="fas fa-folder-tree"></i>
                <div>
                  <strong>{isEditMode ? 'Modify Schema' : 'Initialize Root Schema'}</strong>
                  <p>Defines the baseline directory structure in `/public` for caching capabilities.</p>
                </div>
              </div>
              
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Book Title</label>
                  <input type="text" value={bookTitle} onChange={e => setBookTitle(e.target.value)} placeholder="e.g. Mathematics Part I" required className="admin-input" />
                </div>
                <div className="form-group">
                  <label>Identifier Series</label>
                  <input type="text" value={bookSeries} onChange={e => setBookSeries(e.target.value)} placeholder="e.g. KIPS" required className="admin-input" />
                </div>
                <div className="form-group">
                  <label>Subject / Category</label>
                  <input list="subjects-list" value={bookSubject} onChange={e => setBookSubject(e.target.value)} placeholder="e.g. Physics" required className="admin-input" />
                  <datalist id="subjects-list">
                    <option value="Mathematics" />
                    <option value="Physics" />
                    <option value="Chemistry" />
                    <option value="Biology" />
                    <option value="Computer Science" />
                    <option value="English" />
                    <option value="General Knowledge" />
                  </datalist>
                </div>
                <div className="form-group">
                  <label>Target Audience/Grade</label>
                  <input type="text" value={bookGrade} onChange={e => setBookGrade(e.target.value)} placeholder="e.g. 1st Year" required className="admin-input" />
                </div>
                <div className="form-group">
                  <label>Theme Hex Color</label>
                  <div className="color-input-wrapper">
                    <input type="color" className="color-picker-mini" value={bookColor.length === 7 ? bookColor : '#3b82f6'} onChange={e => setBookColor(e.target.value)} />
                    <input type="text" value={bookColor} onChange={e => setBookColor(e.target.value)} placeholder="#3b82f6" required className="admin-input" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Publisher Metadata</label>
                  <input type="text" value={bookPublisher} onChange={e => setBookPublisher(e.target.value)} placeholder="Optional" className="admin-input" />
                </div>
                <div className="form-group">
                  <label>FontAwesome Node Icon</label>
                  <input type="text" value={bookIcon} onChange={e => setBookIcon(e.target.value)} placeholder="e.g. fas fa-atom" required className="admin-input" />
                </div>
              </div>

              <div className="form-group expand">
                <label>Description String</label>
                <textarea 
                  value={bookDesc} 
                  onChange={e => setBookDesc(e.target.value)} 
                  placeholder="Short blurb about the book..." 
                  className="admin-textarea short"
                  rows="2"
                ></textarea>
              </div>

              <div className="form-actions">
                {isEditMode && (
                  <button type="button" className="btn-secondary-glow" onClick={() => { setActiveTab('manage'); resetBookForm(); }}>
                    Cancel Modification
                  </button>
                )}
                <button type="submit" className="btn-primary-glow" disabled={isPublishingBook || !bookTitle}>
                  {isPublishingBook ? (
                    <><i className="fas fa-spinner fa-spin"></i> Synching File System...</>
                  ) : (
                    <><i className="fas fa-save"></i> {isEditMode ? 'Commit Pattern Update' : 'Generate Directory Structure'}</>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
