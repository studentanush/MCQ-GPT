import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import quizRoutes from "./routes/quizRoutes.js";

import { createServer } from "http";
import { Server } from "socket.io";
import { socketManager } from "./sockets/socketManager.js";

dotenv.config();

// ---------------- APP INITIALIZATION ---------------- //
const app = express();

// Middlewares
// Middlewares
const allowedOrigins = process.env.ALLOWED_ORIGIN 
  ? process.env.ALLOWED_ORIGIN.split(",") 
  : ["http://localhost:5173", "http://localhost:3000", "http://localhost:5174", "https://quizzco-frontend.vercel.app"];

// Shared CORS origin validation logic
const corsOptions = {
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.indexOf(origin) !== -1 || 
                      origin.endsWith('.vercel.app') || 
                      origin.includes('localhost');
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(null, false); // No error, just disallow
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Connect MongoDB
connectDB();


// Test Route
app.get("/", (req, res) => {
  res.send("MCQ-GPT Backend is running...");
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/quizzes", quizRoutes);

// ----------------- SOCKET.IO SETUP ---------------- //
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: corsOptions, // Use the same CORS options for consistency
});

// Initialize Socket Manager
socketManager(io);




// All routes moved to /api/...

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined
  });
});

// ---------------- START SERVER ----------------
const PORT = process.env.PORT || 5000;

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
