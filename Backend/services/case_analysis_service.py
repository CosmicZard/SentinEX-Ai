import sqlite3
from services.evidence_service import save_uploaded_file_bytes
from services.analysis_service import analyze_image_file
from services.matching_service import evaluate_matches
from services.risk_service import calculate_risk_level
from services.risk_intelligence_service import get_statutory_violations
import models

async def process_case_evidence(db: sqlite3.Connection, case_id: int, file_content: bytes, original_filename: str) -> dict:
    # 1. Save uploaded file to disk
    _, file_path = save_uploaded_file_bytes(file_content, original_filename)
    
    # 2. Run analysis (pHash + Deepfake score)
    analysis = analyze_image_file(file_path)
    real_phash = analysis["phash"]
    detection = analysis["content_detection"]
    
    # 3. Fetch existing hashes from SQLite database
    cursor = db.cursor()
    cursor.execute("SELECT phash FROM evidence")
    rows = cursor.fetchall()
    existing_hashes = [row[0] for row in rows if row[0]]
    
    # 4. Perform Hamming Distance matching
    match_count = evaluate_matches(real_phash, existing_hashes, threshold=25)
    
    # 5. Persist new evidence and update match count
    models.add_evidence(db, case_id, original_filename, real_phash)
    if match_count > 0:
        models.update_case_matches(db, case_id, match_count)
        
    # 6. Assess risk and statutory guidance
    risk_level = calculate_risk_level(detection["confidence"], match_count)
    violations = get_statutory_violations(detection["is_sensitive"], True)
    
    return {
        "message": "Evidence securely processed",
        "case_id": case_id,
        "filename": original_filename,
        "phash": real_phash,
        "content_detection": detection,
        "matches": match_count,
        "risk_level": risk_level,
        "statutory_violations": violations
    }