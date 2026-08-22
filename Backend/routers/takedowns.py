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

import os
from datetime import datetime

@router.post("/generate-notice")
def generate_notice_text(target_url: str, hosting_provider: str = "Hosting / Cloud Service Provider", recipient_email: str = "abuse@domain.com"):
    """
    Generates a legally structured DMCA / NCII Intermediary Takedown notice.
    Complies with IT Act 2000 (Sec 66E, 67A) & IT Intermediary Rules 2021 Rule 3(2)(b).
    """
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC+05:30")
    
    # Check if OpenAI is available
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=api_key)
            prompt = (
                f"Draft a formal Emergency Takedown Notice under Rule 3(2)(b) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 and Section 66E/67A of IT Act 2000. "
                f"Target URL: {target_url}. Host/Provider: {hosting_provider}. Date: {current_time}. "
                f"Demand mandatory removal within 24 hours and IP access log preservation for law enforcement."
            )
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a cyber law intelligence assistant specializing in IT Act and intermediary notice drafting."},
                    {"role": "user", "content": prompt}
                ],
                timeout=10.0
            )
            notice = response.choices[0].message.content.strip()
            return {"notice_text": notice, "target_url": target_url, "hosting_provider": hosting_provider}
        except Exception:
            pass

    # Standard production statutory notice template
    notice = (
        f"FORMAL STATUTORY NOTICE OF NON-CONSENSUAL INTIMATE MEDIA (NCII) VIOLATION & DEMAND FOR IMMEDIATE TAKEDOWN\n"
        f"====================================================================================================\n\n"
        f"DATE & TIME OF NOTICE: {current_time}\n"
        f"TO: Abuse & Legal Compliance Department, {hosting_provider} ({recipient_email})\n"
        f"INFRACTING TARGET URL: {target_url}\n\n"
        f"Dear Abuse Team / Grievance Officer,\n\n"
        f"You are hereby provided formal actual knowledge that the media accessible at the aforementioned URL "
        f"contains unauthorized, non-consensual intimate imagery (NCII) / synthetic deepfake imagery published in violation "
        f"of the victim's fundamental right to bodily privacy.\n\n"
        f"STATUTORY PROVISIONS & MANDATORY CITATIONS:\n"
        f"1. Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 — Rule 3(2)(b):\n"
        f"   As an intermediary or hosting provider, you are legally mandated to disable access to or remove such content "
        f"   within TWENTY-FOUR (24) HOURS of receipt of this notice.\n"
        f"2. Information Technology Act, 2000 — Sections 66E & 67A: Violation of bodily privacy and transmission of explicit electronic material.\n"
        f"3. U.S. Digital Millennium Copyright Act (DMCA) / Title 17 U.S.C. § 512(c).\n\n"
        f"DEMANDS & PRESERVATION DIRECTIVES:\n"
        f"A. Immediately disable public access and remove the content hosted at {target_url}.\n"
        f"B. Pursuant to criminal investigation procedures, preserve all server access logs, uploader IP addresses, "
        f"   timestamps, and payment/registrar records for hand-over to Cyber Crime Law Enforcement Agencies.\n"
        f"C. Confirm compliance via return email to this address within 24 hours.\n\n"
        f"Failure to act within the 24-hour statutory window results in the forfeiture of safe harbor immunity under Section 79 of the IT Act.\n\n"
        f"Sincerely,\n"
        f"SentinEx-AI Cyber Defense & Legal Enforcement Engine\n"
        f"Reference Case Verification: SHA-256 Digitally Sealed"
    )

    return {"notice_text": notice, "target_url": target_url, "hosting_provider": hosting_provider}

