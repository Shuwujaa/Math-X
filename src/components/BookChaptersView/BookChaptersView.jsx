import React, { useState, useEffect } from 'react';
import './BookChaptersView.css';

const BookChaptersView = ({ book, userHistory, onStartChapter, onBack, isFetchingTest }) => {
  const [chapters, setChapters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dynamically load the chapter index from the local CMS architecture
  useEffect(() => {
    const fetchChapterIndex = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/assessments/${book.id}/index.json`);
        if (!response.ok) throw new Error("Could not find chapter index.");
        const data = await response.json();
        setChapters(data);
      } catch (error) {
        console.warn("No chapters published yet for this book:", error);
        setChapters([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchChapterIndex();
  }, [book.id]);

  const getChapterStatus = (chapterId) => {
    if (!userHistory || userHistory.length === 0) return null;
    const attempt = userHistory.find(result => result.test_id === chapterId);
    if (!attempt) return null;
    
    const percentage = Math.round((attempt.score / attempt.total_questions) * 100);
    return {
      score: attempt.score,
      total: attempt.total_questions,
      percentage
    };
  };

  const completedChapters = chapters.filter(c => getChapterStatus(c.id)).length;
  const overallProgress = chapters.length > 0 ? Math.round((completedChapters / chapters.length) * 100) : 0;

  return (
    <div className="book-chapters-view">
      <div className="book-hero-header">
        <div className="book-hero-bg" style={{ background: book.coverColor }}></div>
        <div className="book-hero-content">
          <button className="btn-back-hero" onClick={onBack}>
            <i className="fas fa-arrow-left"></i> Back to Library
          </button>
          
          <div className="book-hero-main">
            <div className="book-cover-large" style={{ background: book.coverColor }}>
              <div className="book-spine"></div>
              <i className={book.icon}></i>
              <span className="book-grade-large">{book.grade}</span>
            </div>
            
            <div className="book-hero-details">
              <span className="book-series-badge">{book.series}</span>
              <h1>{book.title}</h1>
              <p className="book-hero-desc">{book.description}</p>
              
              <div className="book-progress-tracker">
                <div className="progress-info">
                  <span>Course Progress</span>
                  <span className="progress-pct">{overallProgress}%</span>
                </div>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ width: `${overallProgress}%` }}></div>
                </div>
                <p className="progress-text">{completedChapters} of {chapters.length} chapters completed</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="chapters-container">
        <div className="chapters-container-header">
          <h3>Course Contents</h3>
          <span className="total-chapters-badge">{chapters.length} Chapters</span>
        </div>

        <div className="chapters-list">
          {isLoading ? (
            <div className="no-chapters premium">
              <i className="fas fa-spinner fa-spin"></i>
              <h3>Loading Chapters...</h3>
            </div>
          ) : chapters.length > 0 ? chapters.map((chapter, index) => {
            const status = getChapterStatus(chapter.id);
            return (
              <div key={chapter.id} className="chapter-card premium">
                <div className="chapter-number-circle">{index + 1}</div>
                <div className="chapter-info">
                  <span className="chapter-number-tag">CHAPTER {chapter.chapterNumber}</span>
                  <h3>{chapter.title}</h3>
                  <div className="chapter-meta">
                    <span className="question-count">
                      <i className="fas fa-list-ul"></i> {chapter.questionsCount} Questions
                    </span>
                    {status && (
                      <span className="chapter-score">
                        <i className="fas fa-crosshairs"></i> Best Score: {status.score}/{status.total}
                      </span>
                    )}
                  </div>
                </div>
                <div className="chapter-actions">
                  {status ? (
                    <div className="status-badge solved">
                      <i className="fas fa-check-circle"></i> <span>Solved ({status.percentage}%)</span>
                    </div>
                  ) : (
                    <div className="status-badge pending">
                      <i className="fas fa-lock-open"></i> <span>Available</span>
                    </div>
                  )}
                  <button 
                    className={`btn-start-chapter ${status ? 'retry' : ''}`}
                    onClick={() => onStartChapter(chapter)}
                    disabled={isFetchingTest}
                  >
                    {isFetchingTest ? (
                      <><i className="fas fa-spinner fa-spin"></i> Loading</>
                    ) : (
                      <>{status ? 'Retake' : 'Start'} <i className="fas fa-play"></i></>
                    )}
                  </button>
                </div>
              </div>
            );
          }) : (
            <div className="no-chapters premium">
              <i className="fas fa-tools"></i>
              <h3>Content Under Construction</h3>
              <p>Chapters for this book are currently being curated. Check back soon!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookChaptersView;
