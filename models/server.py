from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.document_loaders import PyPDFLoader, TextLoader, Docx2txtLoader
# Conditional Google imports moved below
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
from typing import List, Optional
from langchain_core.output_parsers import PydanticOutputParser
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from speakerLLM import speakUp
import os
import re
import shutil
import uuid
from dotenv import load_dotenv

# Load the backend .env file so Python gets the exact same API key as Node
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src", "backend", ".env")
load_dotenv(env_path)

app = FastAPI()

# Update CORS for production
allowed_origins = os.getenv("ALLOWED_ORIGIN", "http://localhost:3000,http://localhost:5173,http://localhost:5174").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Pydantic Models ────────────────────────────────────────────────────────────
class Reframe(BaseModel):
    reframe_qns: bool = False
    reformed_qns: str = ""
    reframe_options: bool = False
    reformed_options: str = ""

class Question(BaseModel):
    question: str = Field(description="The question text")
    type: str = Field(description="Question type: scq, mcq, or ve")
    options: List[str] = Field(description="4 options as ['A) ...', 'B) ...', 'C) ...', 'D) ...']")
    correctAnswer: str = Field(description="Full text of correct answer")
    correctAnswerOption: str = Field(description="Letter only: A, B, C, or D")
    context: str = Field(description="Source excerpt under 100 chars")
    explanation: str = Field(description="Why this answer is correct")
    difficulty: float = Field(description="Difficulty from -2.0 to 2.0, decimals allowed")
    sub_topics: List[str] = Field(description="2-3 relevant subtopics")
    reframe: Reframe = Field(default_factory=Reframe)

class Quiz(BaseModel):
    title: str = Field(description="Concise title (3-8 words)")
    questions: List[Question] = Field(description="Array of question objects")

parser = PydanticOutputParser(pydantic_object=Quiz)

# ─── LLM & Embeddings (loaded once at startup) ──────────────────────────────────
# Choose LLM based on environment — checks both GOOGLE_API_KEY and API_KEY
google_api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("API_KEY")

if google_api_key:
    # CLOUD MODE: Use Gemini 1.5 Flash (Perfect for Render/Vercel)
    print("Initialize Cloud LLM (Gemini)...")
    from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings, HarmCategory, HarmBlockThreshold
    
    # Disable most safety filters to prevent educational content from being blocked
    safety_settings = {
        HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
        HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
    }

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=google_api_key,
        temperature=0.2, # Slight increase for better question variety
        convert_system_message_to_human=True,
        safety_settings=safety_settings
    )
else:
    # LOCAL MODE: Use Ollama
    from langchain_ollama import ChatOllama
    print("Initialize Local LLM (Ollama)...")
    llm = ChatOllama(
        model="llama3.2:3b",
        temperature=0,
        format="json",
        num_predict=4096,
        num_ctx=2048
    )

if google_api_key:
    print("Initializing Cloud Embedding model (Google)...")
    from langchain_google_genai import GoogleGenerativeAIEmbeddings
    embeddings = GoogleGenerativeAIEmbeddings(
        model="models/embedding-001",
        google_api_key=google_api_key
    )
else:
    from langchain_community.embeddings import HuggingFaceEmbeddings
    print("Initializing Local Embedding model (HuggingFace)...")
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

print("Embedding model ready.")

# ─── Helpers ─────────────────────────────────────────────────────────────────────
def format_docs(docs):
    return "\n\n".join(d.page_content for d in docs)

def extract_question_count(prompt: str, default: int) -> int:
    """Extract number of questions using regex instead of LLM to save time."""
    try:
        numbers = re.findall(r'\d+', prompt)
        if numbers:
            val = int(numbers[0])
            return val if 1 <= val <= 50 else default
    except:
        pass
    return default

