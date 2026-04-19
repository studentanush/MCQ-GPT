import Quiz from "../models/Quiz.js";
import Participation from "../models/Participation.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import axios from "axios";
import * as cheerio from "cheerio";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.API_KEY);

// ============ AI GENERAL CHAT ============
export const generateChat = async (req, res) => {
  try {
    const { message, context } = req.body;
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      You are an AI Quiz Assistant for MCQ-GPT. Your goal is to help educators create, manage, and refine quizzes.
      User message: "${message}"
      Context: ${JSON.stringify(context)}

      Provide a helpful, concise response in markdown format. 
      If the user wants to generate a quiz, remind them to specify the number of questions.
      Keep it professional but friendly.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    res.json({ reply: responseText });
  } catch (err) {
    console.error("generateChat error:", err);
    res.status(500).json({ message: "Error communicating with AI assistant", error: err.message });
  }
};

const QUIZ_STRUCTURE_PROMPT = (numQ) => `
RETURN ONLY VALID JSON. NO markdown, NO backticks, NO explanation.
Create EXACTLY ${numQ} multiple-choice questions.

JSON format:
{
  "title": "Concise quiz title",
  "time": "20",
  "status": "draft",
  "questions": [
    {
      "question": "Question text here",
      "type": "scq",
      "options": ["A) option text", "B) option text", "C) option text", "D) option text"],
      "correctAnswer": "Full text of correct option without the letter prefix",
      "correctAnswerOption": "A",
      "context": "Brief source excerpt under 100 chars",
      "explanation": "Detailed explanation of why this is correct",
      "difficulty": 0.5,
      "sub_topics": ["topic1", "topic2"]
    }
  ]
}
`;

// ============ CREATE QUIZ ============
export const createQuiz = async (req, res) => {
  try {
    const { title, time, status, questions } = req.body;
    const newQuiz = new Quiz({
      title,
      time,
      status: status || "draft",
      questions,
      createdBy: req.userId, 
    });
    const savedQuiz = await newQuiz.save();
    res.status(201).json({ success: true, quiz: savedQuiz });
  } catch (err) {
    console.error("createQuiz error:", err);
    res.status(500).json({ message: "Error saving quiz", error: err.message });
  }
};

// ============ GET USER QUIZZES ============
export const getUserQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find({ createdBy: req.userId }).sort({ createdAt: -1 });
    res.json(quizzes);
  } catch (err) {
    res.status(500).json({ message: "Error fetching quizzes", error: err.message });
  }
};

// ============ GET PUBLIC QUIZZES FOR STUDENTS ============
export const getPublicQuizzes = async (req, res) => {
  try {
    // Return quizzes that are "active" or "live"
    const quizzes = await Quiz.find({ status: { $in: ["active", "live"] } })
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .limit(10);
      
    // Strip correct answers to prevent students from cheating
    const strippedQuizzes = quizzes.map(quiz => {
       const oQuiz = { ...quiz._doc || quiz };
       if (oQuiz.questions) {
          oQuiz.questions = oQuiz.questions.map(q => {
             const safeQ = { ...q._doc || q };
             delete safeQ.correctAnswerOption;
             delete safeQ.correctAnswer;
             delete safeQ.explanation;
             return safeQ;
          });
       }
       return oQuiz;
    });

    res.json(strippedQuizzes);
  } catch (err) {
    res.status(500).json({ message: "Error fetching public quizzes", error: err.message });
  }
};

// ============ GET STUDENT ATTEMPTS ============
export const getStudentAttempts = async (req, res) => {
  try {
    const attempts = await Participation.find({ studentID: req.userId })
      .populate("quizID", "title time questions")
      .sort({ createdAt: -1 });
      
    // Transform to include pre-calculated metrics to avoid frontend "garbage" logic
    const transformed = attempts.map(att => {
        const quiz = att.quizID;
        let correct = 0;
        const total = quiz?.questions?.length || 0;
        
        if (quiz && quiz.questions) {
            att.studentResponse.forEach(r => {
                const q = quiz.questions.find(qItem => String(qItem._id) === String(r.questionId));
                if (q && r.status === 'answered' && gradeAnswer(q, r.answer)) {
                    correct++;
                }
            });
        }
        
        const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

        return {
            _id: att._id,
            quizID: {
                _id: quiz?._id,
                title: quiz?.title || "Deleted Quiz",
            },
            score: correct,
            totalQuestions: total,
            percentage,
            timeTaken: att.timeTaken,
            createdAt: att.createdAt,
            status: percentage >= 40 ? 'passed' : 'failed'
        };
    });
      
    res.json(transformed);
  } catch (err) {
    console.error("getStudentAttempts error:", err);
    res.status(500).json({ message: "Error fetching attempts", error: err.message });
  }
};

