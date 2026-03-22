import { useState, useEffect } from 'react'
import './App.css'
import QuizEngine from './QuizEngineComponent.jsx'
import t1Data from './Data/t1.json'
import LoginPage from './LoginPage'
import ProfilePage from './ProfilePage'
import { useAuth } from './AuthContext'
import { supabase } from './supabaseClient'
import FamousPracticeBooks from './components/FamousPracticeBooks/FamousPracticeBooks'
import BookChaptersView from './components/BookChaptersView/BookChaptersView'
import AdminDashboard from './components/AdminDashboard/AdminDashboard'

function App() {
  const [selectedTest, setSelectedTest] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [isFetchingTest, setIsFetchingTest] = useState(false);
  const [view, setView] = useState('dashboard'); // 'dashboard', 'profile', or 'admin'
  const { user, logout, loading } = useAuth();
  
  const [stats, setStats] = useState({ totalXp: 0, level: 1, nextLevelXp: 100, progress: 0 });
  const [history, setHistory] = useState([]);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Leveling Formula: Level = Floor(Sqrt(XP) / 5) + 1
  const calculateLevelData = (xp) => {
    const level = Math.floor(Math.sqrt(xp) / 5) + 1;
    const nextLevel = level + 1;
    const currentLevelXp = Math.pow((level - 1) * 5, 2);
    const nextLevelXp = Math.pow(level * 5, 2);
    const progress = ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;
    
    return { level, nextLevelXp, progress: Math.min(progress, 100) };
  };

  useEffect(() => {
    if (user && !selectedTest) {
      fetchStudentData();
    }
  }, [user, selectedTest]);

  const fetchStudentData = async () => {
    try {
      setIsDataLoading(true);
      
      // 1. Fetch Profile (XP)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('total_xp')
        .eq('id', user.sub)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') throw profileError;

      const xp = profile?.total_xp || 0;
      const levelData = calculateLevelData(xp);
      setStats({ totalXp: xp, ...levelData });

      // 2. Fetch All User Results (needed for chapter progress tracking)
      const { data: results, error: resultsError } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', user.sub)
        .order('completed_at', { ascending: false });

      if (resultsError) throw resultsError;
      setHistory(results || []);

    } catch (error) {
      console.error("Error fetching dashboard data:", error.message);
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleStartTest = (test) => {
    setSelectedTest(test);
  };

  const handleStartPracticeBook = (book) => {
    if (!book.isAvailable) return;
    setSelectedBook(book); // Renders the BookChaptersView
  };

  const handleStartChapter = async (chapter) => {
    try {
      setIsFetchingTest(true);
      
      // Lazily fetch the practice book data from the public assessments folder
      const response = await fetch(chapter.dataFile);
      if (!response.ok) throw new Error("Failed to load chapter data at " + chapter.dataFile);
      const testData = await response.json();
      
      const chapterTest = {
        id: chapter.id,
        name: `${selectedBook.series}: ${chapter.title}`,
        description: `Chapter ${chapter.chapterNumber} Assessment`,
        questionsCount: testData.questions ? testData.questions.length : chapter.questionsCount,
        data: testData,
        isChapter: true
      };
      
      setSelectedTest(chapterTest);
    } catch (error) {
      console.error("Error loading chapter data:", error);
      alert("Uh oh! We couldn't load this chapter right now.");
    } finally {
      setIsFetchingTest(false);
    }
  };

  const handleBackToDashboard = () => {
    setSelectedTest(null);
    setSelectedBook(null);
  };

  // Available tests mapping
  const tests = [
    {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Mathematics Assessment 1',
      description: 'Practice questions for Algebra and Geometry fundamentals.',
      questionsCount: t1Data.questions ? t1Data.questions.length : (Array.isArray(t1Data) ? t1Data.length : 0),
      data: t1Data
    },
  ];

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Initializing MathX ecosystem...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (selectedTest) {
    return (
      <QuizEngine 
        testData={selectedTest} 
        onBack={() => setSelectedTest(null)} // Returns to Chapter View, or Dashboard
      />
    );
  }

  if (selectedBook) {
    return (
      <BookChaptersView 
        book={selectedBook} 
        userHistory={history}
        onStartChapter={handleStartChapter}
        onBack={() => setSelectedBook(null)}
        isFetchingTest={isFetchingTest}
      />
    );
  }

  if (view === 'admin') {
    return <AdminDashboard onBack={() => setView('dashboard')} />;
  }

  if (view === 'profile') {
    return (
      <ProfilePage 
        user={user} 
        stats={stats} 
        history={history} 
        onBack={() => setView('dashboard')} 
      />
    );
  }

  const averageAccuracy = history.length > 0 
    ? (history.reduce((acc, res) => acc + (res.score / res.total_questions), 0) / history.length) * 100 
    : 0;

  return (
    <div className="lms-dashboard">
      <div className="premium-bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>
      
      <header className="lms-header">
        <div className="lms-brand">
          <h1>MATH-X <span>LMS</span></h1>
        </div>

        <div className="header-actions">
          <button className="visit-profile-btn" onClick={() => setView('profile')}>
            <i className="fas fa-user-circle"></i> Profile
          </button>
          <div className="level-badge-container">
            <div className="level-info">
              <span className="level-number">Lvl {stats.level}</span>
              <div className="level-bar-background">
                <div className="level-bar-fill" style={{ width: `${stats.progress}%` }}></div>
              </div>
              <span className="xp-text">{Math.round(stats.totalXp)} XP</span>
            </div>
          </div>

          <div className="user-profile-nav">
            <button className="btn-admin-access" onClick={() => setView('admin')} title="Admin Toolkit">
              <i className="fas fa-shield-alt"></i>
            </button>
            <div className="user-info">
              <img src={user.picture} alt={user.name} className="user-avatar" />
              <div className="user-details">
                <span className="user-name">{user.name} <span className="sync-badge">Live Sync</span></span>
                <span className="user-role">Student</span>
              </div>
            </div>
            <button className="logout-btn" onClick={logout} title="Sign Out">
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
      </header>

      <main>
        {isDataLoading ? (
          <div className="dashboard-loading">
            <div className="loader"></div>
            <p>Loading your dashboard...</p>
          </div>
        ) : (
        <>
        <section className="student-overview">
          <div className="overview-header">
            <h2>Academic Performance</h2>
            <p>Your learning journey at a glance</p>
          </div>
          
          <div className="stats-grid">
            <div className="stat-card premium">
              <div className="stat-icon-wrapper xp">
                <i className="fas fa-bolt"></i>
              </div>
              <div className="stat-content">
                <span className="stat-value">{stats.totalXp}</span>
                <span className="stat-label">Total XP Earned</span>
              </div>
            </div>

            <div className="stat-card premium">
              <div className="stat-icon-wrapper accuracy">
                <i className="fas fa-bullseye"></i>
              </div>
              <div className="stat-content">
                <span className="stat-value">{Math.round(averageAccuracy)}%</span>
                <span className="stat-label">Average Accuracy</span>
              </div>
            </div>

            <div className="stat-card premium">
              <div className="stat-icon-wrapper tests">
                <i className="fas fa-check-double"></i>
              </div>
              <div className="stat-content">
                <span className="stat-value">{history.length}</span>
                <span className="stat-label">Tests Completed</span>
              </div>
            </div>
          </div>
        </section>

        <FamousPracticeBooks onStartPractice={handleStartPracticeBook} />

        <section className="dashboard-content-grid">
          <div className="available-assessments">
            <div className="section-header">
              <h3>Available Assessments</h3>
              <p>Select a test to begin</p>
            </div>
            <div className="test-grid">
              {tests.map(test => (
                <div key={test.id} className="test-card" onClick={() => handleStartTest(test)}>
                  <div className="test-info">
                    <div className="test-icon">
                      <i className="fas fa-file-alt"></i>
                    </div>
                    <h3>{test.name}</h3>
                    <p>{test.description}</p>
                  </div>
                  <div className="test-status">
                    <span className="question-count">{test.questionsCount} Questions</span>
                    <button className="btn-start">Start Test</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="recent-activity">
            <div className="section-header">
              <h3>Recent History</h3>
              <p>Your last 5 attempts</p>
            </div>
            <div className="history-list">
              {history.length > 0 ? (
                history.map(result => (
                  <div key={result.id} className="history-item">
                    <div className="history-icon">
                      <i className="fas fa-clipboard-check"></i>
                    </div>
                    <div className="history-details">
                      <span className="history-name">Math Assessment</span>
                      <span className="history-date">
                        {new Date(result.completed_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="history-score">
                      <span className="score-val">{result.score}/{result.total_questions}</span>
                      <span className="score-pct">{Math.round((result.score / result.total_questions) * 100)}%</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="history-empty">
                  <i className="fas fa-history"></i>
                  <p>No test history yet</p>
                </div>
              )}
            </div>
          </div>
        </section>
        </>
        )}
      </main>
    </div>
  )
}

export default App
