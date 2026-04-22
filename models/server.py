"""
MCQ-GPT AI Engine
=================
FastAPI server that generates quizzes using Google Gemini API directly.
Uses google-generativeai SDK for prompt-based generation (no LangChain for this).
Uses LangChain RAG pipeline for file-based generation.
"""

import os
import re
import json
import shutil
import uuid
from typing import List, Optional

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load env: try local backend .env first (localhost), then fall back to system env vars (Render/production)
_local_env = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "src", "backend", ".env"
)
if os.path.exists(_local_env):
    load_dotenv(_local_env, override=True)
    print(f"Loaded env from: {_local_env}")
else:
    load_dotenv(override=True)  # picks up any .env in cwd or system env vars on Render
    print("No local .env found — using system environment variables (Render/production mode)")


# ── App setup ─────────────────────────────────────────────────────────────────
app = FastAPI(title="MCQ-GPT AI Engine")

allowed_origins = os.getenv(
    "ALLOWED_ORIGIN",
    "http://localhost:3000,http://localhost:5173,http://localhost:5174,https://quizzco-backend.onrender.com"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Pydantic Models ───────────────────────────────────────────────────────────
class Reframe(BaseModel):
    reframe_qns: bool = False
    reformed_qns: str = ""
    reframe_options: bool = False
    reformed_options: str = ""

class Question(BaseModel):
    question: str
    type: str = "scq"
    options: List[str]
    correctAnswer: str
    correctAnswerOption: str
    context: str = ""
    explanation: str = ""
    difficulty: float = 0.5
    sub_topics: List[str] = []
    reframe: Reframe = Field(default_factory=Reframe)

class Quiz(BaseModel):
    title: str
    questions: List[Question]

class QuizRequest(BaseModel):
    prompt: str
    file_path: Optional[str] = None
    num_questions: int = 5

# ── Google Gemini SDK setup (direct — no LangChain) ──────────────────────────
google_api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("API_KEY")

gemini_model = None
if google_api_key:
    print(f"Initializing Gemini (key: {google_api_key[:12]}...)")
    import google.generativeai as genai
    genai.configure(api_key=google_api_key)
    gemini_model = genai.GenerativeModel("gemini-2.5-flash")
    print("Gemini ready.")
else:
    print("WARNING: No API key found — prompt-only generation will fail.")

# ── LangChain setup (for file-based RAG only) ─────────────────────────────────
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.document_loaders import PyPDFLoader, TextLoader, Docx2txtLoader
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser

lc_llm = None
embeddings = None

if google_api_key:
    from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
    lc_llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=google_api_key,
        temperature=0.2,
        convert_system_message_to_human=True,
    )
    embeddings = GoogleGenerativeAIEmbeddings(
        model="models/embedding-001",
        google_api_key=google_api_key
    )
    print("LangChain LLM + Embeddings ready.")

parser = PydanticOutputParser(pydantic_object=Quiz)

# ── Helpers ───────────────────────────────────────────────────────────────────
def extract_question_count(prompt: str, default: int) -> int:
    """Extract number of questions from prompt text using regex."""
    try:
        numbers = re.findall(r'\d+', prompt)
        if numbers:
            val = int(numbers[0])
            return val if 1 <= val <= 50 else default
    except Exception:
        pass
    return default


def extract_json(text: str) -> dict:
    """
    Robustly extract a JSON object from LLM response.
    Handles:
      - <thinking>...</thinking> blocks (gemini-2.5-flash)
      - ```json ... ``` markdown fences
      - Extra text before/after the JSON object
    """
    # 1. Strip thinking blocks
    text = re.sub(r'<thinking>[\s\S]*?</thinking>', '', text, flags=re.IGNORECASE)
    # 2. Strip markdown fences
    text = re.sub(r'```(?:json)?\s*', '', text)
    text = text.replace('```', '').strip()
    # 3. Find outermost { ... } using brace matching
    start = text.find('{')
    if start == -1:
        raise ValueError("No JSON object in response")
    depth, end = 0, -1
    for i, ch in enumerate(text[start:], start):
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                end = i
                break
    if end == -1:
        raise ValueError("JSON not properly closed")
    return json.loads(text[start:end + 1])