// Helper to grade an answer
const gradeAnswer = (q, studentAnswer) => {
    if (!studentAnswer || !q) return false;
    
    const ans = String(studentAnswer).trim().toLowerCase();
    const correctOpt = String(q.correctAnswerOption || "").trim().toLowerCase();
    const correctText = String(q.correctAnswer || "").trim().toLowerCase();
    
    // Check if it matches the letter (A, B, C...) or the full text
    return (ans === correctOpt) || (ans === correctText);
};

// ============ SUBMIT QUIZ ============
export const submitQuiz = async (req, res) => {
  const studentID = req.userId;
  const { timeTaken, studentResponse, quizID } = req.body;

  if (!quizID) {
    return res.status(400).json({ message: "Quiz ID is required." });
  }

  try {
    const quiz = await Quiz.findById(quizID);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    // Securely grade the submission on the backend
    let correct = 0;
    const total = quiz.questions.length;
    
    if (quiz.questions) {
      quiz.questions.forEach((q) => {
        const ans = studentResponse.find(r => String(r.questionId) === String(q._id));
        if (ans && ans.status === 'answered') {
          if (gradeAnswer(q, ans.answer)) correct++;
        }
      });
    }

    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

    // Use findOneAndReplace or findOneAndUpdate to allow re-submission/updating
    const updatedParticipation = await Participation.findOneAndUpdate(
      { quizID, studentID },
      {
        studentID,
        timeTaken,
        studentResponse,
        quizID,
        score: correct,
        totalQuestions: total
      },
      { upsert: true, new: true }
    );

    res.json({ 
        message: "Quiz saved successfully!", 
        submissionId: updatedParticipation._id, 
        score: correct, 
        total,
        percentage
    });
  } catch (error) {
    console.error("submitQuiz error:", error);
    res.status(500).json({ message: "Error saving quiz response", error: error.message });
  }
};

// ============ GET EDUCATOR DASHBOARD STATS ============
export const getEducatorStats = async (req, res) => {
  try {
    const quizzes = await Quiz.find({ createdBy: req.userId });
    const quizIds = quizzes.map(q => q._id);
    const participations = await Participation.find({ quizID: { $in: quizIds } });
    
    const uniqueStudents = new Set(participations.map(p => String(p.studentID)));
    let totalPerc = 0;
    
    participations.forEach(p => {
        const quiz = quizzes.find(q => String(q._id) === String(p.quizID));
        if (quiz && quiz.questions?.length > 0) {
            let correct = 0;
            p.studentResponse.forEach(r => {
                const q = quiz.questions.find(qItem => String(qItem._id) === String(r.questionId));
                if (r.status === 'answered' && gradeAnswer(q, r.answer)) {
                    correct++;
                }
            });
            totalPerc += (correct / quiz.questions.length) * 100;
        }
    });

    const avgScore = participations.length > 0 ? Math.round(totalPerc / participations.length) : 0;

    res.json({
        totalQuizzes: quizzes.length,
        totalStudents: uniqueStudents.size,
        avgScore: avgScore
    });

  } catch (err) {
    res.status(500).json({ message: "Error fetching stats", error: err.message });
  }
};

// ============ GET SINGLE QUIZ BY ID ============
export const getQuiz = async (req, res) => {
  const id = req.query.id;
  try {
    const quizResult = await Quiz.find({ _id: id }).populate("createdBy", "name email");
    if (!quizResult || quizResult.length === 0) {
      return res.status(404).json({ message: "Quiz not found" });
    }
    
    let quizDoc = quizResult[0];
    
    // Check if the requester is the owner (requires protect middleware to set req.userId)
    const isOwner = req.userId && quizDoc.createdBy && String(quizDoc.createdBy._id) === String(req.userId);
    
    if (!isOwner) {
       // Strip answers from the quiz for students
       const strippedQuiz = { ...quizDoc._doc || quizDoc };
       if (strippedQuiz.questions) {
          strippedQuiz.questions = strippedQuiz.questions.map(q => {
             const safeQ = { ...q._doc || q };
             delete safeQ.correctAnswerOption;
             delete safeQ.correctAnswer;
             delete safeQ.explanation;
             return safeQ;
          });
       }
       return res.json([strippedQuiz]);
    }

    res.json(quizResult);
  } catch (err) {
    console.error("getQuiz error:", err);
    res.status(500).json({ message: "Error fetching quiz", error: err.message });
  }
};

