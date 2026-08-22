from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os
import shutil
import uuid

from database import get_db, get_sa_db
import models
from models import Case, Image, Fingerprint, Video
import schemas
from schemas import CaseCreate, CaseUpdate, CaseResponse

# Import legacy services needed for old endpoints
from services.legal_pdf_service import generate_formal_it_act_pdf

# Import new services (these need to exist or be mocked)
try:
    from services.fingerprint_service import generate_fingerprints
    from services.matching_service import find_similar_images
    from services.content_detection_service import detect_sensitive_content
    from services.risk_service import calculate_risk
    from services.analysis_service import analyze_image
    from services.case_analysis_service import analyze_case
    from services.evidence_service import get_case_evidence
    from services.video_analysis_service import analyze_video
except ImportError:
    pass # Let it fail at runtime if not implemented

router = APIRouter()

# ============================================================
# LEGACY ENDPOINTS (Preserved for compatibility)
# ============================================================

@router.get("/stats/summary", response_model=schemas.StatsSummary)
def get_dashboard_stats(db = Depends(get_db)):
    """Provides high-level platform statistics for the dashboard."""
    return models.get_stats_summary(db)

@router.patch("/{case_id}/status")
def update_case_status_legacy(case_id: int, body: schemas.CaseStatusUpdate, db = Depends(get_db)):
    """Updates the lifecycle stage of a case."""
    success = models.update_case_status(db, case_id, body.status)
    if not success:
        raise HTTPException(status_code=404, detail="Case not found")
    return {"message": "Case status updated", "id": case_id, "status": body.status}

@router.post("/{case_id}/generate-pdf")
def generate_legal_pdf(case_id: int, victim_alias: str = Query("CONFIDENTIAL_COMPLAINANT"), notes: str = Query(None), db = Depends(get_db)):
    """Generates a formal, production-grade IT Act Cyber Crime Complaint PDF."""
    try:
        pdf_path = generate_formal_it_act_pdf(db, case_id, victim_alias=victim_alias, custom_notes=notes)
        case = models.get_case_by_id(db, case_id)
        case_num = case["case_number"] if case else f"SE-{case_id}"
        return FileResponse(pdf_path, media_type='application/pdf', filename=f"SentinEx_IT_Act_Complaint_{case_num}.pdf")
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF Generation error: {str(e)}")

@router.get("/reports/all")
def get_all_reports(db = Depends(get_db)):
    """Lists all generated cybercrime and takedown reports across cases."""
    cursor = db.cursor()
    cursor.execute('''
        SELECT r.*, c.case_number, c.title as case_title 
        FROM reports r 
        LEFT JOIN cases c ON r.case_id = c.id 
        ORDER BY r.id DESC
    ''')
    return [dict(r) for r in cursor.fetchall()]

@router.get("/{case_id}/legacy-evidence", response_model=list[schemas.EvidenceResponse])
def get_case_evidence_legacy(case_id: int, db = Depends(get_db)):
    """Lists preserved evidence items for a case."""
    return models.get_evidence_by_case(db, case_id)

@router.post("/{case_id}/legacy-evidence", response_model=schemas.EvidenceResponse)
def add_case_evidence_legacy(case_id: int, evidence_data: schemas.EvidenceCreate, db = Depends(get_db)):
    evidence_data.case_id = case_id
    evidence_id = models.add_evidence(db, evidence_data)
    evidence_list = models.get_evidence_by_case(db, case_id)
    for ev in evidence_list:
        if ev["id"] == evidence_id:
            return ev
    return {"id": evidence_id, "case_id": case_id, "anonymized_phash": evidence_data.anonymized_phash, "source_url": evidence_data.source_url}

@router.delete("/evidence/{evidence_id}")
def delete_evidence_item(evidence_id: int, db = Depends(get_db)):
    success = models.delete_evidence(db, evidence_id)
    if not success:
        raise HTTPException(status_code=404, detail="Evidence item not found")
    return {"message": f"Evidence {evidence_id} removed"}


# ============================================================
# NEW SQLALCHEMY ENDPOINTS
# ============================================================

@router.post("/", response_model=CaseResponse)
def create_case(case: CaseCreate, db: Session = Depends(get_sa_db)):
    existing_case = db.query(Case).filter(Case.case_number == case.case_number).first()
    if existing_case:
        raise HTTPException(status_code=400, detail="Case number already exists")
    new_case = Case(
        case_number=case.case_number,
        title=case.title,
        description=case.description,
        source=case.source,
        status="Under Review"
    )
    db.add(new_case)
    db.commit()
    db.refresh(new_case)
    return new_case

