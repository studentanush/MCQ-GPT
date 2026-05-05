import requests
import json
import os
import time

def test_rag():
    url = "http://127.0.0.1:5000/generate-quiz"
    file_path = os.path.abspath("test_document.txt")
    
    payload = {
        "prompt": "Apollo 11 mission details",
        "file_path": file_path,
        "num_questions": 3
    }
    
    print(f"Testing RAG with file: {file_path}")
    print("Sending request to Python server...")
    
    try:
        start_time = time.time()
        response = requests.post(url, json=payload, timeout=60)
        end_time = time.time()
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print("\n[SUCCESS] RAG Pipeline Working Successfully!")
                print(f"Response Time: {round(end_time - start_time, 2)}s")
                print("\nGenerated Quiz Title:", data.get("title"))
                print("\nQuestions:")
                for i, q in enumerate(data.get("questions", []), 1):
                    print(f"{i}. {q.get('question')}")
                    print(f"   Correct Answer: {q.get('correctAnswer')}")
                    print(f"   Explanation: {q.get('explanation')[:100]}...")
            else:
                print("\n[FAILURE] Server returned success=False")
                print("Error:", data.get("error"))
        else:
            print(f"\n[ERROR] Server error (Status: {response.status_code})")
            print("Response:", response.text)
            
    except requests.exceptions.ConnectionError:
        print("\n[ERROR] Connection Error: Is the Python server running on port 5000?")

    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")

if __name__ == "__main__":
    test_rag()
