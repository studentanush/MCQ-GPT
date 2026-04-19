import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import './EducatorDashboard.css';
import { ContextAPI } from '../../Context';
import api from '../../services/api';



const EducatorDashboard = () => {
  const [typingText, setTypingText] = useState('');
  const [notifications] = useState(0);
  const navigate = useNavigate();
  const { educatorData } = useContext(ContextAPI);
  const [recentQuizzes, setRecentQuizzes] = useState([]);
  const [quizzesLoading, setQuizzesLoading] = useState(true);
  const [stats, setStats] = useState({ totalQuizzes: 0, totalStudents: 0, avgScore: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  // Fetch dashboard data
  useEffect(() => {
    const fetchData = async () => {
      const eduInfo = sessionStorage.getItem('edu_info');
      if (!eduInfo) { setQuizzesLoading(false); setStatsLoading(false); return; }
      const { token } = JSON.parse(eduInfo);
      try {
        setQuizzesLoading(true);
        const qRes = await api.get('/quizzes/getUserQuizes');
        setRecentQuizzes(qRes.data.slice(0, 5));

        setStatsLoading(true);
        const sRes = await api.get('/quizzes/educator-stats');
        setStats(sRes.data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setQuizzesLoading(false);
        setStatsLoading(false);
      }
    };
    fetchData();
  }, []);
  const welcomeMessages = [
    "Create engaging quizzes in seconds",
    "Track student progress in real-time",
    "Generate AI-powered assessments",
    "Host live interactive sessions"
  ];

  useEffect(() => {
    let currentMessage = 0;
    let currentChar = 0;
    let isDeleting = false;
    let timer;

    const type = () => {
      const message = welcomeMessages[currentMessage];
      
      if (isDeleting) {
        setTypingText(message.substring(0, currentChar - 1));
        currentChar--;
      } else {
        setTypingText(message.substring(0, currentChar + 1));
        currentChar++;
      }

      if (!isDeleting && currentChar === message.length) {
        isDeleting = true;
        timer = setTimeout(type, 2000);
      } else if (isDeleting && currentChar === 0) {
        isDeleting = false;
        currentMessage = (currentMessage + 1) % welcomeMessages.length;
        timer = setTimeout(type, 500);
      } else {
        const speed = isDeleting ? 50 : 100;
        timer = setTimeout(type, speed);
      }
    };

    timer = setTimeout(type, 1000);
    return () => clearTimeout(timer);
  }, []);

  const actions = [
    { 
      id: 'chat',
      icon: 'fas fa-plus-circle', 
      title: 'Create New Quiz', 
      description: 'Generate AI-powered quizzes with document upload and chat',
      color: 'linear-gradient(135deg, #8a2be2, #f72585)',
      link: '/educator/chat'
    },
    { 
      id: 'library',
      icon: 'fas fa-book-open', 
      title: 'Quiz Library', 
      description: 'View, edit and manage all your generated quizzes',
      color: 'linear-gradient(135deg, #4361ee, #4cc9f0)',
      link: '/educator/generated'
    },
    { 
      id: 'reports',
      icon: 'fas fa-chart-bar', 
      title: 'View Reports', 
      description: 'Analyze student performance with detailed analytics',
      color: 'linear-gradient(135deg, #f72585, #ff80ab)',
      link: '/educator/reports'
    },
  ];

  const handleNavigation = (path) => {
    console.log('Navigating to:', path);
    navigate(path);
  };

  const handleEditQuiz = (quiz) => {
    navigate(`/educator/live-quiz/${quiz._id}`);
  };

  const handleShareQuiz = (quiz) => {
    const shareUrl = `${window.location.origin}/attend-quiz/${quiz._id}`;
    if (navigator.share) {
      navigator.share({
        title: quiz.title,
        text: `Join my quiz "${quiz.title}" on MCQ-GPT`,
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert(`Quiz link copied!\n\n${shareUrl}`);
    }
  };

  const handleViewQuiz = (quiz) => {
    navigate('/educator/generated');
  };

  const handleNotificationClick = () => {
    alert('No new notifications');
  };

  const handleProfileClick = () => {
    navigate('/educator/dashboard');
  };

  const handleLogoClick = () => {
    navigate('/educator/dashboard');
  };

  return (
    <div className="educator-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <div className="logo-container" onClick={handleLogoClick}>
            <div className="logo-icon">
              <i className="fas fa-brain"></i>
            </div>
            <div className="logo-text">
              <div className="primary">MCQ-GPT</div>
              <div className="secondary">Educator Portal</div>
            </div>
          </div>
          <div className="typing-text">{typingText}</div>
        </div>

        <div className="header-right">
          <div className="notification-bell" onClick={handleNotificationClick}>
            <i className="fas fa-bell"></i>
            {notifications > 0 && (
              <div className="notification-badge">{notifications}</div>
            )}
          </div>
          
          <div className="user-profile" onClick={handleProfileClick}>
            <div className="user-avatar">
              <i className="fas fa-chalkboard-teacher"></i>
            </div>
            <div className="user-info">
              <h4>{educatorData.name}</h4>
              <p>{educatorData.role === 'educator' ? 'Professional Educator' : educatorData.role}</p>
            </div>
            <i className="fas fa-chevron-down" style={{marginLeft: '10px'}}></i>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="dashboard-content">
        {/* Welcome Section */}
        <section className="welcome-section">
          <h1>
            Welcome back, <span className="highlight">{educatorData.name}</span>! 👋
          </h1>
          <p>
            Ready to create some amazing learning experiences today?
            Your students are waiting for your next engaging quiz!
          </p>
        </section>

        {/* Stats Summary Bar */}
        <section className="stats-bar mb-10">
          <div className="stats-grid">
            <div className="stat-pill">
              <span className="pill-label">Total Quizzes</span>
              <span className="pill-value">{statsLoading ? '...' : stats.totalQuizzes}</span>
            </div>
            <div className="stat-pill">
              <span className="pill-label">Active Students</span>
              <span className="pill-value">{statsLoading ? '...' : stats.totalStudents}</span>
            </div>
            <div className="stat-pill">
              <span className="pill-label">Avg Proficiency</span>
              <span className="pill-value">{statsLoading ? '...' : stats.avgScore}%</span>
            </div>
          </div>
        </section>

        {/* Quick Actions - Now comes directly after welcome section */}
        <section className="actions-section">
          <h2 className="section-title">Quick Actions</h2>
          <div className="actions-grid three-column">
            {actions.map((action, index) => (
              <div 
                key={action.id} 
                className="action-card"
                style={{ 
                  animationDelay: `${index * 0.1}s`
                }}
                onClick={() => handleNavigation(action.link)}
              >
                <div className="action-icon" style={{background: action.color}}>
                  <i className={action.icon}></i>
                </div>
                <h3>{action.title}</h3>
                <p>{action.description}</p>
                <button 
                  className="action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNavigation(action.link);
                  }}
                >
                  Get Started <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Quizzes - REAL DATA */}
        <section className="recent-section">
          <div className="quiz-table">
            <div className="quiz-table-header">
              <h3>Recent Quizzes</h3>
              <button 
                className="view-all-btn"
                onClick={() => handleNavigation('/educator/generated')}
              >
                View All <i className="fas fa-arrow-right"></i>
              </button>
            </div>
            
            <div className="quiz-items">
              {quizzesLoading ? (
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '30px' }}>
                  Loading quizzes...
                </div>
              ) : recentQuizzes.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '30px' }}>
                  No quizzes yet. <span style={{ color: '#8a2be2', cursor: 'pointer' }} onClick={() => handleNavigation('/educator/chat')}>Create one now!</span>
                </div>
              ) : (
                recentQuizzes.map((quiz, index) => (
                  <div 
                    key={quiz._id} 
                    className="quiz-item"
                    style={{ animationDelay: `${index * 0.1}s` }}
                    onClick={() => handleViewQuiz(quiz)}
                  >
                    <div className="quiz-info">
                      <div className="quiz-icon">
                        <i className="fas fa-file-alt"></i>
                      </div>
                      <div className="quiz-details">
                        <h4>{quiz.title}</h4>
                        <p>{quiz.questions?.length || 0} questions • Created: {new Date(quiz.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    
                    <div className="quiz-meta">
                      <span className={`status-badge status-${(quiz.status || 'draft').toLowerCase()}`}>
                        {(quiz.status || 'Draft').charAt(0).toUpperCase() + (quiz.status || 'draft').slice(1)}
                      </span>
                      <div className="quiz-actions">
                        <button 
                          className="icon-btn" 
                          title="Host Live"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigation(`/educator/live-quiz/${quiz._id}`);
                          }}
                        >
                          <i className="fas fa-broadcast-tower"></i>
                        </button>
                        <button 
                          className="icon-btn" 
                          title="Share"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShareQuiz(quiz);
                          }}
                        >
                          <i className="fas fa-share"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="dashboard-footer">
          <p>© 2024 MCQ-GPT Educator Portal • Making learning interactive and fun!</p>
          <div className="footer-links">
            <button onClick={() => handleNavigation('/educator/chat')}>Create Quiz</button>
            <button onClick={() => handleNavigation('/educator/generated')}>My Quizzes</button>
            <button onClick={() => handleNavigation('/educator/reports')}>Reports</button>
            <button onClick={() => handleNavigation('/educator/live-quiz')}>Live Sessions</button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default EducatorDashboard;