@router.get("/")
def get_cases(db: Session = Depends(get_sa_db)):
    cases = db.query(Case).order_by(Case.id.desc()).all()
    return cases

@router.get("/{case_id}", response_model=CaseResponse)
def get_case(case_id: int, db: Session = Depends(get_sa_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    return case

@router.put("/{case_id}", response_model=CaseResponse)
def update_case(case_id: int, case_data: CaseUpdate, db: Session = Depends(get_sa_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    if case_data.status is not None:
        case.status = case_data.status
    if case_data.title is not None:
        case.title = case_data.title
    if case_data.description is not None:
        case.description = case_data.description
    if case_data.source is not None:
        case.source = case_data.source
    db.commit()
    db.refresh(case)
    return case

@router.delete("/{case_id}")
def delete_case(case_id: int, db: Session = Depends(get_sa_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    
    images = db.query(Image).filter(Image.case_id == case_id).all()
    for image in images:
        if image.file_path and os.path.exists(image.file_path):
            try: os.remove(image.file_path)
            except Exception: pass
        db.query(Fingerprint).filter(Fingerprint.image_id == image.id).delete(synchronize_session=False)
    
    db.query(Image).filter(Image.case_id == case_id).delete(synchronize_session=False)
    
    videos = db.query(Video).filter(Video.case_id == case_id).all()
    for video in videos:
        if video.file_path and os.path.exists(video.file_path):
            try: os.remove(video.file_path)
            except Exception: pass
            
    db.query(Video).filter(Video.case_id == case_id).delete(synchronize_session=False)
    db.delete(case)
    db.commit()
    return {"message": "Case deleted successfully", "case_id": case_id}

@router.post("/{case_id}/upload")
def upload_image(case_id: int, file: UploadFile = File(...), db: Session = Depends(get_sa_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
        
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG and WEBP images are allowed")
        
    os.makedirs("uploads", exist_ok=True)
    original_filename = file.filename or "image"
    unique_filename = f"{uuid.uuid4()}_{original_filename}"
    file_path = os.path.join("uploads", unique_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save image: {str(e)}")
        
    try:
        fingerprints = generate_fingerprints(file_path)
    except Exception as e:
        if os.path.exists(file_path): os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Fingerprint generation failed: {str(e)}")
        
    try:
        content_result = detect_sensitive_content(file_path)
    except Exception as e:
        if os.path.exists(file_path): os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Content detection failed: {str(e)}")
        
    risk_level = calculate_risk(is_sensitive=content_result["is_sensitive"], confidence=content_result["confidence"])
    
    new_image = Image(
        case_id=case_id, filename=original_filename, file_path=file_path, content_type=file.content_type,
        ai_label=content_result["label"], ai_confidence=content_result["confidence"],
        is_sensitive=content_result["is_sensitive"], risk_level=risk_level
    )
    db.add(new_image)
    db.commit()
    db.refresh(new_image)
    
    new_fingerprint = Fingerprint(image_id=new_image.id, phash=fingerprints["phash"], dhash=fingerprints["dhash"])
    db.add(new_fingerprint)
    db.commit()
    db.refresh(new_fingerprint)
    
    return {
        "message": "Image uploaded successfully", "image_id": new_image.id, "case_id": case_id,
        "filename": original_filename, "phash": fingerprints["phash"], "dhash": fingerprints["dhash"],
        "content_detection": {
            "is_sensitive": content_result["is_sensitive"], "confidence": content_result["confidence"],
            "label": content_result["label"], "risk_level": risk_level
        },
        "preview_url": f"/cases/{case_id}/evidence/IMAGE/{new_image.id}/preview"
    }

@router.post("/{case_id}/video")
def upload_video(case_id: int, file: UploadFile = File(...), db: Session = Depends(get_sa_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
        
    allowed_types = ["video/mp4", "video/avi", "video/mpeg", "video/webm", "video/quicktime"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only MP4, AVI, MPEG, WEBM and MOV videos are allowed")
        
    os.makedirs("uploads", exist_ok=True)
    original_filename = file.filename or "video"
    unique_filename = f"{uuid.uuid4()}_{original_filename}"
    file_path = os.path.join("uploads", unique_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save video: {str(e)}")
        
    try:
        analysis = analyze_video(file_path)
    except Exception as e:
        if os.path.exists(file_path): os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Video analysis failed: {str(e)}")
        
    video_analysis = analysis.get("video_analysis", {})
    new_video = Video(
        case_id=case_id, filename=original_filename, file_path=file_path, content_type=file.content_type,
        duration=video_analysis.get("duration", 0), frames_analyzed=video_analysis.get("frames_analyzed", 0),
        ai_label=video_analysis.get("ai_label"), ai_confidence=video_analysis.get("ai_confidence"),
        sensitive_frames=video_analysis.get("sensitive_frames", 0), risk_level=video_analysis.get("risk_level"),
        risk_score=video_analysis.get("risk_score")
    )
    db.add(new_video)
    db.commit()
    db.refresh(new_video)
    
    return {
        "message": "Video uploaded and analyzed successfully", "video_id": new_video.id, "case_id": case_id,
        "filename": original_filename,
        "video_analysis": {
            "duration": new_video.duration, "frames_analyzed": new_video.frames_analyzed,
            "ai_label": new_video.ai_label, "ai_confidence": new_video.ai_confidence,
            "sensitive_frames": new_video.sensitive_frames, "risk_level": new_video.risk_level,
            "risk_score": new_video.risk_score
        },
        "preview_url": f"/cases/{case_id}/evidence/VIDEO/{new_video.id}/preview"
    }

@router.get("/{case_id}/videos/{video_id}")
def get_video_details(case_id: int, video_id: int, db: Session = Depends(get_sa_db)):
    video = db.query(Video).filter(Video.id == video_id, Video.case_id == case_id).first()
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found")
    return {
        "video_id": video.id, "case_id": video.case_id, "filename": video.filename,
        "file_path": video.file_path, "content_type": video.content_type, "duration": video.duration,
        "frames_analyzed": video.frames_analyzed, "ai_label": video.ai_label,
        "ai_confidence": video.ai_confidence, "sensitive_frames": video.sensitive_frames,
        "risk_level": video.risk_level, "risk_score": video.risk_score, "created_at": video.created_at
    }

@router.get("/{case_id}/images/{image_id}")
def get_image_details(case_id: int, image_id: int, db: Session = Depends(get_sa_db)):
    image = db.query(Image).filter(Image.id == image_id, Image.case_id == case_id).first()
    if image is None:
        raise HTTPException(status_code=404, detail="Image not found")
    return {
        "image_id": image.id, "case_id": image.case_id, "filename": image.filename,
        "file_path": image.file_path, "content_type": image.content_type, "ai_label": image.ai_label,
        "ai_confidence": image.ai_confidence, "is_sensitive": image.is_sensitive,
        "risk_level": image.risk_level, "created_at": image.created_at,
        "preview_url": f"/cases/{case_id}/evidence/IMAGE/{image.id}/preview"
    }

@router.get("/{case_id}/analysis")
def analyze_case_endpoint(case_id: int, db: Session = Depends(get_sa_db)):
    analysis = analyze_case(case_id, db)
    if analysis is None:
        raise HTTPException(status_code=404, detail="Case not found")
    return analysis

@router.get("/{case_id}/evidence")
def get_evidence(case_id: int, db: Session = Depends(get_sa_db)):
    evidence = get_case_evidence(case_id, db)
    if evidence is None:
        raise HTTPException(status_code=404, detail="Case not found")
    return evidence

@router.get("/{case_id}/evidence/{evidence_type}/{evidence_id}/preview")
def preview_evidence(case_id: int, evidence_type: str, evidence_id: int, db: Session = Depends(get_sa_db)):
    evidence_type = evidence_type.upper()
    if evidence_type == "IMAGE":
        image = db.query(Image).filter(Image.id == evidence_id, Image.case_id == case_id).first()
        if image is None or not image.file_path or not os.path.exists(image.file_path):
            raise HTTPException(status_code=404, detail="Image not found")
        return FileResponse(path=image.file_path, media_type=image.content_type or "image/jpeg", filename=image.filename)
    if evidence_type == "VIDEO":
        video = db.query(Video).filter(Video.id == evidence_id, Video.case_id == case_id).first()
        if video is None or not video.file_path or not os.path.exists(video.file_path):
            raise HTTPException(status_code=404, detail="Video not found")
        return FileResponse(path=video.file_path, media_type=video.content_type or "video/mp4", filename=video.filename)
    raise HTTPException(status_code=400, detail="Invalid evidence type.")

@router.get("/{case_id}/images/{image_id}/matches")
def find_image_matches(case_id: int, image_id: int, db: Session = Depends(get_sa_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    image = db.query(Image).filter(Image.id == image_id, Image.case_id == case_id).first()
    if image is None:
        raise HTTPException(status_code=404, detail="Image not found")
    fingerprint = db.query(Fingerprint).filter(Fingerprint.image_id == image_id).first()
    if fingerprint is None:
        raise HTTPException(status_code=404, detail="Fingerprint not found")
    matches = find_similar_images(fingerprint.phash, db)
    matches = [match for match in matches if match["image_id"] != image_id]
    return {"case_id": case_id, "image_id": image_id, "matches": matches}