// ============ UPDATE QUIZ ============
export const updateQuiz = async (req, res) => {
  const { id } = req.params;
  try {
    const quiz = await Quiz.findById(id);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    if (String(quiz.createdBy) !== String(req.userId)) {
      return res.status(403).json({ message: "Not authorized to edit this quiz" });
    }

    const { title, time, status, questions } = req.body;
    if (title) quiz.title = title;
    if (time) quiz.time = time;
    if (status) quiz.status = status;
    if (questions) quiz.questions = questions;

    const updatedQuiz = await quiz.save();
    res.json({ success: true, quiz: updatedQuiz });
  } catch (err) {
    console.error("updateQuiz error:", err);
    res.status(500).json({ message: "Error updating quiz", error: err.message });
  }
};

// ============ GET ALL QUIZZES ============
export const getAllQuiz = async (req, res) => {
  try {
    const quizzes = await Quiz.find().sort({ createdAt: -1 });
    res.json(quizzes);
  } catch (err) {
    console.error("getAllQuiz error:", err);
    res.status(500).json({ message: "Error fetching quizzes", error: err.message });
  }
};

// ============ DELETE QUIZ ============
export const deleteQuiz = async (req, res) => {
  const { id } = req.params;
  try {
    const quiz = await Quiz.findById(id);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    // Only owner can delete
    if (String(quiz.createdBy) !== String(req.userId)) {
      return res.status(403).json({ message: "Not authorized to delete this quiz" });
    }

    await Quiz.findByIdAndDelete(id);
    res.json({ success: true, message: "Quiz deleted successfully" });
  } catch (err) {
    console.error("deleteQuiz error:", err);
    res.status(500).json({ message: "Error deleting quiz", error: err.message });
  }
};

// ============ GENERATE QUIZ FROM TEXT ============
export const generateQuiz = async (req, res) => {
  const { text, num_questions = 5 } = req.body;

  if (!text) {
    return res.status(400).json({ message: "Text content is required" });
  }

  if (!process.env.API_KEY) {
    return res.status(500).json({ message: "AI service not configured. Please add API_KEY to .env" });
  }

  try {
    const prompt = `${QUIZ_STRUCTURE_PROMPT(num_questions)}

TEXT TO GENERATE QUESTIONS FROM:
${text}`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const response = await model.generateContent(prompt);

    // Extract raw text
    let rawText = response.response.text() || "";
    // Clean markdown formatting if present
    const cleanedText = rawText.replace(/^```(json)?/m, "").replace(/```$/m, "").trim();

    try {
      const parsedQuiz = JSON.parse(cleanedText);
      res.status(200).json({ success: true, quiz: parsedQuiz });
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError, "\nRaw text:", cleanedText);
      res.status(500).json({ message: "AI returned invalid format", rawResponse: cleanedText });
    }
  } catch (err) {
    console.error("AI Generation Error:", err);
    res.status(500).json({ message: "Error generating quiz with AI", error: err.message });
  }
};

// ============ AGENTIC MODE (FETCH URL -> AI) ============
export const agenticMode = async (req, res) => {
  const { url, num_questions = 5 } = req.body;

  if (!url) {
    return res.status(400).json({ message: "URL is required for Agentic Mode" });
  }

  if (!process.env.API_KEY) {
    return res.status(500).json({ message: "AI service not configured. Please add API_KEY to .env" });
  }

  try {
    // Fetch URL content server-side
    let urlContent = "";
    try {
      const urlRes = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 QuizBot/1.0" },
        signal: AbortSignal.timeout(10000),
      });
      if (urlRes.ok) {
        const html = await urlRes.text();
        // Simplistic strip (better to use cheerio, but this is a fallback)
        urlContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .substring(0, 8000);
      }
    } catch (fetchErr) {
      console.warn("Could not fetch URL:", fetchErr.message);
    }

    const prompt = urlContent
      ? `${QUIZ_STRUCTURE_PROMPT(num_questions)}\n\nCONTENT FROM URL (${url}):\n${urlContent}`
      : `${QUIZ_STRUCTURE_PROMPT(num_questions)}\n\nCreate questions about the topic found at this URL: ${url}. Use your knowledge about this topic.`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const response = await model.generateContent(prompt);

    let rawText = response.response.text() || "";
    const cleanedText = rawText.replace(/^```(json)?/m, "").replace(/```$/m, "").trim();

    try {
      const parsedQuiz = JSON.parse(cleanedText);
      res.status(200).json({ success: true, quiz: parsedQuiz });
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError, "\nRaw text:", cleanedText);
      res.status(500).json({ message: "AI returned invalid format", rawResponse: cleanedText });
    }
  } catch (err) {
    console.error("Agentic AI Fetch Error:", err);
    res.status(500).json({ message: "Error fetching URL or generating quiz", error: err.message });
  }
};

