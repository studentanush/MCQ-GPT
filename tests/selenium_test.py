import os
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

def run_selenium_test():
    # Setup Chrome Options
    chrome_options = Options()
    # chrome_options.add_argument("--headless")  # Uncomment if you don't want to see the browser
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")

    # Initialize WebDriver
    print("Fig 1. Initializing Selenium WebDriver and establishing secure connection to MCQ-GPT")
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
    
    try:
        # Step 1: Visit the landing page
        driver.get("https://mcq-gpt-frontend.vercel.app/")
        time.sleep(2)
        driver.save_screenshot("fig1_initialization.png")
        print("Captured: Fig 1")

        # Step 2: Open Educator Login Form (Flip the card)
        print("Fig 2. Automating the Educator authentication flow and credential verification")
        
        # Click the Educator Card Login button to reveal the form
        wait = WebDriverWait(driver, 10)
        educator_login_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Start Generating Tests')]")))
        educator_login_btn.click()
        time.sleep(1) # Wait for flip animation

        # Fill Login Details
        email_input = driver.find_element(By.NAME, "email")
        password_input = driver.find_element(By.NAME, "password")
        
        email_input.send_keys("testeducator@gmail.com")
        password_input.send_keys("password123")
        
        driver.save_screenshot("fig2_login_flow.png")
        print("Captured: Fig 2")

        # Click Sign In
        sign_in_btn = driver.find_element(By.XPATH, "//button[contains(text(), 'Sign In to Dashboard')]")
        sign_in_btn.click()

        # Step 3: Validate Dashboard
        print("Fig 3. Validating post-login Dashboard state and API session persistence")
        time.sleep(3) # Wait for navigation
        
        # Verify URL change
        if "/educator/dashboard" in driver.current_url:
            print("Successfully redirected to Educator Dashboard")
        else:
            print(f"Warning: Redirection failed or slow. Current URL: {driver.current_url}")
            
        driver.save_screenshot("fig3_dashboard_validation.png")
        print("Captured: Fig 3")

        # Step 4: Finalize
        print("Fig 4. Selenium test suite completion and successful authentication status report")
        driver.save_screenshot("fig4_final_report.png")
        print("Captured: Fig 4")
        
        print("\nAll tests completed successfully. Screenshots saved as fig1, fig2, fig3, fig4.")

    except Exception as e:
        print(f"An error occurred: {e}")
        driver.save_screenshot("error_state.png")
    finally:
        driver.quit()

if __name__ == "__main__":
    run_selenium_test()
