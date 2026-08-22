import json
import base64
import os
from openai import OpenAI

# The swytchcode openai runtime automatically configures the client when used in a request context

def encode_image(image_path: str) -> str:
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def detect_sensitive_content(file_path: str) -> dict:
    """
    Evaluates deepfake and synthetic manipulation risk scores
    for an uploaded file using the Swytchcode OpenAI API.
    """
    client = OpenAI()
    base64_image = encode_image(file_path)
    
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": "You are an expert digital forensics AI. Analyze the provided image for Trust & Safety, Deepfakes, and AI generation."
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text", 
                        "text": """Analyze this image. Respond strictly in JSON format with exactly these keys:
- 'humanDetected' (boolean)
- 'faceDetected' (boolean)
- 'contentSafety' (string, exactly one of: 'SFW', 'NSFW', 'Sensitive')
- 'aiGeneratedProbability' (integer 0-100)
- 'deepfakeRisk' (string, exactly one of: 'Critical', 'High', 'Moderate', 'Low')
- 'authenticityScore' (integer 0-100, where 100 is completely authentic organic photo)
- 'manipulationType' (string, e.g. 'None Detected', 'AI Generated', 'Face Swap')
"""
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_image}"
                        }
                    }
                ]
            }
        ],
        response_format={ "type": "json_object" }
    )
    
    return json.loads(response.choices[0].message.content)

def analyze_deepfake_risk(file_path: str) -> dict:
    return detect_sensitive_content(file_path)