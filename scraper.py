"""
Google Maps Review Scraper
A modern scraper to extract reviews from Google Maps listings
"""
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException, StaleElementReferenceException
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys
import time
import pandas as pd
import json
from datetime import datetime
import random

class GoogleMapsReviewScraper:
    def __init__(self, headless=True):
        """Initialize the scraper with Chrome WebDriver"""
        self.options = Options()
        
        if headless:
            self.options.add_argument('--headless')
        
        # Anti-detection measures
        self.options.add_argument('--disable-blink-features=AutomationControlled')
        self.options.add_argument('--no-sandbox')
        self.options.add_argument('--disable-dev-shm-usage')
        self.options.add_argument('--disable-gpu')
        self.options.add_argument('--window-size=1920,1080')
        self.options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        
        # Exclude automation flags
        self.options.add_experimental_option("excludeSwitches", ["enable-automation"])
        self.options.add_experimental_option('useAutomationExtension', False)
        
        self.driver = webdriver.Chrome(options=self.options)
        self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        self.wait = WebDriverWait(self.driver, 15)
        self.action = ActionChains(self.driver)
        
    def random_delay(self, min_sec=1, max_sec=3):
        """Add random delay to mimic human behavior"""
        time.sleep(random.uniform(min_sec, max_sec))
        
    def scroll_reviews(self, scrollable_div, max_reviews):
        """Scroll through reviews to load more with improved logic"""
        print("Starting scroll sequence...")
        last_height = self.driver.execute_script("return arguments[0].scrollHeight", scrollable_div)
        
        # We scroll until we have enough reviews or can't scroll anymore
        consecutive_no_change = 0
        
        while True:
            # Scroll to bottom of container
            self.driver.execute_script('arguments[0].scrollTop = arguments[0].scrollHeight', scrollable_div)
            self.random_delay(1.5, 2.5)
            
            # Check if we have enough reviews loaded in the DOM
            review_elements = self.driver.find_elements(By.CSS_SELECTOR, "div.jftiEf, div[data-review-id]")
            if len(review_elements) >= max_reviews:
                print(f"Loaded {len(review_elements)} reviews (Target: {max_reviews}). Stopping scroll.")
                break
                
            # Calculate new scroll height and compare with last scroll height
            new_height = self.driver.execute_script("return arguments[0].scrollHeight", scrollable_div)
            if new_height == last_height:
                consecutive_no_change += 1
                # Try to trigger load by moving mouse or small scroll up/down
                if consecutive_no_change >= 3:
                    print("No more content loading. Stopping scroll.")
                    break
            else:
                consecutive_no_change = 0
                last_height = new_height
                print(f"Scrolled... Total loaded: {len(review_elements)}")

    def expand_review_text(self):
        """Click 'More' buttons to expand truncated reviews"""
        try:
            # Look for buttons with text "More" or specific class
            more_buttons = self.driver.find_elements(By.XPATH, "//button[contains(@aria-label, 'See more') or contains(text(), 'More')]")
            print(f"Found {len(more_buttons)} 'More' buttons to expand")
            
            for button in more_buttons[:50]:
                try:
                    self.driver.execute_script("arguments[0].click();", button)
                    time.sleep(0.1)
                except:
                    pass
        except Exception as e:
            print(f"Error expanding reviews: {e}")

    def extract_reviews(self, url, max_reviews=100):
        """
        Extract reviews from a Google Maps place URL
        """
        print(f"Opening URL: {url}")
        self.driver.get(url)
        self.random_delay(3, 5)
        
        reviews = []
        
        try:
            # 1. Switch to Reviews tab
            try:
                # Try multiple selectors for the Reviews tab
                reviews_tab_selectors = [
                    "//button[contains(@aria-label, 'Reviews')]",
                    "//div[contains(text(), 'Reviews')]",
                    "//button[@data-tab-index='1']"
                ]
                
                for selector in reviews_tab_selectors:
                    try:
                        reviews_button = self.wait.until(EC.element_to_be_clickable((By.XPATH, selector)))
                        reviews_button.click()
                        print("Clicked Reviews tab")
                        self.random_delay(2, 3)
                        break
                    except:
                        continue
            except:
                print("Could not click reviews tab (might already be active)")
            
            # 2. Sort by Newest (Optional but good for consistency)
            try:
                sort_button = self.driver.find_element(By.XPATH, "//button[contains(@aria-label, 'Sort reviews')]")
                sort_button.click()
                self.random_delay(0.5, 1)
                newest_option = self.driver.find_element(By.XPATH, "//div[contains(@data-index, '1')]") # Usually 'Newest' is 2nd option
                newest_option.click()
                self.random_delay(2, 3)
                print("Sorted by Newest")
            except:
                print("Could not sort reviews (skipping)")

            # 3. Find Scrollable Container
            # This is the tricky part. It's usually a div with specific classes or the one containing the reviews.
            scrollable_div = None
            try:
                # Look for the container that has the reviews
                # The container usually has class 'm6QErb' and 'DxyBCb'
                scrollable_div = self.wait.until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, "div.m6QErb.DxyBCb.kA9KIf.dS8AEf"))
                )
            except:
                try:
                    # Fallback: Find the main role div
                    scrollable_div = self.driver.find_element(By.CSS_SELECTOR, "div[role='main'] > div > div:nth-child(2)")
                except:
                    print("Could not find scrollable container")
                    return []

            # 4. Scroll
            if scrollable_div:
                self.scroll_reviews(scrollable_div, max_reviews)
            
            # 5. Expand Text
            self.expand_review_text()
            
            # 6. Extract Data
            # Generic selector for review blocks
            review_elements = self.driver.find_elements(By.CSS_SELECTOR, "div.jftiEf, div[data-review-id]")
            print(f"Found {len(review_elements)} review elements. Extracting data...")
            
            for idx, review_elem in enumerate(review_elements[:max_reviews]):
                try:
                    review_data = {}
                    
                    # Helper to safely get text
                    def get_text(selector, elem=review_elem):
                        try:
                            return elem.find_element(By.CSS_SELECTOR, selector).text
                        except:
                            return ""

                    # Reviewer Name
                    review_data['reviewer_name'] = get_text("div.d4r55") or "N/A"
                    
                    # Rating
                    try:
                        rating_elem = review_elem.find_element(By.CSS_SELECTOR, "span.kvMYJc")
                        rating_str = rating_elem.get_attribute("aria-label") # "5 stars"
                        review_data['rating'] = rating_str.split()[0] if rating_str else "N/A"
                    except:
                        review_data['rating'] = "N/A"
                    
                    # Text
                    review_data['review_text'] = get_text("span.wiI7pd")
                    
                    # Date
                    review_data['review_date'] = get_text("span.rsqaWe")
                    
                    # Owner Response
                    try:
                        # Owner response is usually in a nested div with specific class
                        response_text = review_elem.find_element(By.XPATH, ".//div[contains(@class, 'C9QyIf')]//div[contains(@class, 'wiI7pd')]").text
                        review_data['owner_response'] = response_text
                    except:
                        review_data['owner_response'] = ""

                    review_data['scraped_at'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    reviews.append(review_data)
                    
                except StaleElementReferenceException:
                    continue
                except Exception as e:
                    # print(f"Error extracting review {idx}: {e}")
                    continue
            
            print(f"\nSuccessfully extracted {len(reviews)} reviews!")
            return reviews
            
        except Exception as e:
            print(f"Critical error during scraping: {e}")
            return reviews

    def close(self):
        """Close the browser"""
        try:
            self.driver.quit()
        except:
            pass
        print("Browser closed")
