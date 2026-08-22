import os
import json
import httpx
from openai import OpenAI

# Swytchcode OpenAI runtime automatically configures the client

def fetch_reverse_image_search_data(image_url: str) -> dict:
    """
    Sends the image URL to a Reverse Image Search API (e.g., SerpApi / Google Lens).
    Requires 'SERPAPI_KEY' in the environment variables.
    """
    api_key = os.getenv("SERPAPI_KEY")
    
    # If the API key is missing, we return a simulated "messy JSON" payload
    # so the frontend and AI pipeline can still be tested and demonstrated.
    if not api_key:
        return {
            "search_metadata": {"status": "Success", "engine": "google_lens_simulated"},
            "visual_matches": [
                {"title": "Discussion on tech leaks", "link": "https://reddit.com/r/technology/comments/123"},
                {"title": "Latest cyber news", "link": "https://medium.com/@author/tech-news"},
                {"title": "Random user tweet", "link": "https://twitter.com/user/status/456"}
            ]
        }
        
    # Example using SerpApi (Google Lens API)
    params = {
        "engine": "google_lens",
        "url": image_url,
        "api_key": api_key
    }
    
    try:
        # We use httpx since it's already installed in the virtual environment
        response = httpx.get("https://serpapi.com/search", params=params, timeout=15.0)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return {"error": f"Reverse Image Search API failed: {str(e)}"}


def generate_osint_report(raw_search_data: dict) -> str:
    client = OpenAI()
    """
    Takes the messy JSON from the reverse image search API and uses the Swytchcode AI model
    to format a clean, professional intelligence report using the exact forensic prompt.
    """
    system_prompt = """You are an expert Digital Forensics OSINT Analyst working for Sentinex AI. The user has uploaded an image/video, and our backend reverse-search tools have found the following raw URLs where this media appears on the internet.

Your job is to analyze these URLs, identify the platforms, and present a clean, professional intelligence report.

Instructions:
- Do not mention that you are analyzing URLs or JSON data. Speak as if you analyzed the media directly.
- Categorize the findings into clear platform types (e.g., Social Media, News Websites, Forums/Blogs).
- List the exact platforms (e.g., Facebook, X/Twitter, Reddit) where a match was found.
- If no matches are found in the data, state clearly: 'No matches found across monitored platforms at this time.'
- Maintain a highly professional, investigative tone."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Raw Search Data:\n{json.dumps(raw_search_data)}"}
            ]
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error generating OSINT report: {str(e)}"