def normalise_questions(raw_questions: list) -> List[Question]:
    """Convert raw dicts from LLM JSON into validated Question objects."""
    result = []
    for q in raw_questions:
        try:
            reframe_data = q.get("reframe", {})
            result.append(Question(
                question=str(q.get("question", "")).strip(),
                type=str(q.get("type", "scq")),
                options=q.get("options", []),
                correctAnswer=str(q.get("correctAnswer", "")),
                correctAnswerOption=str(q.get("correctAnswerOption", "A")),
                context=str(q.get("context", "")),
                explanation=str(q.get("explanation", "")),
                difficulty=float(q.get("difficulty", 0.5)),
                sub_topics=q.get("sub_topics", []),
                reframe=Reframe(**reframe_data) if isinstance(reframe_data, dict) else Reframe(),
            ))
        except Exception as e:
            print(f"  Skipping malformed question: {e}")
    return result


def format_docs(docs):
    return "\n\n".join(d.page_content for d in docs)


def load_documents(local_file_path: str):
    ext = local_file_path.lower()
    if ext.endswith(".pdf"):
        return PyPDFLoader(file_path=local_file_path).load()
    elif ext.endswith(".docx"):
        return Docx2txtLoader(file_path=local_file_path).load()
    else:
        return TextLoader(file_path=local_file_path).load()


# ── PROMPT TEMPLATE (for LangChain RAG endpoint) ──────────────────────────────
QUIZ_PROMPT_TEMPLATE = ChatPromptTemplate.from_template("""
You are a world-class educational assessment expert. Generate EXACTLY {num_questions} high-quality MCQs.
Return ONLY valid JSON — no markdown, no code blocks, no explanation.

{{
  "title": "...",
  "questions": [
    {{
      "question": "...",
      "type": "scq",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctAnswer": "...",
      "correctAnswerOption": "A",
      "context": "...",
      "explanation": "...",
      "difficulty": 0.5,
      "sub_topics": ["...", "..."],
      "reframe": {{"reframe_qns": false, "reformed_qns": "", "reframe_options": false, "reformed_options": ""}}
    }}
  ]
}}

SOURCE CONTENT:
{context}

USER FOCUS:
{user_prompt}

JSON OUTPUT:""")


# ── /generate-quiz-from-prompt  (DIRECT GEMINI SDK — no LangChain) ────────────
@app.post('/generate-quiz-from-prompt')
async def generateFromPrompt(request: QuizRequest):
    """Generate quiz questions from a text prompt. Uses Gemini SDK directly."""
    if not request.prompt:
        return {"success": False, "error": "prompt is required"}

    if not gemini_model:
        return {"success": False, "error": "AI service not configured — API key missing."}

    total_questions = extract_question_count(request.prompt, request.num_questions)
    print(f"\nPrompt-only generation: {total_questions} Qs | topic: '{request.prompt}'")

    system_prompt = f"""You are an expert quiz generator. Create EXACTLY {total_questions} multiple-choice questions about: {request.prompt}

CRITICAL RULES:
- Return ONLY a single valid JSON object
- No markdown, no code fences, no preamble, no explanation
- Every question must have EXACTLY 4 options starting with A), B), C), D)

JSON FORMAT:
{{
  "title": "Quiz title here",
  "questions": [
    {{
      "question": "Question text?",
      "type": "scq",
      "options": ["A) First option", "B) Second option", "C) Third option", "D) Fourth option"],
      "correctAnswer": "First option",
      "correctAnswerOption": "A",
      "context": "Brief context or source",
      "explanation": "Why this answer is correct",
      "difficulty": 0.5,
      "sub_topics": ["topic1", "topic2"],
      "reframe": {{"reframe_qns": false, "reformed_qns": "", "reframe_options": false, "reformed_options": ""}}
    }}
  ]
}}"""

    for attempt in range(3):
        try:
            print(f"  Attempt {attempt + 1}/3 — calling Gemini...")
            response = gemini_model.generate_content(system_prompt)
            raw = response.text
            print(f"  Response: {len(raw)} chars")

            parsed = extract_json(raw)
            questions = normalise_questions(parsed.get("questions", []))
            title = parsed.get("title", "Generated Quiz")

            if questions:
                quiz = Quiz(title=title, questions=questions[:total_questions])
                result = quiz.model_dump()
                print(f"  SUCCESS — {len(result['questions'])} questions generated.")
                return {"success": True, **result}
            else:
                print(f"  No questions parsed from response. Retrying...")
        except Exception as e:
            print(f"  Attempt {attempt + 1} failed: {type(e).__name__}: {e}")

    return {"success": False, "error": "Failed to generate any questions after multiple attempts."}


