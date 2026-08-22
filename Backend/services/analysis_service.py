from services.fingerprint_service import compute_perceptual_hash
from services.content_detection_service import analyze_deepfake_risk

def analyze_image_file(file_path: str) -> dict:
    """
    Runs full analysis on a local image file:
    1. Computes perceptual hash (pHash)
    2. Runs deepfake & sensitive content risk evaluation
    """
    phash = compute_perceptual_hash(file_path)
    detection_results = analyze_deepfake_risk(file_path)
    
    return {
        "phash": phash,
        "content_detection": detection_results
    }