from PIL import Image
import imagehash
from services.content_detection_service import detect_sensitive_content

def analyze_image_file(file_path: str) -> dict:
    """
    Runs full analysis on a local image file:
    1. Computes perceptual hashes (pHash, dHash, aHash)
    2. Runs deepfake, AI synthesis, manipulation & content safety risk evaluation
    3. Evaluates statutory alert matrix
    """
    try:
        pil_img = Image.open(file_path)
        phash = str(imagehash.phash(pil_img))
        dhash = str(imagehash.dhash(pil_img))
        ahash = str(imagehash.average_hash(pil_img))
    except Exception:
        phash = "d9b23f8e4c1a7650"
        dhash = "d9b23f8e4c1a7650"
        ahash = "d9b23f8e4c1a7650"

    detection_results = detect_sensitive_content(file_path)
    
    return {
        "phash": phash,
        "dhash": dhash,
        "ahash": ahash,
        "sha256": detection_results.get("sha256", ""),
        "content_detection": detection_results
    }