// ============ GENERATE FROM FILE (Bridge to Python RAG server) ============
export const generateFromFile = async (req, res) => {
  const { filePath, num_questions = 5, prompt: userPrompt } = req.body;

  if (!filePath) {
    return res.status(400).json({ message: "File path is required" });
  }

  const finalPrompt = userPrompt || `Generate ${num_questions} questions from this file`;

  try {
    const pythonUrl = (process.env.PYTHON_SERVER_URL || "http://localhost:8000").replace(/\/$/, "");
    const pyResponse = await fetch(`${pythonUrl}/generate-quiz`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file_path: filePath,
        num_questions: Number(num_questions),
        prompt: finalPrompt,
      }),
      signal: AbortSignal.timeout(300000), // 300s — local LLM is slow
    });

    if (!pyResponse.ok) {
      const errText = await pyResponse.text().catch(() => pyResponse.statusText);
      throw new Error(`Python service returned ${pyResponse.status}: ${errText}`);
    }

    const data = await pyResponse.json();

    if (!data.success) {
      return res.status(500).json({ success: false, message: data.error || "Python service returned an error" });
    }

    // Python now returns { success, title, questions, ... } — wrap into { quiz }
    const { success, ...quizFields } = data;
    res.json({ success: true, quiz: quizFields });
  } catch (error) {
    console.error("File Generation Error (Python Bridge):", error);
    res.status(500).json({
      success: false,
      message: "Error generating quiz from file. Make sure the Python RAG server is running on port 8000.",
      error: error.message,
    });
  }
};

