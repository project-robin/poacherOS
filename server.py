from flask import Flask, request, jsonify
from flask_cors import CORS
from scraper import GoogleMapsReviewScraper
import traceback

app = Flask(__name__)
CORS(app)

@app.route('/', methods=['GET'])
def health_check():
    return jsonify({"status": "running", "message": "Google Maps Scraper Server is Active"})

@app.route('/scrape', methods=['POST'])
def scrape_reviews():
    data = request.json
    url = data.get('url')
    
    if not url:
        return jsonify({"error": "URL is required"}), 400

    print(f"Received scrape request for: {url}")
    
    scraper = None
    try:
        scraper = GoogleMapsReviewScraper(headless=True)
        reviews = scraper.extract_reviews(url, max_reviews=150)
        
        # Convert to format expected by frontend
        # The frontend expects a raw text format for Gemini to parse, 
        # OR we can just return the structured data and bypass Gemini parsing if we want.
        # But the current architecture uses Gemini to extract "leads" from "raw text".
        # So let's construct a raw text representation of the reviews.
        
        raw_text_parts = []
        for r in reviews:
            part = f"""
---
SOURCE: Google Maps (Scraped)
REVIEWER: {r.get('reviewer_name', 'N/A')}
RATING: {r.get('rating', 'N/A')}
COMPLAINT: "{r.get('review_text', '')}"
REPLY: "{r.get('owner_response', '')}"
---
"""
            raw_text_parts.append(part)
            
        raw_text = "\n".join(raw_text_parts)
        
        return jsonify({
            "success": True,
            "reviews": reviews,
            "rawText": raw_text,
            "count": len(reviews)
        })
        
    except Exception as e:
        print(f"Error scraping: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        if scraper:
            scraper.close()

if __name__ == '__main__':
    app.run(port=5000, debug=True)
