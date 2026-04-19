import React, { useContext, useEffect, useState, useRef } from "react";
import { playerSocket } from "../socket";
import { ContextAPI } from "../Context";
import { FaClock, FaTrophy, FaCheckCircle, FaTimesCircle, FaUser, FaSpinner, FaRocket } from "react-icons/fa";
import './Player.css';

const Player = () => {
  // --- Context & State ---
  const { studentData } = useContext(ContextAPI);
  
  // Game Phases: 'LOBBY' | 'WAITING_FOR_QUESTION' | 'QUESTION' | 'FEEDBACK' | 'LEADERBOARD' | 'ENDED'
  const [gameState, setGameState] = useState("LOBBY");
  
  // Data State
  const [players, setPlayers] = useState([]);
  const [leaderBoardData, setLeaderBoardData] = useState([]);
  const [questionDetails, setQuestionDetails] = useState({});
  const [resultData, setResultData] = useState(null); 
  
  // User Input State
  const [playerName, setPlayerName] = useState(studentData?.name || "");
  const [roomCode, setRoomCode] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  
  // Timer & Answer State
  const [timer, setTimer] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  
  // Refs for interval cleanup
  const timerRef = useRef(null);

  const [perQuestionTime,setPerQuestionTime] = useState(null);
  const [quizTime,setQuizTime] = useState(null);
  // --- Socket Logic ---
  useEffect(() => {
    // 1. Update Player List in Lobby
    playerSocket.on("updatePlayers", (players) => {
      setPlayers(players);
    });

    playerSocket.on("quiztime",(time)=>{
      setQuizTime(time);
    })

    // 2. Receive New Question
    playerSocket.on("newQuestion", (details) => {
      setQuestionDetails(details);
      
      setGameState("QUESTION"); // Switch to question view
      setSelectedAnswer(null);  // Reset previous answer
      setResultData(null);      // Reset previous result
      
      // Reset & Start Timer using perQuestionTime
      clearInterval(timerRef.current);
      
      const totalTimeSec = quizTime * 60;

        // Ensure we don't divide by zero
       
        const perQuestionTime =      Math.floor(totalTimeSec / 9); // here later no.of questiona
        setPerQuestionTime(perQuestionTime);
      console.log("per question time ; "+perQuestionTime)
      let t = perQuestionTime; // <--- FIXED HERE
      setTimer(t);
      
      timerRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    });

    // 3. Update Leaderboard Data
    playerSocket.on("leaderboardUpdate", (details) => {
      setLeaderBoardData(details);
      console.log(leaderBoardData);
    });

    // 4. Game Start / End Status
    playerSocket.on("quizStarted", (isPlaying) => {
      if (isPlaying) {
        setGameState("WAITING_FOR_QUESTION"); 
      } else {
        setGameState("ENDED");
        clearInterval(timerRef.current);
      }
    });

    return () => {
      playerSocket.off("updatePlayers");
      playerSocket.off("newQuestion");
      playerSocket.off("leaderboardUpdate");
      playerSocket.off("quizStarted");
      clearInterval(timerRef.current);
    };
  }, [quizTime]);

  // --- Handlers ---

  const joinRoom = (e) => {
    e.preventDefault();
    if (!playerName || !roomCode) return alert("Please enter Name and Room Code");

    playerSocket.emit("joinRoom", { 
      roomCode, 
      playerName, 
      playerEmail: studentData?.email || "",
      studentId: studentData?.id || studentData?._id || null
    }, (response) => {
      if (response.success) {
        setIsJoined(true);
      } else if (response.error) {
        alert(response.error);
      }
    });
  };

  const submitAnswer = (answerOption) => {
    if (selectedAnswer) return; 
    console.log(answerOption);
    setSelectedAnswer(answerOption);
    clearInterval(timerRef.current); // Stop visual timer

    // FIXED: Calculate time used based on perQuestionTime
    const totalTime = perQuestionTime;
    const used = totalTime - timer;

    console.log(questionDetails);
    console.log(selectedAnswer);
    playerSocket.emit("submitAnswer", {
      roomCode,
      answer: answerOption,
      correctAnswer: questionDetails.correctIndex,
      timeTaken: used,
      totalTime,
    }, (res) => {
      setResultData(res);
      
      // 1. Show Feedback immediately
      setGameState("FEEDBACK");

      // 2. Automatically move to Leaderboard after 2.5 seconds
      setTimeout(() => {
        setGameState((prev) => prev === "FEEDBACK" ? "LEADERBOARD" : prev);
      }, 2500);
    });
  };

  // --- Helper to calculate progress bar width ---
  const getProgressWidth = () => {
    if (!perQuestionTime || perQuestionTime === 0) return 0;
    return (timer / perQuestionTime) * 100; // <--- FIXED HERE
  };

  // ================= RENDER =================

  // 1. LOBBY VIEW
  if (gameState === "LOBBY") {
    return (
      <div className="player-container lobby-wrapper">
        <div className="lobby-card">
          <h1>MCQ-GPT</h1>
          
          {!isJoined ? (
            <form onSubmit={joinRoom} className="lobby-form">
              <div className="input-block">
                <label>Nickname</label>
                <input
                  className="lobby-input"
                  placeholder="e.g. John Doe"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="input-block">
                <label>Room Code</label>
                <input
                  className="lobby-input"
                  placeholder="e.g. A1B2C"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                />
              </div>
              <button className="join-btn">
                <FaRocket style={{marginRight: '10px'}} /> Join Game
              </button>
            </form>
          ) : (
            <div className="waiting-msg">
              <div className="feedback-icon" style={{color: 'var(--success)', fontSize: '4rem'}}>
                 <FaCheckCircle />
              </div>
              <h2>You're In!</h2>
              <p>Waiting for host to start the mission...</p>
              
              <div className="players-list-lobby">
                <h3>Players in Lobby ({players.length})</h3>
                <div className="player-tags">
                  {players.map((p, idx) => (
                    <span key={idx} className="player-tag">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. WAITING SCREEN
  if (gameState === "WAITING_FOR_QUESTION") {
    return (
      <div className="player-container" style={{alignItems: 'center', justifyContent: 'center'}}>
        <FaSpinner className="fa-spin" style={{fontSize: '4rem', color: 'var(--primary-glow)', marginBottom: '20px'}} />
        <h2 style={{fontSize: '2rem', fontWeight: '800'}}>Get Ready!</h2>
        <p style={{opacity: 0.7}}>The first question is coming up...</p>
      </div>
    );
  }

  // 3. QUESTION VIEW
  if (gameState === "QUESTION") {
    return (
      <div className="player-container">
        {/* Progress Bar */}
        <div style={{position: 'fixed', top: 0, left: 0, width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', zIndex: 100}}>
          <div 
            style={{
              height: '100%', 
              background: 'var(--grad-premium)', 
              width: `${getProgressWidth()}%`,
              transition: 'width 1s linear',
              boxShadow: '0 0 15px var(--primary-glow)'
            }}
          />
        </div>

        <div className="game-container">
          <div className="game-header">
            <span className="status-pill status-draft" style={{fontSize: '0.9rem'}}>Live Quiz</span>
            <div className="timer-pill">
              <FaClock /> <span>{timer}s</span>
            </div>
          </div>

          <div className="question-card">
            <h2>{questionDetails.question}</h2>
          </div>

          <div className="options-grid">
            {questionDetails.options?.map((opt, index) => (
              <button
                key={index}
                onClick={() => submitAnswer(index)}
                disabled={selectedAnswer !== null}
                className={`option-btn opt-${index % 4}`}
              >
                <span className="opt-letter">
                  {String.fromCharCode(65 + index)}
                </span>
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 4. FEEDBACK VIEW
  if (gameState === "FEEDBACK") {
    const isCorrect = resultData?.correct;
    return (
      <div className={`feedback-overlay ${isCorrect ? 'correct' : 'wrong'}`}>
        <div className="feedback-icon">
          {isCorrect ? <FaCheckCircle /> : <FaTimesCircle />}
        </div>
        <h2 className="feedback-text">
          {isCorrect ? "Correct" : "Wrong"}
        </h2>
        <div style={{marginTop: '30px', padding: '15px 30px', background: 'rgba(0,0,0,0.2)', borderRadius: '15px'}}>
          <p style={{fontSize: '1.5rem', fontWeight: '800'}}>Points +{resultData?.earnedPoints || 0}</p>
        </div>
        <p style={{marginTop: '20px', opacity: 0.8}}>Loading leaderboard...</p>
      </div>
    );
  }

  // 5. LEADERBOARD VIEW
  if (gameState === "LEADERBOARD") {
    const myIndex = leaderBoardData.findIndex(p => p.playerName === playerName);
    const myScore = myIndex !== -1 ? leaderBoardData[myIndex].score : 0;

    return (
      <div className="player-container leaderboard-wrapper">
        <h2 style={{fontSize: '2.5rem', fontWeight: '900', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px'}}>
          <FaTrophy style={{color: '#ffd700'}} /> Leaderboard
        </h2>
        
        <div className="leaderboard-card">
          <div style={{padding: '12px', background: 'rgba(255,255,255,0.05)', textAlign: 'center', fontSize: '0.85rem', opacity: 0.6}}>
            Waiting for host to send next question...
          </div>
          
          <div style={{maxHeight: '60vh', overflowY: 'auto'}}>
            {leaderBoardData.map((p, i) => (
              <div 
                key={i} 
                className={`lb-row ${p.playerName === playerName ? 'me' : ''}`}
              >
                <div className="lb-player">
                  <span className={`lb-rank rank-${i + 1}`}>
                    {i + 1}
                  </span>
                  <span className="lb-name">
                    {p.playerName} {p.playerName === playerName && "(You)"}
                  </span>
                </div>
                <span className="lb-score">{p.score} pts</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{marginTop: '40px', textAlign: 'center'}}>
          <p style={{opacity: 0.6, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '2px'}}>Your Current Score</p>
          <p style={{fontSize: '4rem', fontWeight: '900', color: 'var(--success)'}}>{myScore}</p>
        </div>
      </div>
    );
  }

  // 6. ENDED VIEW
  if (gameState === "ENDED") {
    const sorted = [...leaderBoardData].sort((a, b) => b.score - a.score);
    const winner = sorted[0];

    return (
      <div className="player-container" style={{padding: '40px 20px', alignItems: 'center'}}>
        <h1 style={{fontSize: '3.5rem', fontWeight: '900', marginBottom: '10px', background: 'var(--grad-vibrant)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>Quiz Ended</h1>
        <p style={{opacity: 0.6, fontSize: '1.1rem', marginBottom: '60px'}}>Final Standing & Winners</p>

        <div className="podium-container">
          {/* 2nd Place */}
          {sorted[1] && (
            <div className="podium-pillar pod-2">
              <span className="p-name">{sorted[1].playerName}</span>
              <span className="rank-num">2</span>
            </div>
          )}
          {/* 1st Place */}
          {winner && (
             <div className="podium-pillar pod-1">
              <FaTrophy style={{color: '#ffd700', fontSize: '3rem', position: 'absolute', top: '-70px', animation: 'bounce 2s infinite'}} />
              <span className="p-name" style={{fontSize: '1.25rem', top: '-110px'}}>{winner.playerName}</span>
              <span className="rank-num">1</span>
            </div>
          )}
          {/* 3rd Place */}
          {sorted[2] && (
             <div className="podium-pillar pod-3">
              <span className="p-name">{sorted[2].playerName}</span>
              <span className="rank-num">3</span>
            </div>
          )}
        </div>

        <div style={{width: '100%', maxWidth: '480px', marginTop: '40px'}}>
          <button 
            onClick={() => window.location.reload()} 
            className="join-btn"
            style={{width: '100%'}}
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default Player;