QUIZ_PROMPT_TEMPLATE = ChatPromptTemplate.from_template("""
You are a world-class educational assessment expert. Your task is to generate high-quality, pedagogically sound multiple-choice questions for the MCQ-GPT platform.

Create EXACTLY {num_questions} questions based on the provided content.

### QUALITY GUIDELINES:
1. **Diverse Difficulty**: Distribute questions across different cognitive levels (Recall, Application, Analysis).
2. **Clear Distractors**: Ensure the 3 incorrect options (distractors) are plausible but clearly incorrect to an expert.
3. **Actionable Explanations**: Provide detailed explanations that teach the concept behind the correct answer.
4. **Unique Context**: For each question, extract a small snippet from the source that supports the answer.
5. **No Truncation**: Output MUST be complete, valid JSON.

### DATA STRUCTURE:
- title: A professional, catchy title summarising the source content (3-8 words).
- questions: Array of EXACTLY {num_questions} objects.

Each question object:
- question: The actual MCQ question text.
- type: "scq" (single correct).
- options: Exactly 4 options starting with "A) ", "B) ", etc.
- correctAnswer: The full text of the correct answer (excluding the letter prefix).
- correctAnswerOption: The letter (A, B, C, or D).
- context: The specific sentence or phrase from the source that contains the answer.
- explanation: A clear 1-2 sentence explanation.
- difficulty: A decimal between -2.0 (v. easy) and 2.0 (v. hard). Use 0.0 for average difficulty.
- sub_topics: 2-3 specific keywords.
- reframe: {{"reframe_qns": false, "reformed_qns": "", "reframe_options": false, "reformed_options": ""}}

### JSON FORMAT (RETURN ONLY THIS):
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

USER FOCUS (Prioritize this if provided):
{user_prompt}

JSON OUTPUT:""")


def build_quiz_generator(retriever, user_prompt: str):
    """Build a LangChain chain that uses the retriever and injects the user prompt."""
    return (
        {
            "context": lambda num_q: format_docs(retriever.invoke(user_prompt or "quiz questions")),
            "num_questions": lambda num_q: num_q,
            "user_prompt": lambda num_q: user_prompt or "Generate comprehensive questions",
        }
        | QUIZ_PROMPT_TEMPLATE
        | llm
        | parser
    )

# ─── Request Schema ───────────────────────────────────────────────────────────────
class QuizRequest(BaseModel):
    prompt: str
    file_path: Optional[str] = None
    num_questions: int = 5

# ─── Generation helpers ───────────────────────────────────────────────────────────
def load_documents(local_file_path: str):
    ext = local_file_path.lower()
    if ext.endswith(".pdf"):
        return PyPDFLoader(file_path=local_file_path).load()
    elif ext.endswith(".docx"):
        return Docx2txtLoader(file_path=local_file_path).load()
    else:
        return TextLoader(file_path=local_file_path).load()


def run_batch_generation(quiz_generator, total_questions: int) -> tuple[list, str | None]:
    batch_size = 5
    all_questions = []
    title = None

    batches = (total_questions + batch_size - 1) // batch_size
    for batch_num in range(batches):
        remaining = total_questions - len(all_questions)
        current_size = min(batch_size, remaining)
        print(f"Batch {batch_num + 1}/{batches}: Generating {current_size} questions...")

        for attempt in range(3):
            try:
                batch_quiz = quiz_generator.invoke(current_size)
                valid_questions = [
                    q for q in batch_quiz.questions
                    if all(hasattr(q, field) for field in ['difficulty', 'sub_topics'])
                ]
                if len(valid_questions) >= current_size:
                    all_questions.extend(valid_questions[:current_size])
                    if not title:
                        title = batch_quiz.title
                    print(f"Got {current_size} questions (Total: {len(all_questions)})")
                    break
                else:
                    print(f"Only {len(valid_questions)}/{current_size} complete. Retry {attempt + 1}/3")
            except Exception as e:
                print(f"Attempt {attempt + 1} failed: {e}")

        if len(all_questions) >= total_questions:
            break

    return all_questions, title


