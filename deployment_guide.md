# MCQ-GPT Deployment Guide

This guide outlines the necessary steps and environment variables required to deploy the MCQ-GPT platform to a production environment.

## Architecture Overview
The system consists of three main components:
1.  **Backend (Node.js/Express)**: Handles Auth, Sockets, and Dashboard logic.
2.  **Frontend (React/Vite)**: The user interface.
3.  **AI Engine (Python/FastAPI)**: Handles RAG-based quiz generation from files.

---

## 1. Backend Environment Variables (.env)
You must set these variables on your Node.js hosting provider (e.g., Render, Heroku, or AWS).

| Variable | Description | Example |
| :--- | :--- | :--- |
| `PORT` | The port the server runs on. | `5000` (auto-set by most hosts) |
| `MONGO_URL` | Your MongoDB Atlas connection string. | `mongodb+srv://...` |
| `JWT_SECRET` | Secret key for token generation. | `your_secret_string` |
| `ALLOWED_ORIGIN` | Comma-separated list of allowed frontend URLs. | `https://your-app.vercel.app` |
| `API_KEY` | Google Gemini API Key. | `AIza...` |
| `PYTHON_SERVER_URL` | The public URL where the Python AI server is hosted. | `https://your-ai-engine.render.com` |

---

## 2. Frontend Environment Variables (.env.production)
These variables are baked into the frontend build at compile time.

| Variable | Description | Example |
| :--- | :--- | :--- |
| `VITE_API_URL` | The public URL of your Node.js backend API. | `https://your-api.com/api` |
| `VITE_SOCKET_URL` | The public URL of your Node.js backend (no /api). | `https://your-api.com` |

---

## 3. Render Deployment Setup (Step-by-Step)

### A. AI Engine (Python)
1. **New > Web Service** on Render.
2. Connect your GitHub repository.
3. **Name**: `mcq-gpt-ai-engine`
4. **Root Directory**: `models`
5. **Runtime**: `Python 3`
6. **Build Command**: `pip install -r dependencies.txt`
7. **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
8. **Environment Variables**:
   - `GOOGLE_API_KEY`: Your Gemini API key (Mandatory for Cloud Mode).
   - `ALLOWED_ORIGIN`: Your **Frontend URL** (after Phase 4).

### B. Backend (Node.js)
1. **New > Web Service** on Render.
2. Connect your GitHub repository.
3. **Name**: `mcq-gpt-backend`
4. **Root Directory**: `src/backend`
5. **Runtime**: `Node`
6. **Build Command**: `npm install`
7. **Start Command**: `node server.js`
8. **Environment Variables**:
   - `MONGO_URL`: Your MongoDB Atlas string.
   - `JWT_SECRET`: A random secure string.
   - `API_KEY`: Your Gemini API key.
   - `PYTHON_SERVER_URL`: The URL of the AI Engine (from step A).
   - `ALLOWED_ORIGIN`: Your **Frontend URL** (after Phase 4).

---

## 4. Deployment Checklist
- [ ] **Database**: Ensure MongoDB Atlas IP Whitelist includes `0.0.0.0/0`.
- [ ] **Frontend Environment**: Set `VITE_API_URL` and `VITE_SOCKET_URL` before building.
- [ ] **SSL**: Ensure all URLs use `https`. Mixed content will block socket connections.
