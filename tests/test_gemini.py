import os
os.environ['GOOGLE_API_KEY'] = 'AIzaSyBCrzFDX55xP3NJaiBdXsyNquiVF4rYXlA'
from server import llm, parser
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
    {'num_questions': lambda x: x, 'user_prompt': lambda x: 'Python data types'}
    | prompt_only_template
    | llm
    | parser
)

try:
    print('Testing...')
    res = chain.invoke(2)
    print('SUCCESS')
except Exception as e:
    import traceback
    traceback.print_exc()
