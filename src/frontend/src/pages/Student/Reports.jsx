import React, { useState, useEffect, useContext } from 'react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { ContextAPI } from '../../Context';

const Reports = () => {
  const [pastAttempts, setPastAttempts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();
  const { studentData } = useContext(ContextAPI);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const attemptsRes = await api.get('/quizzes/attempts');
        const transformed = attemptsRes.data.map(att => ({
          id: att._id,
          submissionId: att._id,
          title: att.quizID?.title || "Deleted Quiz",
          date: new Date(att.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }),
          score: att.percentage,
          total: 100,
          icon: '📝',
          timeTaken: att.timeTaken || '—'
        }));
        setPastAttempts(transformed);
      } catch (err) {
        console.error('Error fetching reports:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const getScoreBadgeClass = (score) => {
    if (score >= 90) return 'score-badge excellent';
    if (score >= 80) return 'score-badge good';
    if (score >= 70) return 'score-badge average';
    return 'score-badge poor';
  };

  const filteredAttempts = pastAttempts.filter(att => {
    if (filter === 'all') return true;
    if (filter === 'excellent') return att.score >= 90;
    if (filter === 'good') return att.score >= 75 && att.score < 90;
    if (filter === 'average') return att.score >= 50 && att.score < 75;
    if (filter === 'poor') return att.score < 50;
    return true;
  });

  if (isLoading) {
    return (
      <div className="student-dashboard loading">
        <div className="dashboard-content" style={{textAlign: 'center', padding: '100px'}}>
          <div className="logo-icon" style={{margin: '0 auto 30px', animation: 'pulse-glow 2s infinite'}}>📊</div>
          <h1 style={{color: 'white'}}>Loading Your Reports...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="student-dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <div className="logo-container" onClick={() => navigate('/student/dashboard')}>
            <div className="logo-icon"><i className="fas fa-chart-bar"></i></div>
            <div className="logo-text">
              <div className="primary">MCQ-GPT</div>
              <div className="secondary">Performance History</div>
            </div>
          </div>
        </div>
        <div className="header-right">
          <div className="user-profile" onClick={() => navigate('/student/dashboard')}>
            <div className="user-avatar">{studentData?.name?.[0] || 'S'}</div>
            <div className="user-info"><h4>{studentData?.name || 'Student'}</h4></div>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        <section className="welcome-section">
          <h1>Your <span className="highlight">Performance Journey</span> 📊</h1>
          <p>Review your past attempts, analyze your progress, and download detailed reports.</p>
        </section>

        <section className="section-container">
          <div className="quiz-table">
            <div className="quiz-table-header">
              <h3><i className="fas fa-list"></i> All Quiz Attempts ({filteredAttempts.length})</h3>
              <div className="filter-group" style={{ display: 'flex', gap: '10px' }}>
                <select 
                  value={filter} 
                  onChange={(e) => setFilter(e.target.value)}
                  className="filter-select"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white',
                    padding: '5px 15px',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">All Scores</option>
                  <option value="excellent">Excellent (90%+)</option>
                  <option value="good">Good (75-89%)</option>
                  <option value="average">Average (50-74%)</option>
                  <option value="poor">Poor (Below 50%)</option>
                </select>
              </div>
            </div>

            <div className="quiz-items">
              {filteredAttempts.length > 0 ? (
                filteredAttempts.map((attempt, index) => (
                  <div 
                    key={attempt.id} 
                    className="quiz-item"
                    style={{ animationDelay: `${0.1 * index}s` }}
                    onClick={() => navigate(`/student/report/${attempt.submissionId}`)}
                  >
                    <div className="quiz-info">
                      <div className="quiz-icon">{attempt.icon}</div>
                      <div className="quiz-details">
                        <h4>{attempt.title}</h4>
                        <p>Completed on {attempt.date} • Time taken: {attempt.timeTaken}</p>
                      </div>
                    </div>
                    
                    <div className="quiz-meta">
                      <div className={getScoreBadgeClass(attempt.score)}>
                        <span className="score-value">{attempt.score}%</span>
                      </div>
                      
                      <div className="quiz-actions">
                        <button className="icon-btn" title="View Detailed Report">
                          <i className="fas fa-eye"></i>
                        </button>
                        <button className="icon-btn" title="Download Results">
                          <i className="fas fa-download"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-data-message" style={{ textAlign: 'center', padding: '50px', color: 'rgba(255,255,255,0.4)' }}>
                  <i className="fas fa-folder-open" style={{ fontSize: '3rem', marginBottom: '15px' }}></i>
                  <p>No reports found matching the filter.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <footer className="dashboard-footer">
          <button className="action-btn" onClick={() => navigate('/student/dashboard')}>
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </button>
        </footer>
      </div>
    </div>
  );
};

export default Reports;
