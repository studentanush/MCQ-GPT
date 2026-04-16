// routes/quizRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { 
  createQuiz, 
  getUserQuizzes, 
  getQuiz, 
  generateQuiz, 
  agenticMode, 
  generateFromFile,
  generateFromPrompt,
  deleteQuiz, 
  getStudentReport,
  getStudentAttempts,
  getPublicQuizzes,
  getEducatorStats,
  generateChat,
  submitQuiz,
  getEducatorReport
} from "../controllers/quizController.js";
import Quiz from "../models/Quiz.js";
import Participation from "../models/Participation.js";

const router = express.Router();

router.post("/create", protect, createQuiz);
router.get("/getQuiz", protect, getQuiz);
router.get("/getUserQuizes", protect, getUserQuizzes);
router.get("/report/:submissionId", protect, getStudentReport);
router.get("/public", protect, getPublicQuizzes);
router.get("/attempts", protect, getStudentAttempts);
router.get("/educator-stats", protect, getEducatorStats);
router.post("/chat", protect, generateChat);
router.delete("/delete/:id", protect, deleteQuiz);
router.put("/update/:id", protect, async (req, res) => {
  const { id } = req.params;
  const { title, time, status, questions } = req.body;
  try {
    const quiz = await Quiz.findById(id);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    if (String(quiz.createdBy) !== String(req.userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const updated = await Quiz.findByIdAndUpdate(
      id,
      { title, time, status, questions },
      { new: true, runValidators: true }
    );
    res.json({ success: true, quiz: updated });
  } catch (err) {
    console.error("updateQuiz error:", err);
    res.status(500).json({ message: "Error updating quiz", error: err.message });
  }
});


// AI Generation Routes
router.post("/generate", protect, generateQuiz);
router.post("/agentic", protect, agenticMode);
router.post("/generate-from-file", protect, generateFromFile);
router.post("/generate-from-prompt", protect, generateFromPrompt); // Bug 1 fix: was exported but never registered

// Store quiz participation (student submits answers)
router.post("/storeParticipants", protect, submitQuiz);

// Student report for a specific quiz attempt
router.get("/studentReport", protect, getStudentReport);

// Educator report for a specific quiz (all students)
router.get("/educatorReport", protect, getEducatorReport);

export default router;
