import { useState, useEffect } from 'react';
import './ProfilePage.css';

const ProfilePage = ({ user, stats, history, onBack }) => {
  const [heatmapData, setHeatmapData] = useState([]);

  useEffect(() => {
    generateHeatmapData();
  }, [history]);

  const generateHeatmapData = () => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today to midnight

    // ===============================================
    // FILTER: ONLY COUNT FIRST ATTEMPTS  
    // ===============================================
    // We want to prevent "farming" by ensuring that if a user takes 
    // the same MCQ test multiple times, only their FIRST attempt 
    // counts towards their consistency heatmap.
    // Sort history chronologically from oldest to newest first
    const chronologicalHistory = [...history].sort((a, b) => {
      return new Date(a.completed_at) - new Date(b.completed_at);
    });

    // Track which tests we've already counted
    const seenTests = new Set();
    const validFirstAttempts = chronologicalHistory.filter(item => {
      if (seenTests.has(item.test_id)) {
        return false; // Skip this result, it's a re-take!
      } else {
        seenTests.add(item.test_id); // Mark this test as taken
        return true; // Keep this result, it's their first try
      }
    });

    // Loop backwards from 179 days ago up to today
    for (let i = 179; i >= 0; i--) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - i);
      const dateString = targetDate.toDateString();

      // Find all VALID activities (first attempts) that happened on this specific day
      const dayActivities = validFirstAttempts.filter((item) => {
        const itemDate = new Date(item.completed_at);
        return itemDate.toDateString() === dateString;
      });

      // Sum the scores for this day
      const dailyScore = dayActivities.reduce((sum, item) => sum + item.score, 0);

      // Determine intensity level (0-4) based on score
      let level = 0;
      if (dailyScore > 0 && dailyScore <= 5) level = 1;
      else if (dailyScore > 5 && dailyScore <= 15) level = 2;
      else if (dailyScore > 15 && dailyScore <= 30) level = 3;
      else if (dailyScore > 30) level = 4;

      days.push({
        date: dateString,
        score: dailyScore,
        level: level
      });
    }

    setHeatmapData(days);
  };

  return (
    <div className="profile-page">
      <div className="premium-bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>

      <header className="profile-header">
        <button className="back-btn" onClick={onBack}>
          <i className="fas fa-arrow-left"></i> Dashboard
        </button>
        <div className="profile-identity">
          <img src={user.picture} alt={user.name} className="large-avatar" />
          <div className="identity-text">
            <h1>{user.name}</h1>
            <p>{user.email}</p>
            <div className="profile-badges">
              <span className="badge lvl-badge">Level {stats.level}</span>
              <span className="badge xp-badge">{stats.totalXp} XP</span>
            </div>
          </div>
        </div>
      </header>

      <main className="profile-content">
        <section className="activity-section">
          <div className="section-title">
            <h2>Activity Heatmap</h2>
            <p>Your consistency over the last 6 months</p>
          </div>

          <div className="heatmap-container">
            <div className="heatmap-grid">
              {heatmapData.map((day, i) => (
                <div
                  key={i}
                  className={`heatmap-cell level-${day.level}`}
                  title={`${day.date}: ${day.score} Correct MCQs`}
                ></div>
              ))}
            </div>
            <div className="heatmap-legend">
              <span>Less</span>
              <div className="legend-cells">
                <div className="heatmap-cell level-0"></div>
                <div className="heatmap-cell level-1"></div>
                <div className="heatmap-cell level-2"></div>
                <div className="heatmap-cell level-3"></div>
                <div className="heatmap-cell level-4"></div>
              </div>
              <span>More</span>
            </div>
          </div>
        </section>

        <section className="achievements-section">
          <div className="section-title">
            <h2>Milestones</h2>
          </div>
          <div className="achievements-grid">
            <div className={`achievement-card ${stats.totalXp >= 100 ? 'unlocked' : ''}`}>
              <i className="fas fa-seedling"></i>
              <h4>Novice</h4>
              <p>Reached 100 XP</p>
            </div>
            <div className={`achievement-card ${stats.totalXp >= 500 ? 'unlocked' : ''}`}>
              <i className="fas fa-medal"></i>
              <h4>Scholar</h4>
              <p>Reached 500 XP</p>
            </div>
            <div className={`achievement-card ${stats.totalXp >= 1000 ? 'unlocked' : ''}`}>
              <i className="fas fa-crown"></i>
              <h4>Master</h4>
              <p>Reached 1000 XP</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ProfilePage;

