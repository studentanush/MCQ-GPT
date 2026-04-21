import React, { useState, useEffect, useRef, useCallback } from 'react';
import './LiveQuiz.css';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { adminSocket } from '../../socket';
import { FaUsers, FaPlay, FaStop, FaCopy, FaClock, FaCheckCircle, FaChartLine, FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { toast } from 'react-toastify';

const LiveQuiz = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [quiz, setQuiz] = useState({ detail: {} });
    const [players, setPlayers] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [isQuizStarted, setIsQuizStarted] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState(1);
    const [timeLeft, setTimeLeft] = useState(0);
    const [questionStats, setQuestionStats] = useState({ answeredCount: 0 });

    useEffect(() => {
        adminSocket.connect();
        adminSocket.on('connect', () => {
            api.get(`/quizzes/getQuiz`, { params: { id } }).then(res => {
                const quizData = res.data[0];
                adminSocket.emit('createRoom', { hostName: 'Educator', quizD: quizData }, (resp) => {
                    if (resp.roomCode) setQuiz({ roomCode: resp.roomCode, detail: quizData });
                });
            });
        });

        adminSocket.on('updatePlayers', setPlayers);
        adminSocket.on('leaderboardUpdate', setLeaderboard);
        adminSocket.on('questionStats', setQuestionStats);

        return () => {
            adminSocket.disconnect();
        };
    }, [id]);

    const handleStartQuiz = () => {
        if (players.length === 0) return toast.warning("Waiting for players...");
        adminSocket.emit('playOnOff', { roomCode: quiz.roomCode, play: true }, () => {
            setIsQuizStarted(true);
            adminSocket.emit('sendQuestion', { roomCode: quiz.roomCode, questionIndex: 0 });
            setTimeLeft(30);
        });
    };

    const handleNextQuestion = () => {
        if (currentQuestion < quiz.detail.questions.length) {
            adminSocket.emit('sendQuestion', { roomCode: quiz.roomCode, questionIndex: currentQuestion });
            setCurrentQuestion(c => c + 1);
            setTimeLeft(30);
        }
    };

    const copyCode = () => {
        navigator.clipboard.writeText(quiz.roomCode);
        toast.success("Code copied!");
    };

    return (
        <div className="live-quiz">
            <header className="live-header">
                <div className="header-info">
                    <h1>Live Control Center</h1>
                    <p style={{opacity: 0.5}}>Session: {quiz.detail?.title}</p>
                </div>
                <div className="room-code-box">
                    <div className="code-display">
                        <span className="code">{quiz.roomCode || '---'}</span>
                        <button className="copy-btn" onClick={copyCode}><FaCopy /></button>
                    </div>
                </div>
                <button className="user-profile" onClick={() => navigate('/educator/dashboard')}><FaArrowLeft /> Exit</button>
            </header>

            <div className="live-content">
                <div className="students-section">
                    <div className="section-header">
                        <h2>{isQuizStarted ? <FaChartLine /> : <FaUsers />} {isQuizStarted ? 'Leaderboard' : 'Lobby'}</h2>
                        <span className="status-badge" style={{background: 'rgba(0,255,136,0.1)', color: '#00ff88'}}>{players.length} Online</span>
                    </div>
                    <div className="students-list">
                        {(isQuizStarted ? leaderboard : players).map((p, i) => (
                            <div key={i} className="student-card">
                                <div className="student-avatar" style={{background: i < 3 && isQuizStarted ? 'var(--grad-premium)' : 'rgba(255,255,255,0.05)'}}>{i + 1}</div>
                                <div className="student-info">
                                    <h4>{p.playerName}</h4>
                                    {isQuizStarted && <p>{p.score} Points</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="quiz-controls-section">
                    {isQuizStarted ? (
                        <div className="current-question-view">
                            <div className="question-header">
                                <span style={{fontWeight: 700, fontSize: '1.1rem'}}>QUESTION {currentQuestion} / {quiz.detail.questions?.length}</span>
                                <div style={{display: 'flex', alignItems: 'center', gap: '10px', color: '#ffd166'}}><FaClock /> {timeLeft}s</div>
                            </div>
                            <div className="question-content">
                                <p>{quiz.detail.questions?.[currentQuestion - 1]?.question}</p>
                                <div className="options-grid">
                                    {quiz.detail.questions?.[currentQuestion - 1]?.options.map((opt, i) => (
                                        <div key={i} className={`option-card ${opt.startsWith(quiz.detail.questions[currentQuestion-1].correctAnswerOption) ? 'correct-option' : ''}`}>
                                            <div className="option-label">{String.fromCharCode(65 + i)}</div>
                                            <div className="option-text">{opt}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="live-stats">
                                <div className="stat-card"><FaCheckCircle /> <div><div className="pill-label">Answers</div><div className="pill-value">{questionStats.answeredCount}</div></div></div>
                                <div className="stat-card"><FaUsers /> <div><div className="pill-label">Active</div><div className="pill-value">{players.length}</div></div></div>
                            </div>
                            <div style={{marginTop: '40px', display: 'flex', justifyContent: 'space-between'}}>
                                <button className="btn danger" onClick={() => navigate('/educator/reports')}><FaStop /> End Session</button>
                                <button className="btn primary" onClick={handleNextQuestion} disabled={currentQuestion === quiz.detail.questions?.length}>Next Question <FaArrowRight /></button>
                            </div>
                        </div>
                    ) : (
                        <div className="current-question-view" style={{textAlign: 'center', padding: '100px 40px'}}>
                            <div style={{fontSize: '4rem', marginBottom: '20px'}}>🎭</div>
                            <h2 style={{fontSize: '2rem', fontWeight: 800}}>Ready to Start?</h2>
                            <p style={{opacity: 0.5, marginBottom: '40px'}}>The room is open and students are joining. Once everyone is in, click the button below.</p>
                            <button className="btn primary" style={{margin: '0 auto', padding: '20px 60px', fontSize: '1.2rem'}} onClick={handleStartQuiz}><FaPlay /> Start Session</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LiveQuiz;