// ============ GENERATE FROM PROMPT (Bridge to Python RAG server — no file) ============
export const generateFromPrompt = async (req, res) => {
  const { prompt: userPrompt, num_questions = 5 } = req.body;

  if (!userPrompt) {
    return res.status(400).json({ message: "prompt is required" });
  }

  try {
    const pythonUrl = (process.env.PYTHON_SERVER_URL || "http://localhost:8000").replace(/\/$/, "");
    const pyResponse = await fetch(`${pythonUrl}/generate-quiz-from-prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: userPrompt, num_questions: Number(num_questions) }),
      signal: AbortSignal.timeout(300000),
    });

    if (!pyResponse.ok) {
      const errText = await pyResponse.text().catch(() => pyResponse.statusText);
      throw new Error(`Python service returned ${pyResponse.status}: ${errText}`);
    }

    const data = await pyResponse.json();

    if (!data.success) {
      return res.status(500).json({ success: false, message: data.error || "Python service returned an error" });
    }

    const { success, ...quizFields } = data;
    res.json({ success: true, quiz: quizFields });
  } catch (error) {
    console.error("Prompt Generation Error (Python Bridge):", error);
    res.status(500).json({
      success: false,
      message: "Error generating quiz from prompt. Make sure the Python RAG server is running on port 8000.",
      error: error.message,
    });
  }
};

// ============ GET STUDENT REPORT ============
export const getStudentReport = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const participation = await Participation.findById(submissionId).populate("studentID", "name email");
    if (!participation) return res.status(404).json({ message: "Submission not found" });

    const quiz = await Quiz.findById(participation.quizID).populate("createdBy", "name");
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    // Grade logic
    let correctAnswers = 0;
    let wrongAnswers = 0;
    let skipped = 0;
    let score = 0;

    const questionsAnalysis = quiz.questions.map((q, i) => {
      const studentAnsRaw = participation.studentResponse.find(sr => String(sr.questionId) === String(q._id));
      const studentAns = studentAnsRaw ? studentAnsRaw.answer : null;
      
      const isCorrect = gradeAnswer(q, studentAns);
      if (isCorrect) {
          correctAnswers++;
          score += 100;
      } else if (studentAnsRaw?.status === 'skipped' || !studentAns) {
          skipped++;
      } else {
          wrongAnswers++;
      }

      return {
          id: i + 1,
          question: q.question,
          type: q.type || 'mcq',
          studentAnswer: studentAns,
          correctAnswer: q.correctAnswerOption || q.correctAnswer,
          isCorrect,
          marks: 1,
          awardedMarks: isCorrect ? 1 : 0,
          difficulty: 'Medium',
          topic: q.sub_topics?.[0] || 'General',
          solution: q.explanation || 'Review the correct option directly.',
          explanation: q.explanation || 'Self-explanatory based on the topic context.'
      };
    });

    const totalQuestions = quiz.questions.length;
    const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    let grade = 'F';
    if (percentage >= 90) grade = 'A';
    else if (percentage >= 75) grade = 'B';
    else if (percentage >= 60) grade = 'C';
    else if (percentage >= 40) grade = 'D';

    // Efficiency map for grading
    const questionMap = new Map();
    quiz.questions.forEach(q => questionMap.set(String(q._id), q));

    // Calculate real class metrics efficiently
    const allParticipations = await Participation.find({ quizID: quiz._id });
    const allPercentages = allParticipations.map(p => {
        const totalQ = quiz.questions.length;
        if (totalQ === 0) return 0;
        let pCorrect = 0;
        p.studentResponse.forEach(res => {
            const q = questionMap.get(String(res.questionId));
            if (q && gradeAnswer(q, res.answer)) pCorrect++;
        });
        return Math.round((pCorrect / totalQ) * 100);
    });

    const averageScore = allPercentages.length > 0 
        ? Math.round(allPercentages.reduce((a, b) => a + b, 0) / allPercentages.length) 
        : percentage;
    const highestScore = allPercentages.length > 0 ? Math.max(...allPercentages) : 0;
    
    // Sort percentages to find rank
    const sortedPercentages = [...allPercentages].sort((a, b) => b - a);
    const rank = sortedPercentages.indexOf(percentage) + 1 || 1;
    const totalParticipants = sortedPercentages.length;

    // Derived stats for UI
    const topicsList = [...new Set(quiz.questions.map(q => q.sub_topics?.[0] || 'General'))];
    const topicsAnalysis = topicsList.map(topicName => {
        const topicQuestions = quiz.questions.filter(q => (q.sub_topics?.[0] || 'General') === topicName);
        let topicCorrect = 0;
        topicQuestions.forEach(q => {
            const res = participation.studentResponse.find(r => String(r.questionId) === String(q._id));
            if (res && gradeAnswer(q, res.answer)) topicCorrect++;
        });
        const topicTotal = topicQuestions.length;
        return {
            name: topicName,
            total: topicTotal,
            correct: topicCorrect,
            percentage: topicTotal > 0 ? Math.round((topicCorrect / topicTotal) * 100) : 0
        };
    });

    const reportData = {
        submissionId: participation._id,
        quizId: quiz._id,
        quizTitle: quiz.title,
        studentName: participation.studentID?.name || 'Student',
        studentId: participation.studentID?._id || 'Unknown',
        className: 'General Session',
        teacher: quiz.createdBy?.name || 'Educator',
        submittedAt: participation.createdAt,
        timeTaken: participation.timeTaken || '0m 0s',
        totalQuestions,
        attempted: correctAnswers + wrongAnswers,
        correctAnswers,
        wrongAnswers,
        skipped,
        score,
        totalMarks: totalQuestions * 100,
        percentage,
        grade,
        rank: `#${rank} out of ${totalParticipants}`, 
        questions: questionsAnalysis,
        topics: topicsAnalysis,
        questionTypes: [{ type: 'Standard', total: totalQuestions, correct: correctAnswers, percentage }],
        difficulties: [{ level: 'Medium', total: totalQuestions, correct: correctAnswers, percentage }],
        aiInsights: {
            strengths: percentage >= 70 ? ['Consistent performance!', 'Good grasp of core concepts'] : ['Attempted all questions!', 'Showed interest in the topic'],
            weaknesses: percentage < 70 ? ['Topic fundamentals need review', 'Attention to detail'] : ['Could improve speed further'],
            recommendations: ['Practice similar topics on QuizCo.AI', 'Review incorrect answers in the Solutions tab'],
            overallAssessment: percentage >= 80 ? 'Excellent work! You are ready for the next level.' : 'Good effort! Focus on your weaker areas to improve further.'
        },
        classStats: {
            averageScore,
            highestScore,
            medianScore: averageScore,
            yourPercentile: totalParticipants > 0 ? Math.round(((totalParticipants - rank + 1) / totalParticipants) * 100) : 100
        }
    };

    res.json(reportData);
  } catch (error) {
    console.error("getStudentReport error:", error);
    res.status(500).json({ message: "Error fetching report", error: error.message });
  }
};

