"""
MCQ-GPT Expanded Frontend Selenium Test Suite
================================================
A comprehensive test suite covering:
1. Landing & Authentication
2. AI Quiz Generation (Chat)
3. Live Hosting Flow
"""

import unittest
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

# Configuration
BASE_URL = "http://localhost:5173"
EDUCATOR_EMAIL = "anush@gmail.com"
EDUCATOR_PASSWORD = "123"

def get_driver():
    options = Options()
    options.add_argument("--window-size=1280,800")
    # Keeps browser open after script finishes
    options.add_experimental_option("detach", True)
    return webdriver.Chrome(options=options)

class TestFullFlow(unittest.TestCase):
    def setUp(self):
        self.driver = get_driver()
        self.wait = WebDriverWait(self.driver, 20)

    def test_complete_platform_flow(self):
        """Test authentication, quiz generation, and live hosting."""
        
        # --- STEP 1: LANDING PAGE ---
        print("\n--- STEP 1: LOADING LANDING PAGE ---")
        self.driver.get(BASE_URL)
        time.sleep(1)
        self.assertIn("MCQ", self.driver.title.upper() or self.driver.page_source.upper())
        print("✅ Landing page loaded")
        input("TAKE FIG 1 SCREENSHOT (Landing Page), THEN PRESS ENTER...")

        # --- STEP 2: LOGIN ---
        print("\n--- STEP 2: PERFORMING LOGIN ---")
        educator_btn = self.wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Start Generating Tests')]")))
        educator_btn.click()
        time.sleep(1) 

        email_field = self.wait.until(EC.presence_of_element_located((By.NAME, "email")))
        pass_field = self.driver.find_element(By.NAME, "password")
        email_field.send_keys(EDUCATOR_EMAIL)
        pass_field.send_keys(EDUCATOR_PASSWORD)
        
        print(f"✅ Credentials entered for {EDUCATOR_EMAIL}")
        input("TAKE FIG 2 SCREENSHOT (Login Form), THEN PRESS ENTER TO SIGN IN...")

        submit_btn = self.driver.find_element(By.XPATH, "//button[contains(text(), 'Sign In to Dashboard')]")
        self.driver.execute_script("arguments[0].click();", submit_btn)

        # --- STEP 3: DASHBOARD & NAVIGATION ---
        print("\n--- STEP 3: VERIFYING DASHBOARD & NAVIGATION ---")
        self.wait.until(EC.url_contains("/educator/dashboard"))
        print("✅ Redirected to Educator Dashboard")
        input("TAKE FIG 3 SCREENSHOT (Dashboard), THEN PRESS ENTER TO START QUIZ GENERATION...")

        # --- STEP 4: AI QUIZ GENERATION ---
        print("\n--- STEP 4: AI QUIZ GENERATION (CHAT) ---")
        self.driver.get(f"{BASE_URL}/educator/chat")
        
        chat_input = self.wait.until(EC.presence_of_element_located((By.XPATH, "//input[@placeholder='Upload a doc or a text prompt']")))
        chat_input.send_keys("Generate a 5 question quiz on Python Basics")
        
        print("✅ Quiz prompt entered")
        input("TAKE FIG 4 SCREENSHOT (Chat Prompt), THEN PRESS ENTER TO GENERATE...")
        
        send_btn = self.driver.find_element(By.XPATH, "//button[contains(@class, 'bg-linear-to-r')]")
        self.driver.execute_script("arguments[0].click();", send_btn)
        
        print("⏳ Waiting for AI generation (this may take 10-20 seconds)...")
        # Wait for the success message or the quiz title to appear
        self.wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Successfully generated')]")))
        
        print("✅ Quiz generated successfully!")
        input("TAKE FIG 5 SCREENSHOT (Generated Quiz), THEN PRESS ENTER TO GO TO LIVE HOSTING...")

        # --- STEP 5: LIVE HOSTING ---
        print("\n--- STEP 5: LIVE HOSTING FLOW ---")
        self.driver.get(f"{BASE_URL}/educator/dashboard")
        time.sleep(2) # Wait for recent quizzes to load
        
        # Find the first "Host Live" button (broadcast tower icon)
        try:
            host_btn = self.wait.until(EC.element_to_be_clickable((By.XPATH, "//button[@title='Host Live']")))
            self.driver.execute_script("arguments[0].click();", host_btn)
            
            self.wait.until(EC.url_contains("/educator/live-quiz/"))
            print("✅ Entered Live Hosting session")
            input("TAKE FIG 6 SCREENSHOT (Live Hosting Session), THEN PRESS ENTER TO FINISH...")
        except:
            print("⚠️ Could not find a quiz to host. Ensure you have saved at least one quiz.")
            input("PRESS ENTER TO FINISH...")

if __name__ == "__main__":
    unittest.main()
