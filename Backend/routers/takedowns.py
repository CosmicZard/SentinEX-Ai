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
- Date/Time: {current_time}
- Laws to cite: Section 66E, Section 67/67A of the Information Technology Act 2000, Rule 3(2)(b) of IT Rules 2021, and Title 17 U.S.C. 512(c).
- Demands: 24-hour mandatory removal, log preservation for law enforcement.
- Tone: Extremely formal, legally binding, urgent.

Output ONLY the notice text, nothing else."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a cyber-law assistant."},
                {"role": "user", "content": system_prompt}
            ]
        )
        notice = response.choices[0].message.content.strip()
    except Exception as e:
        # Fallback to template if API fails
        notice = f"Error generating dynamic legal notice: {str(e)}\n\nPlease ensure your OpenAI configuration is correct."

    return {"notice_text": notice, "target_url": target_url, "hosting_provider": hosting_provider}
