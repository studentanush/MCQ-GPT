import os
import google.generativeai as genai
from dotenv import load_dotenv

_local_env = os.path.join("src", "backend", ".env")
load_dotenv(_local_env)

api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("API_KEY")
genai.configure(api_key=api_key)

print("Available models supporting embeddings:")
for m in genai.list_models():
    if 'embedContent' in m.supported_generation_methods:
        print(f"- {m.name}")
