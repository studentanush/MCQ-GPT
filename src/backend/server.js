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
const allowedOrigins = process.env.ALLOWED_ORIGIN 
  ? process.env.ALLOWED_ORIGIN.split(",") 
  : ["http://localhost:5173", "http://localhost:3000", "http://localhost:5174"];

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Connect MongoDB
connectDB();


// Test Route
app.get("/", (req, res) => {
  res.send("QUIZZCO.AI Backend is running...");
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/quizzes", quizRoutes);

// ----------------- SOCKET.IO SETUP ---------------- //
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { 
    origin: allowedOrigins, 
    methods: ["GET", "POST"],
    credentials: true
  },
});

// Initialize Socket Manager
socketManager(io);




// All routes moved to /api/...




// ---------------- START SERVER ----------------
const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
