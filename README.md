# MCQ-GPT - AI Quiz Portal – MERN + AI (Prototype Build)

A smart AI-powered quiz generation and evaluation platform built for the **UpSkill India Challenge (HCL × GUVI)**.  
Our goal is to create an interactive quiz portal that automatically generates questions using AI, evaluates responses, and supports multi-user quiz sessions similar to Kahoot.

MCQ-GPT is a full‑stack, event-ready quiz platform built for educational and event scenarios (e.g., TechFest). It combines real-time multiplayer quizzes, educator/admin controls, and AI-assisted quiz generation to let organizers create, run, and analyze interactive quizzes with minimal manual effort.

---

## Project overview
The **MCQ-GPT** is a full‑stack MERN application that streamlines the creation, management, and conduction of quizzes. It includes a complete backend API using Express.js, event-based communication channels using Socket.IO, and a modular frontend built with React + Vite.


The platform supports:
- AI-assisted quiz generation from raw text or URLs.
- Real-time room creation, joining, and quiz broadcasting.
- Speed-based scoring and automated leaderboards.
- File upload and quiz content storage.
- Dedicated admin workflows separate from player flows.


---

## Problem statement
Traditional event-based quizzes require:
- Manual preparation of questions.
- Slow setup and coordination.
- Lack of scalable real-time infrastructure.


This platform solves these gaps by:
- Generating quizzes instantly using AI.
- Providing real-time quiz conduction with Socket.IO namespaces.
- Offering a fully modular admin dashboard for question flow control.
- Supporting multiplayer performance tracking.

---

## Key Features
### Authentication
- Secure JWT-based user authentication.
- Password encryption via bcrypt.


### AI Quiz Generation
- Generate quiz questions using **Google GenAI**.
- Support for text prompts and URL-based question extraction.
- Optional RAG workflow using Python for document-grounded generation.


### Real-Time Multiplayer System
- Two dedicated namespaces:
- `admin` – for quiz creation, broadcasting, flow control.
- `player` – for joining rooms, receiving questions, and submitting answers.
- Instant scoring and leaderboard updates.
- Event-driven architecture with Socket.IO.


### File Management
- Integrated file uploads using Multer.
- Storage for reference materials.


### Quiz Lifecycle
- Quiz creation via dashboard.
- Room creation & participant joining.
- Question broadcasting with timers.
- Answer evaluation & scoring.
- Real-time leaderboard announcements.


---

## Tech Stack
### Frontend
- React (Vite)
- TailwindCSS
- socket.io-client
- Axios
- React Router


### Backend
- Node.js (ES Modules)
- Express.js
- Socket.IO
- Multer
- Bcrypt.js
- JSON Web Tokens (JWT)


### AI
- Google GenAI / Gemini API
- Optional Python RAG pipeline


---


## 📁 Project Backend Structure
```
backend/
├── controllers/
├── routes/
├── sockets/
│ ├── adminSocket.js
│ └── playerSocket.js
├── middleware/
├── models/
├── server.js
└── config/
```


## 📁 Project Frontend Structure 
```
frontend/
├── src/
│ ├── components/
│ ├── pages/
│ ├── hooks/
│ ├── utils/
│ └── App.jsx
└── index.html
```
## 📁 Project Models Structure
```
models/
├── chroma_db/            # Local Chroma vector database files
├── uploads/              # Uploaded PDF/text/docx files for processing
├── dependencies.txt      # Python dependencies (like requirements.txt)
├── server.py             # FastAPI / backend server for model operations
├── speakerLLM.py         # LLM-driven speaker/extraction/embedding logic
└── README.md             # Setup instructions for the models module
```
---

## 🔄 System Architecture
### Data Flow
1. **Admin** creates quiz → stored in backend.
2. Admin opens a room via Socket.IO → room broadcast starts.
3. **Players** join the room.
4. Admin broadcasts a question → all players receive it in real time.
5. Players submit answers → server evaluates.
6. Leaderboard updates → real-time broadcast to all.


---

## User workflows

Login / Signup
- Frontend POST -> /api/auth (server-side uses bcryptjs/jsonwebtoken).
- Frontend stores session as sessionStorage during development (commits reference this).

Quiz creation (educator/admin)
- Educator creates quiz and saves.
- Educator emits `createRoom` to the `/admin` Socket.IO namespace with { hostName, quizD }.
- Server generates a roomCode (nanoid(6)) and stores room metadata in memory (rooms Map).

Joining a room (player)
- Player emits `joinRoom` with { roomCode, playerName, playerEmail }.
- Server validates room, adds player to room.players (Map keyed by socket.id), and emits `updatePlayers` and `getQuizDetails`.

