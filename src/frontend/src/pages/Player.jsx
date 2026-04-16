import React, { useContext, useEffect, useState, useRef } from "react";
import { playerSocket } from "../socket";
import { ContextAPI } from "../Context";
import { FaClock, FaTrophy, FaCheckCircle, FaTimesCircle, FaUser, FaSpinner } from "react-icons/fa";

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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-2xl">
          <h1 className="text-3xl font-extrabold text-center text-blue-600 mb-6">Quizzco.AI</h1>
          
          {!isJoined ? (
            <form onSubmit={joinRoom} className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-600">Nickname</label>
                <input
                  className="w-full border-2 border-gray-200 p-3 rounded-lg focus:outline-none focus:border-blue-500 transition"
                  placeholder="e.g. John Doe"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">Room Code</label>
                <input
                  className="w-full border-2 border-gray-200 p-3 rounded-lg focus:outline-none focus:border-blue-500 transition"
                  placeholder="e.g. A1B2C"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                />
              </div>
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition shadow-lg mt-2">
                Join Game
              </button>
            </form>
          ) : (
            <div className="text-center">
              <div className="inline-block p-4 bg-green-100 rounded-full mb-4">
                 <FaUser className="text-3xl text-green-600" />
              </div>
              <h2 className="font-bold text-2xl text-gray-800 mb-2">You're In!</h2>
              <p className="text-gray-500 mb-6">Waiting for host to start...</p>
              
              <div className="bg-gray-50 p-4 rounded-xl text-left max-h-40 overflow-y-auto">
                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Players in Lobby ({players.length})</p>
                <div className="flex flex-wrap gap-2">
                  {players.map((p, idx) => (
                    <span key={idx} className="bg-white border border-gray-200 px-3 py-1 rounded-full text-sm font-medium text-gray-700">
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
      <div className="min-h-screen bg-blue-600 flex flex-col items-center justify-center text-white">
        <FaSpinner className="animate-spin text-5xl mb-4" />
        <h2 className="text-3xl font-bold">Get Ready!</h2>
        <p className="text-blue-200 mt-2">The first question is coming up...</p>
      </div>
    );
  }

  // 3. QUESTION VIEW
  if (gameState === "QUESTION") {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 relative">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gray-300">
          <div 
            className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
            style={{ width: `${getProgressWidth()}%` }}
          />
        </div>

        <div className="w-full max-w-2xl">
          {/* Question Card */}
          <div className="bg-white p-8 rounded-2xl shadow-xl mb-6 text-center">
            <div className="flex justify-between items-center mb-4 text-gray-500 font-semibold">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs uppercase tracking-wider">
                Question
              </span>
              <div className="flex items-center gap-2 text-red-500">
                <FaClock /> {timer}s
              </div>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 leading-tight">
              {questionDetails.question}
            </h2>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {questionDetails.options?.map((opt, index) => {
               const colors = ["bg-red-500", "bg-blue-500", "bg-yellow-500", "bg-green-500"];
               return (
                <button
                  key={index}
                  onClick={() => submitAnswer(index)}
                  disabled={selectedAnswer !== null}
                  className={`${colors[index % 4]} text-white p-6 rounded-xl shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-left font-bold text-lg md:text-xl h-24 flex items-center`}
                >
                  <span className="bg-black/20 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">
                    {String.fromCharCode(65 + index)}
                  </span>
                  {opt}
                </button>
               )
            })}
          </div>
        </div>
      </div>
    );
  }

  // 4. FEEDBACK VIEW
  if (gameState === "FEEDBACK") {
    const isCorrect = resultData?.correct;
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center text-white ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
        <div className="text-center animate-bounce">
          {isCorrect ? <FaCheckCircle className="text-8xl mx-auto mb-4" /> : <FaTimesCircle className="text-8xl mx-auto mb-4" />}
          <h2 className="text-5xl font-black uppercase tracking-wider">
            {isCorrect ? "Correct" : "Wrong"}
          </h2>
        </div>
        <div className="mt-8 bg-black/20 px-6 py-3 rounded-lg">
          <p className="font-bold text-xl">Points +{resultData?.earnedPoints || 0}</p>
        </div>
        <p className="mt-4 text-white/80 text-sm">Loading leaderboard...</p>
      </div>
    );
  }

  // 5. LEADERBOARD VIEW
  if (gameState === "LEADERBOARD") {
    const myIndex = leaderBoardData.findIndex(p => p.playerName === playerName);
    const myScore = myIndex !== -1 ? leaderBoardData[myIndex].score : 0;

    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center p-4">
        <h2 className="text-white text-3xl font-bold mt-8 mb-6 flex items-center gap-2">
          <FaTrophy className="text-yellow-400" /> Leaderboard
        </h2>
        
        <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="bg-gray-100 p-3 text-center text-sm text-gray-500">
            Waiting for host to send next question...
          </div>
          
          <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
            {leaderBoardData.map((p, i) => (
              <div 
                key={i} 
                className={`flex items-center justify-between p-4 ${p.playerName === playerName ? 'bg-blue-50' : 'bg-white'}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm 
                    ${i === 0 ? 'bg-yellow-400 text-white' : 
                      i === 1 ? 'bg-gray-400 text-white' : 
                      i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {i + 1}
                  </span>
                  <span className={`font-semibold ${p.playerName === playerName ? 'text-blue-600' : 'text-gray-800'}`}>
                    {p.playerName} {p.playerName === playerName && "(You)"}
                  </span>
                </div>
                <span className="font-bold text-gray-700">{p.score} pts</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 text-white text-center">
          <p className="opacity-70">Your current score</p>
          <p className="text-4xl font-bold">{myScore}</p>
        </div>
      </div>
    );
  }

  // 6. ENDED VIEW
  if (gameState === "ENDED") {
    const sorted = [...leaderBoardData].sort((a, b) => b.score - a.score);
    const winner = sorted[0];

    return (
      <div className="min-h-screen bg-purple-900 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 text-center">
          <h1 className="text-4xl font-black text-purple-700 mb-2">Quiz Ended</h1>
          <p className="text-gray-500 mb-8">Thanks for playing!</p>

          <div className="flex justify-center items-end gap-4 h-48 mb-6">
            {/* 2nd Place */}
            {sorted[1] && (
              <div className="flex flex-col items-center">
                <span className="font-bold text-gray-600 mb-1">{sorted[1].playerName}</span>
                <div className="w-16 h-24 bg-gray-400 rounded-t-lg shadow-lg flex items-end justify-center pb-2 text-white font-bold">2</div>
              </div>
            )}
            {/* 1st Place */}
            {winner && (
               <div className="flex flex-col items-center">
                <FaTrophy className="text-yellow-400 text-4xl mb-2 animate-bounce" />
                <span className="font-bold text-gray-800 text-lg mb-1">{winner.playerName}</span>
                <div className="w-20 h-32 bg-yellow-400 rounded-t-lg shadow-xl flex items-end justify-center pb-2 text-white font-bold text-2xl">1</div>
              </div>
            )}
            {/* 3rd Place */}
            {sorted[2] && (
               <div className="flex flex-col items-center">
                <span className="font-bold text-gray-600 mb-1">{sorted[2].playerName}</span>
                <div className="w-16 h-16 bg-orange-400 rounded-t-lg shadow-lg flex items-end justify-center pb-2 text-white font-bold">3</div>
              </div>
            )}
          </div>

          <button 
            onClick={() => window.location.reload()} 
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition"
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