# ── /generate-quiz  (FILE-BASED RAG via LangChain) ────────────────────────────
@app.post('/generate-quiz')
async def generateChain(request: QuizRequest):
    """Generate quiz from an uploaded file using RAG pipeline."""
    if not request.file_path:
        return {"success": False, "error": "file_path is required. Use /generate-quiz-from-prompt for text-only generation."}

    if not lc_llm or not embeddings:
        return {"success": False, "error": "AI service not configured — API key missing."}

    # Resolve file path
    file_path = request.file_path
    local_file_path = ""
    if os.path.isabs(file_path) and os.path.exists(file_path):
        local_file_path = file_path
    elif os.path.exists(file_path):
        local_file_path = file_path
    else:
        candidates = [
            os.path.abspath(os.path.join(os.getcwd(), "..", "src", "backend", file_path)),
            os.path.abspath(os.path.join(os.getcwd(), "..", "src", "backend", "uploads", os.path.basename(file_path))),
        ]
        for p in candidates:
            if os.path.exists(p):
                local_file_path = p
                break
        if not local_file_path:
            return {"success": False, "error": f"File not found: {file_path}"}

    # Load & index
    try:
        documents = load_documents(local_file_path)
    except Exception as e:
        return {"success": False, "error": f"Failed to load document: {e}"}

    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    texts = splitter.split_documents(documents)
    collection_name = f"quiz_{uuid.uuid4().hex[:8]}"

    vectorDb = Chroma.from_documents(documents=texts, embedding=embeddings, collection_name=collection_name)
    retriever = vectorDb.as_retriever(search_kwargs={"k": 6})

    total_questions = extract_question_count(request.prompt, request.num_questions)
    context_docs = format_docs(retriever.invoke(request.prompt or "quiz questions"))

    prompt_text = QUIZ_PROMPT_TEMPLATE.format(
        num_questions=total_questions,
        context=context_docs,
        user_prompt=request.prompt or "Generate comprehensive questions"
    )

    all_questions = []
    title = None

    for attempt in range(3):
        try:
            print(f"  RAG attempt {attempt + 1}/3...")
            result = lc_llm.invoke(prompt_text)
            raw = result.content if hasattr(result, 'content') else str(result)
            parsed = extract_json(raw)
            questions = normalise_questions(parsed.get("questions", []))
            if not title:
                title = parsed.get("title", "Generated Quiz")
            if questions:
                all_questions = questions
                break
        except Exception as e:
            print(f"  RAG attempt {attempt + 1} failed: {e}")

    try:
        vectorDb.delete_collection()
    except Exception:
        pass

    if not all_questions:
        return {"success": False, "error": "Failed to generate any questions after multiple attempts."}

    quiz = Quiz(title=title or "Generated Quiz", questions=all_questions[:total_questions])
    result = quiz.model_dump()
    print(f"Done. {len(result['questions'])} questions generated from file.")
    return {"success": True, **result}


# ── /upload  (file upload endpoint) ──────────────────────────────────────────
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a PDF/DOCX/TXT file for quiz generation."""
    upload_dir = os.path.join(os.getcwd(), "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    safe_name = f"{uuid.uuid4().hex}_{file.filename}"
    dest = os.path.join(upload_dir, safe_name)
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return {"success": True, "file_path": dest, "filename": file.filename}


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "gemini": gemini_model is not None}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
