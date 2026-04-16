import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './AttendQuiz.css';
import { playerSocket } from '../../socket';
import { toast } from 'react-toastify';
import api from '../../services/api';

const API_BASE = 'http://localhost:5000/api';

// Parse "20 mins" or "20" → seconds
const parseTimeToSeconds = (timeStr) => {
  if (!timeStr) return 1800;
  const num = parseInt(String(timeStr).replace(/\D/g, ''), 10);
  return isNaN(num) ? 1800 : num * 60;
};

const AttendQuiz = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [players, setPlayers] = useState([]);
  const [play, setPlay] = useState(false);
  useEffect(() => {
    // Connect socket on mount
    playerSocket.connect();

    joinRoom();

    playerSocket.on("getQuizDetails", (details) => {
      try {
        setQuizData(details);
        setQuestions(details?.questions || []);
        // ✅ FIXED: Parse time string properly ("20 mins" → 1200 seconds)
        setTimeLeft(parseTimeToSeconds(details?.time));

        const initialStatus = {};
        (details.questions || []).forEach((question) => {
          initialStatus[question._id] = {
            answered: false,
            skipped: false,
            marked: false,
            selectedOption: null,
            voiceAnswer: null,
          };
        });
        setQuestionStatus(initialStatus);
      } catch (error) {
        console.error('getQuizDetails error:', error);
      }
    });

    playerSocket.on("updatePlayers", (updatedPlayers) => {
      setPlayers(updatedPlayers);
    });

    playerSocket.on("quizStarted", (started) => {
      setPlay(started);
    });

    // Live quiz: educator sends each question one-by-one
    playerSocket.on("newQuestion", ({ question, options, index, totalTime }) => {
      // In live mode, sync with educator's current question
      setCurrentQuestion(index);
      setCurrentQuestionTime(totalTime);
      setTimeLeft(totalTime); // Sync the main countdown timer
      setSelectedOption(null);
      setTranscript('');
      setQuestionStartTime(Date.now());
      toast.info(`Question ${index + 1} started!`);
    });

    playerSocket.on("questionTimeUp", () => {
      toast.warning("Time's up for this question!");
      setCurrentQuestionTime(0);
    });

    playerSocket.on("quizEnded", ({ leaderboard }) => {
      toast.info("Quiz ended by host!");
      setTimeout(() => navigate('/student/dashboard'), 2000);
    });

    return () => {
      playerSocket.off("getQuizDetails");
      playerSocket.off("updatePlayers");
      playerSocket.off("quizStarted");
      playerSocket.off("newQuestion");
      playerSocket.off("questionTimeUp");
      playerSocket.off("quizEnded");
      playerSocket.disconnect();
    };
  }, []);
  //console.log("in"+ play)
  const joinRoom = () => {
    const studentDetail = JSON.parse(sessionStorage.getItem('stu_info'));

    if (!studentDetail) {
      alert("Login first");
      return;
    }
    const playerName = studentDetail.name;
    const playerEmail = studentDetail.email;

    const roomCode = quizId;
    playerSocket.emit("joinRoom", { roomCode, playerName, playerEmail }, (response) => {
      if (response.success) {
        toast.success("Succesfully joined...")
        //setIsJoined(true);
        console.log("joined...")
      } else if (response.error) {

        navigate("/student/dashboard")
        alert(response.error);
      }
    })

  }


  // State variables
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes in seconds
  const [questions, setQuestions] = useState([]);
  const [questionStatus, setQuestionStatus] = useState({});
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [quizData, setQuizData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [currentQuestionTime, setCurrentQuestionTime] = useState(0);

  // ==================== BACKEND INTEGRATION FUNCTIONS ====================

  const fetchQuizFromBackend = async (quizId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/quizzes/getQuiz`, { params: { id: quizId } });
      const data = response.data[0]; // Backend returns array for getQuiz
      if (!data) throw new Error('Quiz not found');
      return data;
    } catch (err) {
      console.error('Error fetching quiz:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const submitAnswersToBackend = async (quizId, answers) => {
    try {
      setSubmitting(true);
      const timeSpent = Math.max(0, parseTimeToSeconds(quizData?.time) - timeLeft);

      const response = await api.post(
        `/quizzes/storeParticipants`,
        {
          quizID: quizData?._id || quizId,
          timeTaken: `${Math.floor(timeSpent / 60)}m ${timeSpent % 60}s`,
          studentResponse: answers,
        }
      );

      return {
        submissionId: response.data.submissionId,
        quizId: quizData?._id || quizId,
        score: response.data.score,
        total: response.data.total,
        submittedAt: new Date().toISOString(),
        timeSpent,
        message: 'Quiz submitted successfully!',
      };
    } catch (err) {
      console.error('Error submitting quiz:', err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const saveAnswerToBackend = async (questionId, answer) => {
    // Auto-save (non-critical, fire and forget)
    console.debug('Auto-saved answer:', { questionId, answer });
  };

  // ==================== INITIALIZATION ====================

  // useEffect(() => {
  //   const loadQuiz = async () => {
  //     try {
  //       const data = await fetchQuizFromBackend(quizId);
  //       setQuizData(data);
  //       setQuestions(data.questions);
  //       setTimeLeft(data.duration * 60); // Convert minutes to seconds

  //       // Initialize question status
  //       const initialStatus = {};
  //       data.questions.forEach((question) => {
  //         initialStatus[question.id] = {
  //           answered: false,
  //           skipped: false,
  //           marked: false,
  //           selectedOption: null,
  //           voiceAnswer: null,
  //           // Load previously saved answers if any
  //           ...(question.savedAnswer && {
  //             answered: true,
  //             selectedOption: question.savedAnswer,
  //           }),
  //         };
  //       });
  //       setQuestionStatus(initialStatus);
  //     } catch (err) {
  //       console.error('Failed to load quiz:', err);
  //     }
  //   };

  //   loadQuiz();
  // }, [quizId]);

  // Timer effect
  useEffect(() => {
    if (timeLeft <= 0 || !quizData) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quizData]); // Omit timeLeft so interval doesn't re-render and drift

  // ==================== UTILITY FUNCTIONS ====================

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getQuestionStatus = (qId) => {
    const status = questionStatus[qId];
    if (!status) return 'not-answered';

    if (status.answered) return 'answered';
    if (status.skipped) return 'skipped';
    if (status.marked) return 'marked';
    return 'not-answered';
  };

  // Dynamic grid calculation based on question count
  const getGridColumns = (count) => {
    if (count <= 30) return 5;
    if (count <= 50) return 6;
    if (count <= 75) return 7;
    return 8;
  };

  // ==================== QUESTION HANDLERS ====================

  const handleOptionSelect = async (optionId) => {
    const questionId = questions[currentQuestion]._id;
    setSelectedOption(optionId);

    const newStatus = {
      ...questionStatus[questionId],
      answered: true,
      skipped: false,
      selectedOption: optionId,
    };

    setQuestionStatus(prev => ({
      ...prev,
      [questionId]: newStatus
    }));

    // If live quiz, emit answer to educator's live leaderboard
    const timeTaken = (Date.now() - questionStartTime) / 1000;
    playerSocket.emit("submitAnswer", {
      roomCode: quizId,
      answer: optionId,
      timeTaken,
      totalTime: currentQuestionTime || 30 // Fallback or use live question time
    }, (res) => {
        if (res.error) console.error("Live submit error:", res.error);
    });

    // Auto-save to backend (for report persistence)
    await saveAnswerToBackend(questionId, optionId);
  };

  const goToQuestion = (index) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestion(index);
      // Load saved state for new question
      const currentQId = questions[index]._id;
      setSelectedOption(questionStatus[currentQId]?.selectedOption || null);
      setTranscript(questionStatus[currentQId]?.voiceAnswer || '');
    }
  };

  const handleSaveNext = async () => {
    const questionId = questions[currentQuestion]._id;

    // If MCQ with no selection, mark as skipped
    if (questions[currentQuestion].type === 'mcq' && !selectedOption) {
      const newStatus = {
        ...questionStatus[questionId],
        skipped: true,
        answered: false,
      };

      setQuestionStatus(prev => ({
        ...prev,
        [questionId]: newStatus
      }));
    }

    // Move to next question or submit if last
    if (currentQuestion < questions.length - 1) {
      goToQuestion(currentQuestion + 1);
    } else {
      await handleSubmitQuiz();
    }
  };

  const handleSkip = async () => {
    const questionId = questions[currentQuestion]._id;

    const newStatus = {
      ...questionStatus[questionId],
      skipped: true,
      answered: false,
      selectedOption: null,
      marked: false, // Reset marked when skipping
    };

    setQuestionStatus(prev => ({
      ...prev,
      [questionId]: newStatus
    }));

    // Auto-save skip to backend
    await saveAnswerToBackend(questionId, null);

    if (currentQuestion < questions.length - 1) {
      goToQuestion(currentQuestion + 1);
    }
  };

  const handleMarkReview = async () => {
    const questionId = questions[currentQuestion]._id;
    const currentStatus = questionStatus[questionId];
    const newMarkedState = !currentStatus.marked;

    const newStatus = {
      ...currentStatus,
      marked: newMarkedState,
    };

    setQuestionStatus(prev => ({
      ...prev,
      [questionId]: newStatus
    }));

    // Save marked status to backend
    await saveAnswerToBackend(questionId, {
      ...currentStatus,
      marked: newMarkedState
    });
  };

  const handleClearResponse = async () => {
    const questionId = questions[currentQuestion]._id;

    setSelectedOption(null);
    setTranscript('');

    const newStatus = {
      ...questionStatus[questionId],
      answered: false,
      skipped: false,
      marked: false, // Reset marked when clearing response
      selectedOption: null,
      voiceAnswer: null,
    };

    setQuestionStatus(prev => ({
      ...prev,
      [questionId]: newStatus
    }));

    // Clear answer in backend
    await saveAnswerToBackend(questionId, null);
  };

  // ==================== VOICE HANDLERS ====================

  const handleStartRecording = () => {
    setIsRecording(true);

    // Web Speech API implementation
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript(finalTranscript + interimTranscript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();

      // Store recognition instance to stop it later
      window.currentRecognition = recognition;
    } else {
      // Fallback for browsers without speech recognition
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    setIsRecording(false);

    // Stop the speech recognition
    if (window.currentRecognition) {
      window.currentRecognition.stop();
      window.currentRecognition = null;
    }

    const questionId = questions[currentQuestion]._id;

    const newStatus = {
      ...questionStatus[questionId],
      answered: true,
      voiceAnswer: transcript,
    };

    setQuestionStatus(prev => ({
      ...prev,
      [questionId]: newStatus
    }));

    // Save voice answer to backend
    await saveAnswerToBackend(questionId, transcript);
  };

  // ==================== SUBMISSION HANDLERS ====================

  const handleAutoSubmit = async () => {
    alert('Time\'s up! Auto-submitting your quiz...');
    await handleSubmitQuiz();
  };

  const handleSubmitQuiz = async () => {
    if (submitting) return;

    // Confirm submission
    const confirmed = window.confirm(
      `Submit quiz now?\n\nAnswered: ${Object.values(questionStatus).filter(q => q.answered).length}\n` +
      `Skipped: ${Object.values(questionStatus).filter(q => q.skipped).length}\n` +
      `Marked for review: ${Object.values(questionStatus).filter(q => q.marked).length}\n\n` +
      `You have ${formatTime(timeLeft)} remaining.`
    );

    if (!confirmed) return;

    try {
      // Prepare answers for backend
      const answers = questions.map((q) => {
        const status = questionStatus[q._id] || {};
        return {
          questionId: q._id,
          answer: status.selectedOption || status.voiceAnswer || null,
          status: status.answered ? 'answered' : 'skipped',
          marked: status.marked || false,
          timestamp: new Date().toISOString(),
        };
      });

      const result = await submitAnswersToBackend(quizId, answers);

      toast.success('Quiz submitted!');
      // Redirect to student report page
      navigate(`/student/report/${result.submissionId}`, {
        state: {
          quizId: quizData?._id,
        }
      });
    } catch (err) {
      alert(`Submission failed: ${err.message || 'Unknown error'}\nPlease try again.`);
    }
  };

  // ==================== MOCK DATA FUNCTIONS ====================



  // ==================== RENDER ====================

  if (loading) {
    return (
      <div className="attend-quiz-loading">
        <div className="loading-spinner"></div>
        <h2>Loading Quiz...</h2>
        <p>Preparing your test environment</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="attend-quiz-error">
        <div className="error-icon">❌</div>
        <h2>Error Loading Quiz</h2>
        <p>{error}</p>
        <button
          className="retry-btn"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
        <button
          className="dashboard-btn"
          onClick={() => navigate('/student/dashboard')}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!quizData || questions.length === 0) {
    return null;
  }

  const currentQ = questions[currentQuestion];
  const answeredCount = Object.values(questionStatus).filter(q => q.answered).length;
  const skippedCount = Object.values(questionStatus).filter(q => q.skipped).length;
  const markedCount = Object.values(questionStatus).filter(q => q.marked).length;
  const gridCols = getGridColumns(questions.length);
  const isMarked = questionStatus[currentQ._id]?.marked || false;

  return (


    <div>

      {!play && (
        <div className="waiting-lobby-container dark-bg p-6 md:p-10 rounded-xl shadow-2xl text-white">

          {/* Header Section */}
          <div className="text-center mb-8 border-b border-gray-700 pb-4">
            <h1 className="text-3xl font-extrabold text-indigo-400 tracking-wider">
              Quiz Session: {quizId}
            </h1>
            <p className="text-xl mt-2 text-gray-400">
              Waiting for Host to Start...
            </p>
          </div>

          {/* Status Message */}
          <div className="text-center mb-8 p-4 bg-gray-800 rounded-lg animate-pulse">
            <i className="fas fa-clock text-yellow-400 text-2xl mr-3"></i>
            <span className="text-lg font-semibold">
              Please wait patiently!
            </span>
          </div>

          {/* Player Count */}
          <div className="text-center mb-6">
            <span className="text-5xl font-bold text-green-400">
              {players.length}
            </span>
            <p className="text-gray-400 text-sm uppercase tracking-widest">
              {players.length === 1 ? 'Student Joined' : 'Students Joined'}
            </p>
          </div>

          {/* Player List Section */}
          <div className="player-list-section max-h-64 overflow-y-auto pr-2">
            <h3 className="text-lg font-semibold mb-3 text-gray-300 border-b border-gray-700 pb-2">
              Participants ({players.length})
            </h3>

            {players.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {players.map((player, index) => (
                  <div
                    key={index}
                    className="player-card bg-gray-700/50 p-2 rounded-lg flex items-center shadow-md hover:bg-gray-600 transition duration-300"
                  >
                    {/* Player Icon/Avatar (e.g., first letter of name) */}
                    <div className="w-8 h-8 flex items-center justify-center bg-indigo-500 rounded-full text-xs font-bold mr-2 flex-shrink-0">
                      {player.playerName.charAt(0).toUpperCase()}
                    </div>
                    {/* Player Name */}
                    <span className="text-sm font-medium truncate" title={player.playerName}>
                      {player.playerName}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 italic mt-4">
                You are the first one! Waiting for others...
              </p>
            )}
          </div>

        </div>
      )}
      {play && (
        <div className="attend-quiz-container">
          {/* Header */}
          <header className="quiz-header">
            <div className="header-left">
              <div className="quiz-logo" onClick={() => navigate('/student/dashboard')}>
                <span className="logo-icon">🎓</span>
                <span className="logo-text">QUIZZCO.AI</span>
              </div>
              <div className="quiz-info">
                <h1 className="quiz-title">{quizData?.title}</h1>
                <div className="quiz-meta">
                  <span>👤 {quizData?.createdBy?.name}</span>
                  <span>📝 {questions.length} Questions</span>
                </div>
              </div>
            </div>

            <div className="header-right">
              <div className="timer-box">
                <span className="timer-icon">⏱️</span>
                <div className="timer-content">
                  <div className="timer-label">Time Remaining</div>
                  <div className="timer-value">{formatTime(timeLeft)}</div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <div className="quiz-body">
            {/* Main Question Area */}
            <main className="question-area">
              {/* Question Header */}
              <div className="question-header-bar">
                <div className="question-number-badge">
                  Question {currentQuestion + 1} of {questions.length}
                </div>
                <div className="question-badges">
                  {currentQ.type === 'voice' ? (
                    <span className="badge badge-voice">🎤 Voice</span>
                  ) : (
                    <span className="badge badge-mcq">📋 MCQ</span>
                  )}
                  <span className="badge badge-marks">{currentQ.marks} Mark</span>
                  {isMarked && (
                    <span className="badge badge-marked">🔖 Marked</span>
                  )}
                </div>
              </div>

              {/* Question Content */}
              <div className="question-content-area">
                <div className="question-text-box">
                  <h2 className="question-text">{currentQ.question}</h2>
                </div>

                {/* MCQ Options */}
                {(currentQ.type === 'mcq' || currentQ.type === 'scq') && currentQ.options?.length > 0 && (
                  <div className="options-container">
                    {currentQ.options.map((optionText, index) => {
                      const optionId = String.fromCharCode(97 + index);
                      const isSelected = selectedOption === optionId;

                      return (
                        <label
                          key={optionId}
                          className={`option-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleOptionSelect(optionId)}
                        >
                          <div className="option-label">{optionId.toUpperCase()}</div>
                          <div className="option-content">{optionText}</div>
                          {isSelected && (
                            <div className="option-checkmark">✓</div>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Voice Interface */}
                {currentQ.type === 'voice' && (
                  <div className="voice-answer-section">
                    <div className="voice-instruction">
                      <span className="info-icon">ℹ️</span>
                      Click the record button and speak your answer clearly.
                    </div>

                    <div className="voice-controls-center">
                      {!isRecording ? (
                        <button
                          className="record-button"
                          onClick={handleStartRecording}
                          disabled={submitting}
                        >
                          <span className="record-icon">🎤</span>
                          Start Recording
                        </button>
                      ) : (
                        <button
                          className="stop-button"
                          onClick={handleStopRecording}
                        >
                          <span className="stop-icon">⏹️</span>
                          Stop Recording
                        </button>
                      )}

                      {isRecording && (
                        <div className="recording-indicator">
                          <span className="pulse-circle"></span>
                          Recording in progress...
                        </div>
                      )}
                    </div>

                    {transcript && (
                      <div className="transcript-display">
                        <h4>Your Answer:</h4>
                        <p>{transcript}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="question-actions">
                <div className="action-left">
                  <button
                    className={`btn ${isMarked ? 'btn-marked' : 'btn-secondary'}`}
                    onClick={handleMarkReview}
                    disabled={submitting}
                  >
                    {isMarked ? '🔖 Unmark' : '🔖 Mark'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={handleClearResponse}
                    disabled={submitting || (currentQ.type === 'mcq' && !selectedOption) || (currentQ.type === 'voice' && !transcript)}
                  >
                    🗑️ Clear
                  </button>
                </div>

                <div className="action-right">
                  <button
                    className="btn btn-outline"
                    onClick={handleSkip}
                    disabled={submitting}
                  >
                    Skip
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleSaveNext}
                    disabled={submitting}
                  >
                    {currentQuestion === questions.length - 1 ? (
                      submitting ? 'Submitting...' : 'Submit'
                    ) : (
                      'Save & Next'
                    )}
                  </button>
                </div>
              </div>
            </main>

            {/* Right Sidebar - Question Palette */}
            <aside className="question-sidebar">
              <div className="sidebar-header">
                <h3>Question Palette</h3>
                <div className="palette-stats">
                  <span className="stat-answered" title="Answered">{answeredCount}</span>
                  <span className="stat-skipped" title="Skipped">{skippedCount}</span>
                  <span className="stat-marked" title="Marked">{markedCount}</span>
                </div>
              </div>

              <div className="question-palette-wrapper">
                <div
                  className="question-palette"
                  style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
                >
                  {questions.map((question, index) => {
                    // ✅ FIXED: use _id (MongoDB), not question.id (doesn't exist)
                    const status = getQuestionStatus(question._id);
                    const isCurrent = index === currentQuestion;
                    const isQuestionMarked = questionStatus[question._id]?.marked || false;

                    return (
                      <button
                        key={question._id}
                        className={`palette-btn ${status} ${isCurrent ? 'active' : ''} ${isQuestionMarked ? 'marked-badge' : ''}`}
                        onClick={() => !submitting && goToQuestion(index)}
                        disabled={submitting}
                        title={`Question ${index + 1} - ${status === 'answered' ? 'Answered' : status === 'skipped' ? 'Skipped' : status === 'marked' ? 'Marked' : 'Not Answered'}`}
                      >
                        {index + 1}
                        {isQuestionMarked && <span className="mark-indicator">🔖</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="palette-legend">
                <div className="legend-item">
                  <span className="legend-dot answered"></span>
                  <span>Answered</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot not-answered"></span>
                  <span>Not Answered</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot marked"></span>
                  <span>Marked</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot skipped"></span>
                  <span>Skipped</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot current">📍</span>
                  <span>Current</span>
                </div>
              </div>

              <button
                className="submit-quiz-btn"
                onClick={handleSubmitQuiz}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Quiz'}
              </button>
            </aside>
          </div>
        </div>
      )}

    </div>
  );
};

export default AttendQuiz;
