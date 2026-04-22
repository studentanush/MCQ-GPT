"""Debug the actual exception during quiz generation."""
import os, sys, traceback
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src", "backend", ".env")
load_dotenv(env_path)

api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("API_KEY")
print(f"API Key found: {'YES (' + api_key[:10] + '...)' if api_key else 'NO'}")

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=api_key,
    temperature=0.2,
    convert_system_message_to_human=True,
)

prompt_template = ChatPromptTemplate.from_template("""
You are an expert quiz generator. Create EXACTLY {num_questions} multiple-choice questions about: {user_prompt}

Return ONLY valid JSON (no markdown, no code blocks, no explanation):
{{
  "title": "Short Quiz Title",
  "questions": [
    {{
      "question": "Question text here?",
      "type": "scq",
      "options": ["A) Option one", "B) Option two", "C) Option three", "D) Option four"],
      "correctAnswer": "Option one",
      "correctAnswerOption": "A",
      "context": "Brief context",
      "explanation": "Why this is correct",
      "difficulty": 0.5,
      "sub_topics": ["topic1", "topic2"],
      "reframe": {{"reframe_qns": false, "reformed_qns": "", "reframe_options": false, "reformed_options": ""}}
    }}
  ]
}}
""")

chain = prompt_template | llm

print("Calling Gemini...")
try:
    result = chain.invoke({"num_questions": 2, "user_prompt": "Python lists and tuples"})
    raw = result.content
    print("RAW RESPONSE (first 500 chars):")
    print(raw[:500])
    print("\n--- Trying JSON parse ---")
    import json, re
    cleaned = re.sub(r'^```(?:json)?\s*', '', raw.strip(), flags=re.MULTILINE)
    cleaned = re.sub(r'\s*```$', '', cleaned.strip(), flags=re.MULTILINE)
    parsed = json.loads(cleaned)
    print(f"SUCCESS! Got {len(parsed.get('questions', []))} questions")
    print(f"Title: {parsed.get('title')}")
    if parsed.get('questions'):
        print(f"First Q: {parsed['questions'][0]['question'][:80]}")
except Exception as e:
    print("EXCEPTION:")
    traceback.print_exc()
