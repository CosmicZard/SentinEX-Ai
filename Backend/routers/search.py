from fastapi import APIRouter, Depends, HTTPException
import sqlite3
from database import get_db
import schemas
from services.matching_service import calculate_hamming_distance

router = APIRouter()

@router.post("/fingerprint", response_model=schemas.FingerprintSearchResponse)
def search_by_fingerprint(req: schemas.FingerprintSearchRequest, db: sqlite3.Connection = Depends(get_db)):
    """
    Zero-Trust Reverse Search:
    Takes an anonymized perceptual fingerprint (pHash) and searches indexed web sources
    by computing Hamming distance. NEVER receives or stores raw image bytes.
    Generates varied, contextual multi-platform threat discoveries with real provider abuse contacts.
    """
    cursor = db.cursor()
    cursor.execute("SELECT id, domain, url, page_title, phash, hosting_provider, abuse_email, indexed_at FROM web_index")
    rows = cursor.fetchall()
    
    target_phash = req.phash.strip()
    threshold = req.threshold or 25
    matches = []
    
    for row in rows:
        indexed_phash = row["phash"]
        try:
            # If both are hex hashes, compute Hamming distance
            dist = calculate_hamming_distance(target_phash, indexed_phash)
            confidence = max(0.40, round(1.0 - (dist / 64.0), 2))
            
            if dist <= threshold:
                matches.append(schemas.SearchMatchResult(
                    id=row["id"],
                    domain=row["domain"],
                    url=row["url"],
                    page_title=row["page_title"],
                    phash=indexed_phash,
                    confidence=confidence,
                    hamming_distance=dist,
                    hosting_provider=row["hosting_provider"],
                    abuse_email=row["abuse_email"],
                    indexed_at=row["indexed_at"]
                ))
        except Exception:
            if target_phash == indexed_phash:
                matches.append(schemas.SearchMatchResult(
                    id=row["id"],
                    domain=row["domain"],
                    url=row["url"],
                    page_title=row["page_title"],
                    phash=indexed_phash,
                    confidence=0.99,
                    hamming_distance=0,
                    hosting_provider=row["hosting_provider"],
                    abuse_email=row["abuse_email"],
                    indexed_at=row["indexed_at"]
                ))



    # Sort matches by highest confidence first
    matches.sort(key=lambda x: x.confidence, reverse=True)

    return schemas.FingerprintSearchResponse(
        searched_phash=target_phash,
        matches_found=len(matches),
        results=matches
    )

from pydantic import BaseModel
class OsintSearchRequest(BaseModel):
    image_url: str

@router.post("/osint-report")
def get_osint_report(req: OsintSearchRequest):
    """
    Live Reverse Image Search Pipeline (OSINT):
    1. Sends image URL to SerpApi/Google Lens.
    2. Receives raw JSON URLs.
    3. Uses OpenAI to format the forensic intelligence report.
    """
    from services.osint_service import fetch_reverse_image_search_data, generate_osint_report
    
    # 1. Fetch raw data from Search Engine (Google Lens/SerpApi)
    raw_data = fetch_reverse_image_search_data(req.image_url)
    
    # 2. Feed messy JSON to Swytchcode OpenAI using the strict Forensic Prompt
    report = generate_osint_report(raw_data)
    
    return {"report": report}
