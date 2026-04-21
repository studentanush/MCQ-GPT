"""Quick end-to-end API test for MCQ-GPT quiz generation pipeline."""
import urllib.request
import json
import sys

BASE_PYTHON = "http://localhost:8000"
BASE_NODE   = "http://localhost:5000"

def post(url, payload, timeout=120):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data,
          headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return json.loads(res.read())

# ── Test 1: Python server health ────────────────────────────────────────────
print("=== TEST 1: Python Server Health ===")
try:
    urllib.request.urlopen(f"{BASE_PYTHON}/docs", timeout=5)
    print("PASS  Python server (port 8000) is UP")
except Exception as e:
    print(f"FAIL  Python server DOWN: {e}")

# ── Test 2: Node backend health ──────────────────────────────────────────────
print()
print("=== TEST 2: Node Backend Health ===")
try:
    urllib.request.urlopen(f"{BASE_NODE}", timeout=5)
    print("PASS  Node backend (port 5000) is UP")
except Exception as e:
    code = str(e)
    if any(c in code for c in ["401", "404", "400", "403"]):
        print("PASS  Node backend (port 5000) is UP (expected HTTP error)")
    else:
        print(f"FAIL  Node backend DOWN: {e}")

# ── Test 3: Prompt-only generation ──────────────────────────────────────────
print()
print("=== TEST 3: Prompt-based generation (5 questions on Python) ===")
try:
    result = post(f"{BASE_PYTHON}/generate-quiz-from-prompt",
                  {"prompt": "Python variables and data types", "num_questions": 5})
    if result.get("success"):
        qs = result.get("questions", [])
        title = result.get("title", "N/A")
        print(f"PASS  Generated {len(qs)} questions | Title: {title}")
        if qs:
            print(f"      Sample Q: {qs[0]['question'][:90]}")
    else:
        print(f"FAIL  Python service error: {result.get('error')}")
except Exception as e:
    print(f"FAIL  {type(e).__name__}: {e}")

# ── Test 4: Login & get JWT token ────────────────────────────────────────────
print()
print("=== TEST 4: Educator Login via Node (/api/auth/login) ===")
TOKEN = None
try:
    result = post(f"{BASE_NODE}/api/auth/login",
                  {"email": "kshitij30032008@gmail.com", "password": "123"})
    TOKEN = result.get("token")
    role  = result.get("user", {}).get("role", "?")
    if TOKEN:
        print(f"PASS  Logged in as {role} | Token: {TOKEN[:20]}...")
    else:
        print(f"FAIL  No token in response: {result}")
except Exception as e:
    print(f"FAIL  {type(e).__name__}: {e}")

# ── Test 5: Node → Python bridge (generate-from-prompt) ──────────────────────
print()
print("=== TEST 5: Node bridge /api/quizzes/generate-from-prompt (10 Qs) ===")
if TOKEN:
    try:
        data = json.dumps({"prompt": "JavaScript closures and async/await", "num_questions": 10}).encode()
        req = urllib.request.Request(
            f"{BASE_NODE}/api/quizzes/generate-from-prompt",
            data=data,
            headers={"Content-Type": "application/json", "Authorization": TOKEN},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=120) as res:
            result = json.loads(res.read())
        if result.get("success"):
            quiz = result.get("quiz", {})
            qs_count = len(quiz.get("questions", []))
            print(f"PASS  Generated {qs_count} questions | Title: {quiz.get('title', 'N/A')}")
            if quiz.get("questions"):
                print(f"      Sample Q: {quiz['questions'][0]['question'][:90]}")
        else:
            print(f"FAIL  {result}")
    except Exception as e:
        print(f"FAIL  {type(e).__name__}: {e}")
else:
    print("SKIP  (no token from Test 4)")

print()
print("=== ALL TESTS DONE ===")
