import { nanoid } from "nanoid";
import Participation from "../models/Participation.js";
import User from "../models/User.js";

const rooms = new Map();

// Helper: parse time string like "20 mins" or "20" into seconds
const parseTimeToSeconds = (timeStr) => {
  if (!timeStr) return 30;
  const num = parseInt(String(timeStr).replace(/\D/g, ""), 10);
  return isNaN(num) ? 30 : num * 60;
};

// Helper: parse per-question time (the time field is total quiz time in minutes,
// but for a live hosted quiz we broadcast each question independently — the
// educator manually advances questions, so we give each question a 30s default
// unless totalTime for the quiz is a defined seconds value.)
const parseQuestionTimeSeconds = (timeStr, numQuestions) => {
  if (!timeStr) return 30;
  const num = parseInt(String(timeStr).replace(/\D/g, ""), 10);
  if (isNaN(num) || num <= 0 || numQuestions <= 0) return 30;
  // totalQuizMinutes / numQuestions * 60 → per-question seconds
  return Math.max(10, Math.floor((num * 60) / numQuestions));
};

export const socketManager = (io) => {
  const adminNamespace = io.of("/admin");

  // ----------------- PLAYER NAMESPACE (DEFAULT) -----------------
  io.on("connection", (socket) => {
    socket.on("joinRoom", ({ roomCode, playerName, playerEmail, studentId }, callback) => {
      const room = rooms.get(roomCode);

      if (!room) {
        return callback({ error: "Room not found" });
      }

      const playerDetail = {
        playerName,
        playerEmail,
        studentId: studentId || null,
        id: socket.id,
        score: 0,
        status: "active",
        responses: []
      };

      room.players.set(socket.id, playerDetail);
      room.scores.set(socket.id, 0);
      socket.join(roomCode);

      console.log(`${playerName} joined room ${roomCode}`);

      // Broadcast updated player list
      const playerList = Array.from(room.players.values());
      io.to(roomCode).emit("updatePlayers", playerList);
      adminNamespace.to(roomCode).emit("updatePlayers", playerList);

      // Strip the correct answers so students can't cheat via DevTools
      const strippedQuizD = {
        ...room.quizD,
        questions: room.quizD.questions.map(q => {
          const safeQ = { ...q._doc || q };
          delete safeQ.correctAnswerOption;
          delete safeQ.correctAnswer;
          delete safeQ.explanation;
          return safeQ;
        })
      };
      
      socket.emit("getQuizDetails", strippedQuizD);
      socket.emit("quizStarted", room.play);

      // If quiz already in progress, send the current question immediately
      if (room.play && room.currentQuestionIndex >= 0) {
        const question = room.quizD.questions[room.currentQuestionIndex];
        if (question) {
          socket.emit("newQuestion", buildQuestionPayload(question, room, room.currentQuestionIndex));
        }
      }

      callback({ success: true });
    });

    socket.on("submitAnswer", ({ roomCode, answer, timeTaken, totalTime }, callback) => {
      const room = rooms.get(roomCode);
      if (!room || !room.players.has(socket.id)) {
        return callback?.({ error: "Unauthorized or Room ended" });
      }

      const currentQ = room.quizD.questions[room.currentQuestionIndex];
      if (!currentQ) return callback?.({ error: "Question not found" });

      let points = 0;
      // Accept both option ID (A, B, C) and full text comparison
      const isCorrect = (answer === currentQ.correctAnswerOption) || 
                        (String(answer).toLowerCase() === String(currentQ.correctAnswer).toLowerCase());

      if (isCorrect) {
        // Base 100 pts + speed bonus (up to 50 pts) proportional to time remaining
        const bonusMax = 50;
        const timeRatio = totalTime > 0 ? Math.max(0, (totalTime - timeTaken) / totalTime) : 0;
        points = 100 + Math.round(bonusMax * timeRatio);
      }

      const oldScore = room.scores.get(socket.id) || 0;
      const newScore = oldScore + points;
      room.scores.set(socket.id, newScore);
      const player = room.players.get(socket.id);
      if (player) {
         player.score = newScore;
         player.responses.push({
           questionId: currentQ._id,
           answer: answer,
           status: 'answered',
           timestamp: new Date()
         });
      }

      const leaderboard = Array.from(room.scores.entries())
        .map(([id, score]) => ({
          playerName: room.players.get(id)?.playerName || "Unknown",
          playerEmail: room.players.get(id)?.playerEmail || "",
          score,
        }))
        .sort((a, b) => b.score - a.score);

      io.to(roomCode).emit("leaderboardUpdate", leaderboard);
      adminNamespace.to(roomCode).emit("leaderboardUpdate", leaderboard);

      // Track how many answered this question
      if (room.currentQuestionIndex >= 0) {
        if (!room.answeredThisQuestion) room.answeredThisQuestion = new Set();
        room.answeredThisQuestion.add(socket.id);
        const answeredCount = room.answeredThisQuestion.size;
        adminNamespace.to(roomCode).emit("questionStats", {
          answeredCount,
          totalPlayers: room.players.size,
        });
      }

      callback?.({
        correct: isCorrect,
        earnedPoints: points,
        totalScore: newScore,
      });
    });

    socket.on("disconnect", () => {
      rooms.forEach((room, code) => {
        if (room.players.has(socket.id)) {
          const player = room.players.get(socket.id);
          room.players.delete(socket.id);
          room.scores.delete(socket.id);
          const playerList = Array.from(room.players.values());
          io.to(code).emit("updatePlayers", playerList);
          adminNamespace.to(code).emit("updatePlayers", playerList);
          console.log(`${player?.playerName || socket.id} left room ${code}`);
        }
      });
    });
  });

  // ----------------- ADMIN NAMESPACE -----------------
  adminNamespace.on("connection", (socket) => {
    socket.on("createRoom", ({ hostName, quizD }, callback) => {
      const roomCode = nanoid(6).toUpperCase();
      rooms.set(roomCode, {
        admin: hostName,
        quizD: quizD,
        play: false,
        currentQuestionIndex: -1,
        players: new Map(),
        scores: new Map(),
        answeredThisQuestion: new Set(),
        questionTimer: null,
        startTime: null,
      });

      console.log(`Room ${roomCode} created by ${hostName}`);
      socket.join(roomCode);
      callback({ roomCode });
    });

    socket.on("joinAdminRoom", ({ roomCode }, callback) => {
      const room = rooms.get(roomCode);
      if (!room) {
        if (callback) callback({ error: "Room not found" });
        return;
      }
      socket.join(roomCode);
      socket.emit("updatePlayers", Array.from(room.players.values()));
      // Send current leaderboard
      const leaderboard = Array.from(room.scores.entries())
        .map(([id, score]) => ({
          playerName: room.players.get(id)?.playerName || "Unknown",
          score,
        }))
        .sort((a, b) => b.score - a.score);
      socket.emit("leaderboardUpdate", leaderboard);
      if (callback) callback({ success: true });
    });

    socket.on("playOnOff", ({ roomCode, play }, callback) => {
      const room = rooms.get(roomCode);
      if (!room) return callback?.({ error: "Room not found" });

      room.play = play;

      if (play) {
        room.currentQuestionIndex = 0;
        room.startTime = new Date();
      } else {
        // End quiz — clear any running timers
        if (room.questionTimer) {
          clearTimeout(room.questionTimer);
          room.questionTimer = null;
        }
      }

      io.to(roomCode).emit("quizStarted", play);
      callback?.({ status: "ok" });
    });

    socket.on("sendQuestion", ({ roomCode, questionIndex }, callback) => {
      const room = rooms.get(roomCode);
      if (!room) return callback?.({ error: "Room not found" });

      // Clear previous question timer if any
      if (room.questionTimer) {
        clearTimeout(room.questionTimer);
        room.questionTimer = null;
      }

      room.currentQuestionIndex = questionIndex;
      room.answeredThisQuestion = new Set(); // reset per-question tracking

      const question = room.quizD.questions[questionIndex];
      if (!question) return callback?.({ error: "Question not found" });

      const adminPayload = buildQuestionPayload(question, room, questionIndex);
      const playerPayload = { ...adminPayload };
      delete playerPayload.correctIndex;
      delete playerPayload.correctAnswerOption;
      delete playerPayload.correctAnswer;
      delete playerPayload.explanation;

      io.to(roomCode).emit("newQuestion", playerPayload);
      adminNamespace.to(roomCode).emit("newQuestion", adminPayload);

      // Auto-advance timer: notify students when time is up
      const totalTime = adminPayload.totalTime;
      room.questionTimer = setTimeout(() => {
        io.to(roomCode).emit("questionTimeUp", { questionIndex });
        adminNamespace.to(roomCode).emit("questionTimeUp", { questionIndex });
      }, totalTime * 1000);

      callback?.({ status: "ok" });
    });

    socket.on("endQuiz", async ({ roomCode }, callback) => {
      const room = rooms.get(roomCode);
      if (!room) return callback?.({ error: "Room not found" });

      if (room.questionTimer) {
        clearTimeout(room.questionTimer);
        room.questionTimer = null;
      }

      room.play = false;

      const playerList = Array.from(room.players.values());
      const finalLeaderboard = playerList
        .map((p) => ({
          playerName: p.playerName,
          playerEmail: p.playerEmail,
          score: p.score,
        }))
        .sort((a, b) => b.score - a.score);

      io.to(roomCode).emit("quizEnded", { leaderboard: finalLeaderboard });
      adminNamespace.to(roomCode).emit("quizEnded", { leaderboard: finalLeaderboard });

      // PERSIST RESULTS TO DATABASE
      try {
        const quizId = room.quizD._id;
        const endTime = new Date();
        const elapsedMs = room.startTime ? (endTime - room.startTime) : 0;
        const mins = Math.floor(elapsedMs / 60000);
        const secs = Math.floor((elapsedMs % 60000) / 1000);
        const timeTakenStr = `${mins}m ${secs}s`;

        for (const player of playerList) {
          if (player.studentId) {
             await Participation.create({
               quizID: quizId,
               studentID: player.studentId,
               score: player.score,
               totalQuestions: room.quizD.questions?.length || 0,
               studentResponse: player.responses,
               timeTaken: timeTakenStr
             });
          }
        }
        console.log(`Persisted ${playerList.length} results for room ${roomCode}`);
      } catch (err) {
        console.error("Error persisting live results:", err);
      }

      // Cleanup room after a delay so everyone can see results
      setTimeout(() => {
        rooms.delete(roomCode);
        console.log(`Room ${roomCode} cleaned up`);
      }, 30000);

      callback?.({ status: "ok", leaderboard: finalLeaderboard });
    });

    socket.on("disconnect", () => {
      // Admin disconnect — don't close room immediately in case of page refresh
    });
  });

  // --------------- HELPER ---------------
  function buildQuestionPayload(question, room, index) {
    const numQuestions = room.quizD.questions?.length || 1;
    // Per-question seconds derived from total quiz time  
    const perQSeconds = parseQuestionTimeSeconds(room.quizD.time, numQuestions);

    return {
      question: question.question,
      options: question.options,
      index: index,
      // Send correct answer index (0-based) so frontend can validate
      correctIndex: question.correctAnswerOption
        ? question.correctAnswerOption.charCodeAt(0) - 65
        : 0,
      correctAnswerOption: question.correctAnswerOption,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      difficulty: question.difficulty,
      totalTime: perQSeconds,
    };
  }
};
