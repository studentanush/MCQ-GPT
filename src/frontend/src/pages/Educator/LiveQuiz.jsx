import React, { useState, useEffect, useRef, useCallback } from 'react';
import './LiveQuiz.css';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { adminSocket } from '../../socket';



const LiveQuiz = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Core state
  const [quiz, setQuiz] = useState({});
  const [players, setPlayers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isQuizStarted, setIsQuizStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [timeLeft, setTimeLeft] = useState(0);
  const [perQuestionTime, setPerQuestionTime] = useState(30);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showMaxLimitPopup, setShowMaxLimitPopup] = useState(false);
  const [questionStats, setQuestionStats] = useState({ answeredCount: 0, totalPlayers: 0 });
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [toast, setToast] = useState(null);

  const timerRef = useRef(null);

  // ─── Toast helper ────────────────────────────────────────────────────────────
  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ─── Parse quiz time string → per-question seconds ────────────────────────
  const calcPerQuestionTime = useCallback((timeStr, numQuestions) => {
    const minutes = parseInt(String(timeStr).replace(/\D/g, ''), 10);
    if (isNaN(minutes) || minutes <= 0 || !numQuestions) return 30;
    return Math.max(10, Math.floor((minutes * 60) / numQuestions));
  }, []);

  // ─── Timer management ─────────────────────────────────────────────────────
  const startQuestionTimer = useCallback((seconds) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(seconds);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ─── Socket setup ────────────────────────────────────────────────────────
  const setupRoom = useCallback((quizData) => {
    const hostName = quizData[0]?.createdBy?.name || 'Educator';
    const quizD = quizData[0];

    adminSocket.emit('createRoom', { hostName, quizD }, (response) => {
      if (response?.roomCode) {
        const finalQuiz = { roomCode: response.roomCode, detail: quizD };
        setQuiz(finalQuiz);
        sessionStorage.setItem('room', JSON.stringify(finalQuiz));

        // Calculate per-question time
        const pqt = calcPerQuestionTime(quizD.time, quizD.questions?.length);
        setPerQuestionTime(pqt);
        showToast(`Room ${response.roomCode} created!`, 'success');
      } else {
        showToast('Error creating room!', 'error');
      }
    });
  }, [calcPerQuestionTime, showToast]);

  const fetchQuiz = useCallback(async () => {
    try {
      const storedRoom = sessionStorage.getItem('room');
      if (storedRoom) {
        const parsed = JSON.parse(storedRoom);
        if (parsed.detail?._id === id) {
          setQuiz(parsed);
          const pqt = calcPerQuestionTime(parsed.detail?.time, parsed.detail?.questions?.length);
          setPerQuestionTime(pqt);
          
          adminSocket.emit('joinAdminRoom', { roomCode: parsed.roomCode }, (res) => {
            if (res?.error) {
              // Backend memory was likely wiped (socket server restarted). Re-create room.
              sessionStorage.removeItem('room');
              api.get(`/quizzes/getQuiz`, { params: { id } })
                   .then(response => setupRoom(response.data))
                   .catch(e => console.error(e));
            }
          });
          return;
        }
        sessionStorage.removeItem('room');
      }

      const response = await api.get(`/quizzes/getQuiz`, { params: { id } });
      const quizData = response.data;
      if (quizData?.length > 0) {
        setupRoom(quizData);
      }
    } catch (error) {
      console.error('fetchQuiz error:', error);
      showToast('Error loading quiz data', 'error');
    }
  }, [id, calcPerQuestionTime, setupRoom, showToast]);

  useEffect(() => {
    // Connect socket
    adminSocket.connect();
    setConnectionStatus('connecting');

    adminSocket.on('connect', () => {
      setConnectionStatus('connected');
      fetchQuiz();
    });

    adminSocket.on('connect_error', () => {
      setConnectionStatus('error');
      showToast('Connection error. Is the backend running?', 'error');
    });

    adminSocket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    adminSocket.on('updatePlayers', (updatedPlayers) => {
      setPlayers(updatedPlayers);
      setQuestionStats(prev => ({ ...prev, totalPlayers: updatedPlayers.length }));
    });

    adminSocket.on('leaderboardUpdate', (lb) => {
      setLeaderboard(lb);
    });

    adminSocket.on('questionStats', (stats) => {
      setQuestionStats(stats);
    });

    adminSocket.on('questionTimeUp', ({ questionIndex }) => {
      stopTimer();
      showToast(`Time up for Question ${questionIndex + 1}`, 'warning');
    });

    return () => {
      stopTimer();
      adminSocket.off('connect');
      adminSocket.off('connect_error');
      adminSocket.off('disconnect');
      adminSocket.off('updatePlayers');
      adminSocket.off('leaderboardUpdate');
      adminSocket.off('questionStats');
      adminSocket.off('questionTimeUp');
      adminSocket.disconnect();
    };
  }, []);  // eslint-disable-line

  // ─── Quiz controls ───────────────────────────────────────────────────────
  const handleStartQuiz = () => {
    if (players.length < 1) {
      showToast('Need at least 1 participant to start!', 'warning');
      return;
    }

    const roomCode = quiz.roomCode;
    adminSocket.emit('playOnOff', { roomCode, play: true }, (response) => {
      if (response?.status === 'ok') {
        setIsQuizStarted(true);
        setCurrentQuestion(1);
        setQuestionStats({ answeredCount: 0, totalPlayers: players.length });
        // Send first question
        adminSocket.emit('sendQuestion', { roomCode, questionIndex: 0 }, () => {
          startQuestionTimer(perQuestionTime);
        });
        showToast('Quiz started!', 'success');
      }
    });
  };

  const handleEndQuiz = () => {
    if (!window.confirm('Are you sure you want to end the quiz?')) return;
    const roomCode = quiz.roomCode;
    adminSocket.emit('endQuiz', { roomCode }, (response) => {
      stopTimer();
      setIsQuizStarted(false);
      sessionStorage.removeItem('room');
      showToast('Quiz ended!', 'info');
      setTimeout(() => navigate('/educator/reports'), 1500);
    });
  };

  const handleNextQuestion = () => {
    const totalQuestions = quiz.detail?.questions?.length || 0;
    if (currentQuestion < totalQuestions) {
      const nextIndex = currentQuestion; // currentQuestion is 1-based; next index = currentQuestion
      setCurrentQuestion(prev => prev + 1);
      setQuestionStats({ answeredCount: 0, totalPlayers: players.length });
      adminSocket.emit('sendQuestion', { roomCode: quiz.roomCode, questionIndex: nextIndex }, () => {
        startQuestionTimer(perQuestionTime);
      });
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestion > 1) {
      const prevIndex = currentQuestion - 2;
      setCurrentQuestion(prev => prev - 1);
      setQuestionStats({ answeredCount: 0, totalPlayers: players.length });
      adminSocket.emit('sendQuestion', { roomCode: quiz.roomCode, questionIndex: prevIndex }, () => {
        startQuestionTimer(perQuestionTime);
      });
    }
  };

  const handleJumpToQuestion = (idx) => {
    setCurrentQuestion(idx + 1);
    setQuestionStats({ answeredCount: 0, totalPlayers: players.length });
    adminSocket.emit('sendQuestion', { roomCode: quiz.roomCode, questionIndex: idx }, () => {
      startQuestionTimer(perQuestionTime);
    });
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(quiz.roomCode);
    showToast(`Room code ${quiz.roomCode} copied!`, 'success');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const timerPercent = perQuestionTime > 0 ? (timeLeft / perQuestionTime) * 100 : 0;
  const timerColor = timerPercent > 50 ? '#00ff88' : timerPercent > 20 ? '#ffd166' : '#ff6b6b';

  const currentQuestionData = quiz.detail?.questions?.[currentQuestion - 1];

  return (
    <div className="live-quiz">
      {/* Toast notification */}
      {toast && (
        <div className={`live-toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* Connection status */}
      {connectionStatus !== 'connected' && (
        <div className={`connection-banner ${connectionStatus}`}>
          {connectionStatus === 'connecting' && '🔄 Connecting to server...'}
          {connectionStatus === 'disconnected' && '⚠️ Disconnected. Trying to reconnect...'}
          {connectionStatus === 'error' && '❌ Cannot connect to backend server. Make sure it\'s running on port 5000.'}
        </div>
      )}

      {/* Header */}
      <div className="live-header">
        <div className="header-info">
          <h1>Live Quiz Session</h1>
          <p>Hosting: <span className="quiz-title">{quiz.detail?.title || 'Loading...'}</span></p>
        </div>

        <div className="room-code-section">
          <div className="room-code-box">
            <div className="code-label">ROOM CODE</div>
            <div className="code-display">
              <span className="code">{quiz.roomCode || '------'}</span>
              <button className="copy-btn" onClick={copyRoomCode} disabled={!quiz.roomCode}>
                <i className="fas fa-copy"></i>
              </button>
            </div>
            <p className="code-hint">Share this code with students to join</p>
          </div>

          <div className="participants-count">
            <div className="count-box">
              <i className="fas fa-users"></i>
              <div className="count-info">
                <span className="current">{players.length}</span>
                <span className="total">/50</span>
              </div>
            </div>
            <p className="count-label">Students in Lobby</p>
          </div>
        </div>
      </div>

      <div className="live-content">
        {/* Left Column - Student List / Leaderboard */}
        <div className="students-section">
          <div className="section-header">
            <h2>
              <i className="fas fa-user-friends"></i>
              {isQuizStarted ? 'Leaderboard' : 'Students in Lobby'}
            </h2>
            <div className="header-badge">
              {players.length} connected
            </div>
          </div>

          {isQuizStarted ? (
            // Leaderboard view during quiz
            <div className="students-list">
              {leaderboard.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '20px' }}>
                  Scores will appear when students answer
                </p>
              ) : (
                leaderboard.map((entry, idx) => (
                  <div key={idx} className="student-card">
                    <div className="student-avatar" style={{ background: idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : '#6d28d9' }}>
                      {idx + 1}
                    </div>
                    <div className="student-info">
                      <h4>{entry.playerName}</h4>
                      <div className="student-meta">
                        <span className="score">
                          <i className="fas fa-star"></i> {entry.score} pts
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            // Waiting lobby view
            <div className="students-list">
              {players.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '20px' }}>
                  Waiting for students to join...
                </p>
              ) : (
                players.map((student) => (
                  <div
                    key={student.id}
                    className={`student-card ${selectedStudent?.id === student.id ? 'selected' : ''}`}
                    onClick={() => setSelectedStudent(student)}
                  >
                    <div className="student-avatar" style={{ background: '#6d28d9' }}>
                      {student.playerName?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="student-info">
                      <h4>{student.playerName}</h4>
                      <p>{student.playerEmail}</p>
                      <div className="student-meta">
                        <span className="score">
                          <i className="fas fa-star"></i> {student.score} pts
                        </span>
                        <span className="status" style={{ color: '#00ff88' }}>
                          <div className="status-dot" style={{ background: '#00ff88' }}></div>
                          Active
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {players.length >= 40 && (
            <div className="limit-warning">
              <i className="fas fa-exclamation-triangle"></i>
              <p>Lobby is {Math.round((players.length / 50) * 100)}% full</p>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="quiz-controls-section">
          {isQuizStarted ? (
            <>
              <div className="quiz-progress">
                <div className="progress-header">
                  <h2>Quiz in Progress</h2>
                  <div className="timer" style={{ color: timerColor }}>
                    <i className="fas fa-clock"></i>
                    {formatTime(timeLeft)}
                  </div>
                </div>

                {/* Timer bar */}
                <div style={{ margin: '8px 0 16px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${timerPercent}%`, height: '100%', background: timerColor, transition: 'width 1s linear, background 0.5s ease', borderRadius: '3px' }} />
                </div>

                {/* Current Question Display */}
                <div className="current-question-view">
                  <div className="question-header">
                    <span className="question-number">
                      Question {currentQuestion} of {quiz.detail?.questions?.length || 0}
                    </span>
                    <span className="question-type">{currentQuestionData?.type || 'MCQ'}</span>
                  </div>

                  <div className="question-content">
                    <p>{currentQuestionData?.question || 'Loading question...'}</p>

                    <div className="options-grid">
                      {currentQuestionData?.options?.map((optionText, index) => {
                        const isCorrect = index === (currentQuestionData.correctAnswerOption?.charCodeAt(0) - 65);
                        return (
                          <div key={index} className={`option-card ${isCorrect ? 'correct-option' : ''}`}>
                            <div className="option-label">
                              {String.fromCharCode(65 + index)}
                            </div>
                            <div className="option-text">{optionText}</div>
                            {isCorrect && <div className="option-check">✓</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="question-nav">
                    <button
                      className="nav-btn prev"
                      onClick={handlePrevQuestion}
                      disabled={currentQuestion === 1}
                    >
                      <i className="fas fa-arrow-left"></i>
                      Previous
                    </button>

                    <div className="question-tracker">
                      {quiz.detail?.questions?.map((_, idx) => (
                        <div
                          key={idx}
                          className={`tracker-dot ${idx + 1 === currentQuestion ? 'active' : idx + 1 < currentQuestion ? 'answered' : ''}`}
                          onClick={() => handleJumpToQuestion(idx)}
                          title={`Question ${idx + 1}`}
                        >
                          {idx + 1}
                        </div>
                      ))}
                    </div>

                    <button
                      className="nav-btn next"
                      onClick={handleNextQuestion}
                      disabled={currentQuestion === (quiz.detail?.questions?.length || 0)}
                    >
                      Next
                      <i className="fas fa-arrow-right"></i>
                    </button>
                  </div>
                </div>

                {/* Live Stats - REAL DATA */}
                <div className="live-stats">
                  <div className="stat-card">
                    <i className="fas fa-check-circle"></i>
                    <div className="stat-info">
                      <span className="value">{questionStats.answeredCount}</span>
                      <span className="label">Answered</span>
                    </div>
                  </div>
                  <div className="stat-card">
                    <i className="fas fa-clock"></i>
                    <div className="stat-info">
                      <span className="value">{Math.max(0, players.length - questionStats.answeredCount)}</span>
                      <span className="label">Still Working</span>
                    </div>
                  </div>
                  <div className="stat-card">
                    <i className="fas fa-users"></i>
                    <div className="stat-info">
                      <span className="value">{players.length}</span>
                      <span className="label">Online</span>
                    </div>
                  </div>
                  <div className="stat-card">
                    <i className="fas fa-chart-line"></i>
                    <div className="stat-info">
                      <span className="value">
                        {leaderboard.length > 0
                          ? Math.round(leaderboard.reduce((s, e) => s + e.score, 0) / leaderboard.length)
                          : 0}
                      </span>
                      <span className="label">Avg Score</span>
                    </div>
                  </div>
                </div>

                {/* End button during quiz */}
                <div style={{ marginTop: '20px', textAlign: 'right' }}>
                  <button className="btn danger" onClick={handleEndQuiz}>
                    <i className="fas fa-stop-circle"></i>
                    End Quiz Session
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="quiz-preview">
                <h2>Quiz Preview</h2>
                <div className="preview-card">
                  <div className="preview-header">
                    <h3>{quiz.detail?.title || 'Loading...'}</h3>
                    <div className="preview-badges">
                      <span className="badge">
                        <i className="fas fa-question-circle"></i>
                        {quiz.detail?.questions?.length || 0} Questions
                      </span>
                      <span className="badge">
                        <i className="fas fa-clock"></i>
                        {quiz.detail?.time || '—'} mins
                      </span>
                      <span className="badge">
                        <i className="fas fa-stopwatch"></i>
                        {perQuestionTime}s / question
                      </span>
                    </div>
                  </div>

                  <div className="preview-stats">
                    <div className="stat">
                      <div className="stat-value">{players.length}</div>
                      <div className="stat-label">Students Ready</div>
                    </div>
                    <div className="stat">
                      <div className="stat-value">50</div>
                      <div className="stat-label">Max Capacity</div>
                    </div>
                    <div className="stat">
                      <div className="stat-value" style={{ color: quiz.roomCode ? '#00ff88' : '#ffd166' }}>
                        {quiz.roomCode ? 'Ready' : 'Setting Up'}
                      </div>
                      <div className="stat-label">Status</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="quiz-controls">
                <div className="action-buttons">
                  <button
                    className="btn secondary"
                    onClick={() => setShowMaxLimitPopup(true)}
                  >
                    <i className="fas fa-cog"></i>
                    Settings
                  </button>
                  <button
                    className="btn primary"
                    onClick={handleStartQuiz}
                    disabled={!quiz.roomCode || connectionStatus !== 'connected'}
                  >
                    <i className="fas fa-play-circle"></i>
                    Start Quiz Session
                  </button>
                  <button
                    className="btn danger"
                    onClick={handleEndQuiz}
                    disabled={!quiz.roomCode}
                  >
                    <i className="fas fa-stop-circle"></i>
                    End Session
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Settings Popup */}
      {showMaxLimitPopup && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Quiz Settings</h3>
              <button className="close-btn" onClick={() => setShowMaxLimitPopup(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>
                  Time per question (seconds)
                </label>
                <input
                  type="number"
                  min="10"
                  max="300"
                  value={perQuestionTime}
                  onChange={(e) => setPerQuestionTime(Math.max(10, parseInt(e.target.value) || 30))}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    color: 'white',
                    padding: '8px 12px',
                    width: '100%',
                    fontSize: '16px',
                  }}
                />
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '4px' }}>
                  Default calculated from quiz total time: {calcPerQuestionTime(quiz.detail?.time, quiz.detail?.questions?.length)}s
                </p>
              </div>
              <div className="modal-actions">
                <button className="btn outline" onClick={() => setShowMaxLimitPopup(false)}>
                  Close
                </button>
                <button className="btn primary" onClick={() => {
                  showToast(`Timer set to ${perQuestionTime}s per question`, 'success');
                  setShowMaxLimitPopup(false);
                }}>
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveQuiz;