# ─── /generate-quiz — file-based RAG ─────────────────────────────────────────────
@app.post('/generate-quiz')
async def generateChain(request: QuizRequest):
    prompt = request.prompt
    file_path = request.file_path
    num_questions = request.num_questions

    # ── Resolve file path ───────────────────────────────────────────────────────
    if not file_path:
        return {"success": False, "error": "file_path is required for this endpoint. Use /generate-quiz-from-prompt for prompt-only generation."}

    local_file_path = ""
    if os.path.isabs(file_path) and os.path.exists(file_path):
        local_file_path = file_path
    elif os.path.exists(file_path):
        local_file_path = file_path
    else:
        possible_paths = [
            os.path.abspath(os.path.join(os.getcwd(), "..", "src", "backend", file_path)),
            os.path.abspath(os.path.join(os.getcwd(), "..", "src", "backend", "uploads", os.path.basename(file_path))),
            os.path.abspath(os.path.join(os.getcwd(), "..", "backend", file_path)),
        ]
        for p in possible_paths:
            if os.path.exists(p):
                local_file_path = p
                break

        if not local_file_path:
            print(f"ERROR: Could not find file. Attempted paths: {possible_paths}")
            return {"success": False, "error": f"File not found: {file_path}. Tried: {possible_paths}"}

    print(f"Loading file: {local_file_path}")

    # ── Load & index documents ──────────────────────────────────────────────────
    try:
        documents = load_documents(local_file_path)
    except Exception as e:
        return {"success": False, "error": f"Failed to load document: {str(e)}"}

    print(f"Processing {len(documents)} document pages...")
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    texts = text_splitter.split_documents(documents)

    # Use a unique collection per request to avoid state bleed
    collection_name = f"quiz_{uuid.uuid4().hex[:8]}"
    vectorDb = Chroma.from_documents(
        documents=texts,
        embedding=embeddings,
        collection_name=collection_name,
    )
    retriever = vectorDb.as_retriever(search_kwargs={"k": 6})

    # ── Detect question count from prompt ───────────────────────────────────────
    total_questions = extract_question_count(prompt, num_questions)

    if total_questions < 1:
        total_questions = num_questions

    if total_questions < 1:
        return {"success": False, "error": "Could not identify a valid number of questions from the prompt."}

    quiz_generator = build_quiz_generator(retriever, prompt)
    all_questions, title = run_batch_generation(quiz_generator, total_questions)

    if not all_questions:
        return {"success": False, "error": "Failed to generate any questions after multiple attempts."}

    quiz = Quiz(
        title=title or "Generated Quiz",
        questions=all_questions[:total_questions]
    )
    quiz_json = quiz.model_dump()
    print(f"Done. {len(quiz_json['questions'])} questions generated.")

    # Clean up in-memory collection
    try:
        vectorDb.delete_collection()
    except Exception:
        pass

    return {"success": True, **quiz_json}


# ─── /generate-quiz-from-prompt — prompt-only (no file) ──────────────────────────
@app.post('/generate-quiz-from-prompt')
async def generateFromPrompt(request: QuizRequest):
    """Generate quiz questions using only a text prompt (no document needed)."""
    prompt = request.prompt
    num_questions = request.num_questions

    if not prompt:
        return {"success": False, "error": "prompt is required"}

    # Detect question count from prompt if not explicit
    total_questions = extract_question_count(prompt, num_questions)

    print(f"Prompt-only generation: {total_questions} questions on topic: '{prompt}'")

    # Use the prompt as the sole context document
    from langchain_core.documents import Document
    from langchain_core.prompts import ChatPromptTemplate as CPT

    prompt_only_template = CPT.from_template("""
You are an expert quiz generator. Create EXACTLY {num_questions} questions about the following topic/instruction.

CRITICAL: Output complete, valid JSON. DO NOT truncate.

Return ONLY valid JSON (no markdown, no code blocks):

{{
  "title": "...",
  "time": "",
  "status": "",
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

TOPIC / INSTRUCTION: {user_prompt}

JSON OUTPUT:""")

    chain = (
        {
            "num_questions": lambda x: x,
            "user_prompt": lambda x: prompt,
        }
        | prompt_only_template
        | llm
        | parser
    )

    batch_size = 5
    all_questions = []
    title = None
    batches = (total_questions + batch_size - 1) // batch_size

    for batch_num in range(batches):
        remaining = total_questions - len(all_questions)
        current_size = min(batch_size, remaining)
        print(f"Batch {batch_num + 1}/{batches}: Generating {current_size} questions...")

        for attempt in range(3):
            try:
                batch_quiz = chain.invoke(current_size)
                valid_questions = [
                    q for q in batch_quiz.questions
                    if all(hasattr(q, field) for field in ['difficulty', 'sub_topics'])
                ]
                if len(valid_questions) >= current_size:
                    all_questions.extend(valid_questions[:current_size])
                    if not title:
                        title = batch_quiz.title
                    print(f"Got {current_size} questions (Total: {len(all_questions)})")
                    break
                else:
                    print(f"Only {len(valid_questions)}/{current_size}. Retry {attempt + 1}/3")
            except Exception as e:
                print(f"Attempt {attempt + 1} failed: {e}")

        if len(all_questions) >= total_questions:
            break

    if not all_questions:
        return {"success": False, "error": "Failed to generate any questions after multiple attempts."}

    quiz = Quiz(
        title=title or "Generated Quiz",
        questions=all_questions[:total_questions]
    )
    quiz_json = quiz.model_dump()
    print(f"Done. {len(quiz_json['questions'])} questions generated.")
    return {"success": True, **quiz_json}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