Question broadcast & play flow
- Admin emits `sendQuestion` -> server broadcasts `newQuestion` and `quiztime`.
- Admin toggles `playOnOff` -> server emits `quizStarted`.

Answer submission & scoring
- Player emits `submitAnswer` with { roomCode, answer, correctAnswer, timeTaken, totalTime }.
- Server computes
- Server updates room.scores and broadcasts `leaderboardUpdate`.

AI generation
- POST /generate-quiz with { text, num_questions } or /agentic-mode with { url }.
- Backend constructs structured prompt and calls Google GenAI (gemini-2.5-flash) using process.env.API_KEY; returns AI JSON response.

---

## Key algorithms & logic
- In-memory room management using Map(): rooms Map stores { admin, quizD, play, players: Map, scores: Map }.
- Leaderboard: convert room.scores Map -> array of { playerName, score } -> sort descending -> emit.
- Scoring function: base points with speed bonus — encourages quick correct answers.
- AI prompt engineering: server builds strict JSON-output prompts for Gemini to produce quizzes with fields: question, options, correct content/letter, explanation, difficulty, sub_topics, reframe.
- DB connection: mongoose connects using MONGO_URL (src/backend/config/db.js).

---

## AI / ML components
- Server uses Google GenAI client to call Gemini models for quiz generation:
  - /generate-quiz (from raw text)
  - /agentic-mode (from URL)
- Python RAG (optional): requirements.txt & models/ indicate a plan or previous attempt to use document retrieval + generation pipelines to ground questions in documents (indexing and retrieval).

---

## Strengths
- Real-time experience with a dedicated admin namespace — suited for live events.
- AI-assisted quiz generation drastically reduces manual authoring time.
- Modular code separation (frontend/backend) and modern stacks (Vite, React, Express).
- Simple scoring and leaderboard logic ready for gamification.
- Extensible: routes, controllers, and middleware scaffolding enables future features.

---

## Possible improvements & future scope
- Make rooms fault-tolerant and scalable: persist sessions/state in Redis (support multiple backend instances).
- Add reconnection & session persistency for players who disconnect.
- Validate & sanitize AI outputs with a strict JSON schema before using them in production quizzes.
- Add tests (unit/integration), CI pipeline, and linting steps.
- Harden security: validate socket events, apply strict auth/authorization for admin actions, hide/secure secrets.
- Provide model download scripts or hosted RAG worker for reproducible AI flows.
- Add production-ready deployment docs (Docker images, Kubernetes, PM2) and monitoring/analytics.
---

---

## 🚀 Getting Started

Follow these instructions to set up and run the project on your local machine.

### Prerequisites
- **Node.js** (v20+ recommended)
- **Python** (3.10+ recommended)
- **MongoDB** (Local or Atlas)
- **Ollama** (For local Llama 3.2 support)

---

### 1. Backend Setup (`src/backend`)

1. Navigate to the backend directory:
   ```bash
   cd src/backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `src/backend` directory and add the following:
   ```env
   MONGO_URL=mongodb://localhost:27017/quizco
   JWT_SECRET=your_jwt_secret_here
   PORT=5000
   API_KEY=your_gemini_api_key_here
   ALLOWED_ORIGIN=http://localhost:5173
   ```
4. Start the backend server:
   ```bash
   npm run dev
   ```

---

### 2. Frontend Setup (`src/frontend`)

1. Navigate to the frontend directory:
   ```bash
   cd src/frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:5173`.

---

### 3. AI Models Setup (`models/`)

This platform uses a hybrid AI approach (Google Gemini + Local Ollama).

1. **Install Ollama**: [Download here](https://ollama.com/)
2. **Pull the model**:
   ```bash
   ollama pull llama3.2
   ```
3. **Navigate to the models folder**:
   ```bash
   cd models
   ```
4. **Install Python dependencies**:
   ```bash
   pip install -r dependencies.txt
   ```
5. **Start the FastAPI server**:
   ```bash
   uvicorn server:app --reload
   ```
   The AI service runs on `http://localhost:8000`.

---

## 🛠️ Testing

To run the automated UI and functional tests:
1. Ensure both frontend and backend are running.
2. Run the Selenium test suite:
   ```bash
   python tests/test_frontend.py
   ```

---

## 📁 Project Structure Summary
- **`/src/frontend`**: React + Vite application.
- **`/src/backend`**: Node.js + Express API.
- **`/models`**: Python FastAPI service for AI processing.

---

## Contact & contributors
- Team: Theta Force
- Role: Full-stack development, AI integration, and event-driven architecture.

---
