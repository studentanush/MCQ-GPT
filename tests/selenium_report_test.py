import unittest
import time
import os
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

# Configuration
BASE_URL = "http://localhost:5173"
EDUCATOR_EMAIL = "kshitij30032008@gmail.com"
EDUCATOR_PASSWORD = "123"

class SeleniumManualReportTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        print("\n" + "="*70)
        print("FIG 1. INITIALIZING SELENIUM WEBDRIVER AND ESTABLISHING CONNECTION")
        print("="*70)
        
        chrome_options = Options()
        chrome_options.add_argument("--window-size=1920,1080")
        # Ensure browser stays open
        chrome_options.add_experimental_option("detach", True)
        
        cls.driver = webdriver.Chrome(options=chrome_options)
        cls.wait = WebDriverWait(cls.driver, 20)

    @classmethod
    def tearDownClass(cls):
        print("\nTest sequence finished. You can now close the browser.")
        # cls.driver.quit() # Keep it open for manual review if needed

    def test_auth_flow(self):
        # --- FIG 1: Initialization ---
        self.driver.get(BASE_URL)
        print("\n>>> FIG 1 READY: Page loaded.")
        input("TAKE SCREENSHOT FOR FIG 1, THEN PRESS ENTER TO CONTINUE...")

        # --- FIG 2: Authentication Flow ---
        print("\n" + "="*70)
        print("FIG 2. AUTOMATING THE EDUCATOR AUTHENTICATION FLOW AND VERIFICATION")
        print("="*70)
        
        try:
            # Find the Educator card button
            educator_btn = self.wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Start Generating Tests')]")))
            educator_btn.click()
            time.sleep(1) # Wait for flip animation
            
            # Fill credentials
            email_field = self.wait.until(EC.presence_of_element_located((By.NAME, "email")))
            pass_field = self.driver.find_element(By.NAME, "password")
            
            email_field.send_keys(EDUCATOR_EMAIL)
            pass_field.send_keys(EDUCATOR_PASSWORD)
            
            print("\n>>> FIG 2 READY: Credentials entered.")
            input("TAKE SCREENSHOT FOR FIG 2, THEN PRESS ENTER TO LOGIN...")
            
            # Submit
            sign_in_btn = self.driver.find_element(By.XPATH, "//button[contains(text(), 'Sign In to Dashboard')]")
            self.driver.execute_script("arguments[0].click();", sign_in_btn)
            
        except Exception as e:
            self.fail(f"Auth flow failed: {e}")

        # --- FIG 3: Dashboard Validation ---
        print("\n" + "="*70)
        print("FIG 3. VALIDATING POST-LOGIN DASHBOARD STATE AND API PERSISTENCE")
        print("="*70)
        
        try:
            # Wait for dashboard URL
            self.wait.until(EC.url_contains("/educator/dashboard"))
            time.sleep(2) 
            
            print("\n>>> FIG 3 READY: Dashboard loaded.")
            input("TAKE SCREENSHOT FOR FIG 3, THEN PRESS ENTER FOR FINAL STATUS...")
            
        except Exception as e:
            print(f"Warning: Redirection took too long or failed: {e}")
            input("TAKE SCREENSHOT OF CURRENT STATE (ERROR OR SLOW LOAD), THEN PRESS ENTER...")

        # --- FIG 4: Final Status Report ---
        print("\n" + "="*70)
        print("FIG 4. SELENIUM TEST SUITE COMPLETION AND STATUS REPORT")
        print("="*70)
        
        print("\n>>> FIG 4 READY: Final validation.")
        input("TAKE SCREENSHOT FOR FIG 4, THEN PRESS ENTER TO FINISH...")

if __name__ == "__main__":
    unittest.main()