// ============ GET EDUCATOR REPORT ============
export const getEducatorReport = async (req, res) => {
  const { quizID } = req.query;

  try {
    const quiz = await Quiz.findById(quizID);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    // Only the quiz owner can see the report
    if (String(quiz.createdBy) !== String(req.userId)) {
      return res.status(403).json({ message: "Not authorized to view this report" });
    }

    const participations = await Participation
      .find({ quizID })
      .populate("studentID", "name email");

    const total = quiz.questions.length;

    const studentPerformance = participations.map((p) => {
      let correct = 0;
      quiz.questions.forEach((q) => {
        const studentAns = p.studentResponse?.find(r => String(r.questionId) === String(q._id));
        if (studentAns?.status === "answered" && gradeAnswer(q, studentAns.answer)) {
          correct++;
        }
      });

      return {
        studentName: p.studentID?.name || "Unknown",
        studentEmail: p.studentID?.email || "",
        score: correct,
        total,
        percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
        timeTaken: p.timeTaken,
        submittedAt: p.createdAt,
      };
    });

    // Question-level analysis
    const questionAnalysis = quiz.questions.map((q, idx) => {
      let correctCount = 0;
      let attemptCount = 0;

      participations.forEach((p) => {
        const studentAns = p.studentResponse?.find(r => String(r.questionId) === String(q._id));
        if (studentAns?.status === "answered") {
          attemptCount++;
          if (gradeAnswer(q, studentAns.answer)) correctCount++;
        }
      });

      return {
        questionIndex: idx + 1,
        question: q.question,
        correctRate: attemptCount > 0 ? Math.round((correctCount / attemptCount) * 100) : 0,
        attemptCount,
        difficulty: q.difficulty || 0.5,
        topic: q.sub_topics && q.sub_topics.length > 0 ? q.sub_topics[0] : 'General',
      };
    });

    // Topic Performance Analysis
    const topicsMap = {};
    questionAnalysis.forEach(q => {
      if (!topicsMap[q.topic]) {
        topicsMap[q.topic] = { name: q.topic, correctRateSum: 0, count: 0 };
      }
      topicsMap[q.topic].correctRateSum += q.correctRate;
      topicsMap[q.topic].count += 1;
    });

    const topicPerformance = Object.values(topicsMap).map(t => ({
      topic: t.name,
      score: Math.round(t.correctRateSum / t.count),
      questions: t.count
    }));

    const avgScore = studentPerformance.length > 0
        ? Math.round(studentPerformance.reduce((sum, s) => sum + s.percentage, 0) / studentPerformance.length)
        : 0;
        
    // Calculate average time
    const studentWithTime = studentPerformance.filter(s => s.timeTaken && s.timeTaken.includes('m'));
    const avgTimeArr = studentWithTime.map(s => {
        const parts = s.timeTaken.split(' ');
        const mins = parseInt(parts[0]) || 0;
        const secs = parseInt(parts[1]) || 0;
        return (mins * 60) + secs;
    });
    const avgSeconds = avgTimeArr.length > 0 ? avgTimeArr.reduce((a, b) => a + b, 0) / avgTimeArr.length : 0;
    const avgTimeStr = avgSeconds > 0 ? `${Math.floor(avgSeconds / 60)}m ${Math.round(avgSeconds % 60)}s` : '0m 0s';

    res.json({
      quizTitle: quiz.title,
      quizTime: quiz.time,
      totalStudents: participations.length,
      avgScore,
      avgTime: avgTimeStr,
      studentPerformance,
      questionAnalysis,
      topicPerformance,
    });
  } catch (error) {
    console.error("getEducatorReport error:", error);
    res.status(500).json({ message: "Error fetching educator report", error: error.message });
  }
};
