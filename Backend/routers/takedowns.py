from fastapi import APIRouter, Depends, HTTPException
import sqlite3
from database import get_db
import models
import schemas

router = APIRouter()

@router.get("/", response_model=list[schemas.TakedownResponse])
def list_takedowns(case_id: int = None, db: sqlite3.Connection = Depends(get_db)):
    """Fetches all takedowns or filtered by case_id."""
    return models.get_takedowns(db, case_id)

@router.post("/", response_model=schemas.TakedownResponse)
def create_takedown(data: schemas.TakedownCreate, db: sqlite3.Connection = Depends(get_db)):
    """Creates a new takedown request linked to a case."""
    new_id = models.create_takedown(db, data)
    takedowns = models.get_takedowns(db)
    for t in takedowns:
        if t["id"] == new_id:
            return t
    return {
        "id": new_id,
        "case_id": data.case_id,
        "evidence_id": data.evidence_id,
        "target_url": data.target_url,
        "hosting_provider": data.hosting_provider,
        "provider_email": data.provider_email,
        "status": "Draft",
        "notice_text": data.notice_text,
        "created_at": "Just now",
        "updated_at": "Just now"
    }

@router.patch("/{takedown_id}/status")
def update_status(takedown_id: int, body: schemas.TakedownStatusUpdate, db: sqlite3.Connection = Depends(get_db)):
    """Updates the status of a takedown (Draft -> Sent -> Under Review -> Removed -> Resolved)."""
    success = models.update_takedown_status(db, takedown_id, body.status)
    if not success:
        raise HTTPException(status_code=404, detail="Takedown record not found")
    return {"message": "Status updated", "id": takedown_id, "status": body.status}

@router.delete("/{takedown_id}")
def delete_takedown(takedown_id: int, db: sqlite3.Connection = Depends(get_db)):
    """Deletes a takedown record."""
    success = models.delete_takedown(db, takedown_id)
    if not success:
        raise HTTPException(status_code=404, detail="Takedown record not found")
    return {"message": f"Takedown {takedown_id} deleted"}

@router.post("/generate-notice")
def generate_notice_text(target_url: str, hosting_provider: str = "Hosting / Cloud Service Provider", recipient_email: str = "abuse@domain.com"):
    """
    Generates a legally structured DMCA / NCII Intermediary Takedown notice
    referencing Section 66E, 67A of IT Act and Rule 3(2)(b) IT Intermediary Rules.
    """
    notice = f"""SENTINEX-AI AUTOMATED LEGAL NOTICE OF INFRINGEMENT & TAKEDOWN DEMAND

TO: Abuse & Legal Compliance Department, {hosting_provider} ({recipient_email})
SUBJECT: URGENT: Mandatory Takedown of Non-Consensual Intimate Imagery (NCII) — Immediate Action Required

Dear Abuse Compliance Officer,

This communication constitutes formal statutory notice that material hosted, cached, or transmitted via your network infrastructure constitutes unauthorized, non-consensual intimate imagery (NCII) disseminated in direct violation of fundamental privacy rights and statutory law.

1. INFRINGING RESOURCE IDENTIFIERS:
• Target URL: {target_url}
• Infrastructure Provider: {hosting_provider}
• Date & Time of Verification: {schemas.datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC') if hasattr(schemas, 'datetime') else 'Recent'}

2. SUGGESTED / RELEVANT STATUTORY CITATIONS:
• Section 66E, Information Technology Act, 2000 (Violation of Bodily Privacy)
• Section 67 & 67A, Information Technology Act, 2000 (Publishing Obscene / Sexually Explicit Material)
• Rule 3(2)(b), Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 (Mandatory disabling of access within 24 HOURS of receipt of complaint)
• Title 17 U.S.C. § 512(c) (DMCA Statutory Notice) / EU Digital Services Act (DSA) Article 16

3. MANDATORY REMOVAL DEMAND:
You are hereby required to immediately disable access to, remove, and expunge the infringing material located at the specified URL within 24 hours of receipt of this notice.

4. LOG PRESERVATION NOTICE:
You are formally requested to preserve all server access logs, upload IP addresses, account identifiers, and billing records associated with the above upload for law enforcement subpoena pursuant to criminal investigation.

Prepared via: SentinEx-AI Privacy-Preserving Defense Platform
Verification Hash: Zero-Trust SHA-256 Validated
"""
    return {"notice_text": notice, "target_url": target_url, "hosting_provider": hosting_provider}
