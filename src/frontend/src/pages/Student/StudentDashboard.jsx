import React, { useState, useEffect, useContext } from 'react';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { ContextAPI } from '../../Context';

const StudentDashboard = () => {
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [typingText, setTypingText] = useState('');
  const [typingIndex, setTypingIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const { studentData, logoutStudent } = useContext(ContextAPI);

  const typingMessages = [
    "Join Live Quiz Instantly ⚡",
    "Track Your Progress 📊",
    "Get AI-Powered Insights 🤖",
    "Improve With Analytics 📈"
  ];

  // Typing effect
  useEffect(() => {
    const handleTyping = () => {
      const currentMessage = typingMessages[typingIndex];
      
      if (!isDeleting && charIndex < currentMessage.length) {
        setTypingText(currentMessage.substring(0, charIndex + 1));
        setCharIndex(charIndex + 1);
      } else if (isDeleting && charIndex > 0) {
        setTypingText(currentMessage.substring(0, charIndex - 1));
        setCharIndex(charIndex - 1);
      } else if (!isDeleting && charIndex === currentMessage.length) {
        setTimeout(() => setIsDeleting(true), 1500);
      } else if (isDeleting && charIndex === 0) {
        setIsDeleting(false);
        setTypingIndex((typingIndex + 1) % typingMessages.length);
      }
    };

    const typingSpeed = isDeleting ? 50 : 100;
    const timer = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(timer);
  }, [typingText, typingIndex, charIndex, isDeleting]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const [availableQuizzes, setAvailableQuizzes] = useState([]);
  const [pastAttempts, setPastAttempts] = useState([]);

  // Fetch real quizzes and attempts
  useEffect(() => {
    const fetchData = async () => {
      const stuInfo = sessionStorage.getItem('stu_info');
      if (!stuInfo) { setIsLoading(false); return; }
      const { token } = JSON.parse(stuInfo);
      
      try {
        // Fetch public quizzes
        const publicRes = await api.get('/quizzes/public');
        setAvailableQuizzes(publicRes.data);

        // Fetch user attempts
        const attemptsRes = await api.get('/quizzes/attempts');
        
        // Transform backend attempts to UI format
        const transformed = attemptsRes.data.map(att => {
           return {
             id: att._id,
             submissionId: att._id,
             title: att.quizID?.title || "Deleted Quiz",
             date: new Date(att.createdAt).toLocaleDateString(),
             score: att.percentage,
             total: 100,
             icon: '📝'
           };
        });
        setPastAttempts(transformed);

      } catch (err) {
        console.error('Error fetching student dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleJoinQuiz = () => {
    if (roomCode.trim()) {
      navigate(`/attend-quiz/${roomCode}`);
    } else {
      alert('Please enter a room code');
    }
  };

  const handleViewReport = (submissionId) => {
    navigate(`/student/report/${submissionId}`);
  };

  const handleJoinLiveQuiz = (quizId) => {
    navigate(`/attend-quiz/${quizId}`);
  };

  const getScoreBadgeClass = (score) => {
    if (score >= 90) return 'score-badge excellent';
    if (score >= 80) return 'score-badge good';
    if (score >= 70) return 'score-badge average';
    return 'score-badge poor';
  };

  const getScoreEmoji = (score) => {
    if (score >= 90) return '🎯';
    if (score >= 80) return '✅';
    if (score >= 70) return '📈';
    return '📊';
  };

  if (isLoading) {
    return (
      <div className="educator-dashboard student-version loading">
        <div className="dashboard-content" style={{textAlign: 'center', padding: '100px'}}>
          <div className="logo-icon" style={{margin: '0 auto 30px', animation: 'pulse-glow 2s infinite'}}>
            🎓
          </div>
          <h1 style={{color: 'white'}}>Loading Student Portal...</h1>
          <p style={{color: 'rgba(255,255,255,0.7)'}}>Preparing your learning experience</p>
        </div>
      </div>
    );
  }

  return (
    <div className="educator-dashboard student-version">
      {/* Header */}
      
      <div className="dashboard-content">
        {/* Welcome Section */}
        <section className="welcome-section flex flex-col items-center">
          <h1 className='text-center'>Welcome back, <span className="highlight ">{studentData?.name || "Student"}</span>! 👋</h1>
          <p className="text-center mt-2 opacity-80">
            Join live quizzes, track your progress, and improve your learning with AI-powered insights
          </p>
        </section>

        {/* Join Live Quiz Section */}
        <section className="section-container join-section-first">
          <div className="join-card action-card">
            <div className="action-icon" style={{ background: 'linear-gradient(135deg, #f72585, #ff006e)' }}>
              <i className="fas fa-broadcast-tower"></i>
            </div>
            <h2>Join Live Quiz Now</h2>
            <p>Enter the room code provided by your teacher to join instantly</p>
            
            <div className="join-input-group flex flex-col items-center">
              <input
                type="text"
                placeholder="Enter room code (e.g., QUIZ-8B2X)"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                maxLength="10"
                onKeyPress={(e) => e.key === 'Enter' && handleJoinQuiz()}
              />
              <button onClick={handleJoinQuiz} className="action-btn join-btn">Join Now</button>
            </div>
            
            <div className="quick-join-hint">
              <span><i className="fas fa-lightbulb"></i> Quick tip: Ask your teacher for the room code!</span>
            </div>
          </div>
        </section>

        {/* Quick Action - View Reports */}
        <section className="section-container quick-actions-single">
          <div className="action-card" onClick={() => navigate('/student/reports')}>
            <div className="action-icon" style={{ background: 'linear-gradient(135deg, #4cc9f0, #4361ee)' }}>
              📊
            </div>
            <h3>View Reports</h3>
            <p>Check your performance analytics and insights</p>
            <button className="action-btn">
              <span>Explore</span>
              <i className="fas fa-arrow-right"></i>
            </button>
          </div>
        </section>

        {/* Available Quizzes */}
        <section className="section-container">
          <div className="quiz-table">
            <div className="quiz-table-header">
              <h3><i className="fas fa-bolt"></i> Available Quizzes</h3>
              <button className="view-all-btn">
                <span>View All</span>
                <i className="fas fa-arrow-right"></i>
              </button>
            </div>
            
            <div className="quiz-items">
              {availableQuizzes.map((quiz, index) => (
                <div 
                  key={quiz.id} 
                  className="quiz-item"
                  style={{ animationDelay: `${0.4 + (0.1 * index)}s` }}
                  onClick={() => handleJoinLiveQuiz(quiz._id)}
                >
                  <div className="quiz-info">
                    <div className="quiz-icon">{quiz.icon}</div>
                    <div className="quiz-details">
                      <h4>{quiz.title}</h4>
                      <p>By {quiz.createdBy?.name || "Teacher"} • {quiz.questions?.length} questions • {quiz.time}</p>
                    </div>
                  </div>
                  
                  <div className="quiz-meta">
                    <span className={`status-badge status-${quiz.status}`}>
                      {quiz.status === 'live' ? '🔴 LIVE NOW' : '🟡 UPCOMING'}
                    </span>
                    <div className="quiz-actions">
                      <button 
                        className="icon-btn" 
                        title="Join Quiz"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJoinLiveQuiz(quiz.id);
                        }}
                      >
                        <i className="fas fa-play"></i>
                      </button>
                      <button 
                        className="icon-btn" 
                        title="View Details"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/attend/${quiz.id}`);
                        }}
                      >
                        <i className="fas fa-info-circle"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Past Attempts */}
        <section className="section-container">
          <div className="quiz-table">
            <div className="quiz-table-header">
              <h3><i className="fas fa-history"></i> Your Recent Attempts</h3>
              <button className="view-all-btn">
                <span>View All Reports</span>
                <i className="fas fa-arrow-right"></i>
              </button>
            </div>
            
            <div className="quiz-items">
              {pastAttempts.map((attempt, index) => {
                const scoreEmoji = getScoreEmoji(attempt.score);
                const badgeClass = getScoreBadgeClass(attempt.score);
                
                return (
                  <div 
                    key={attempt.id} 
                    className="quiz-item"
                    style={{ animationDelay: `${0.7 + (0.1 * index)}s` }}
                    onClick={() => handleViewReport(attempt.id)}
                  >
                    <div className="quiz-info">
                      <div className="quiz-icon">{attempt.icon}</div>
                      <div className="quiz-details">
                        <h4>{attempt.title}</h4>
                        <p>Attempted on {attempt.date} • Score: <span className="score-highlight">{attempt.score}%</span></p>
                      </div>
                    </div>
                    
                    <div className="quiz-meta">
                      <span className="status-badge status-completed">
                        <i className="fas fa-check-circle"></i> COMPLETED
                      </span>
                      
                      <div className={badgeClass}>
                        <span className="score-emoji">{scoreEmoji}</span>
                        <span className="score-value">{attempt.score}%</span>
                      </div>
                      
                      <div className="quiz-actions">
                        <button 
                          className="icon-btn" 
                          title="View Report"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewReport(attempt.id);
                          }}
                        >
                          <i className="fas fa-chart-bar"></i>
                        </button>
                        <button 
                          className="icon-btn" 
                          title="Download PDF"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewReport(attempt.id);
                          }}
                        >
                          <i className="fas fa-download"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="dashboard-footer">
          <p>© 2025 QUIZZCO.AI Student Portal • Learn, Practice, Excel!</p>
          <div className="footer-links">
            <button onClick={() => navigate('/student/reports')}>
              <i className="fas fa-chart-bar"></i> My Reports
            </button>
            <button onClick={() => {
              logoutStudent();
              navigate('/');
            }}>
              <i className="fas fa-sign-out-alt"></i> Logout
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default StudentDashboard; 
