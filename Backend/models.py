import sqlite3
from datetime import datetime
import schemas
from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, ForeignKey
from database import Base

# ============================================================
# SQLAlchemy Models
# ============================================================

class Case(Base):
    __tablename__ = "cases"
    id = Column(Integer, primary_key=True, index=True)
    case_number = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=True)
    description = Column(String, nullable=True)
    source = Column(String, nullable=True)
    status = Column(String, default="Under Review", nullable=False)
    risk_level = Column(String, default="Medium", nullable=True)
    created_at = Column(String, nullable=True)
    updated_at = Column(String, nullable=True)

class Image(Base):
    __tablename__ = "images"
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    content_type = Column(String, nullable=False)
    ai_label = Column(String, nullable=True)
    ai_confidence = Column(Float, nullable=True)
    is_sensitive = Column(Boolean, nullable=True)
    risk_level = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class Fingerprint(Base):
    __tablename__ = "fingerprints"
    id = Column(Integer, primary_key=True, index=True)
    image_id = Column(Integer, ForeignKey("images.id", ondelete="CASCADE"), nullable=False, index=True)
    phash = Column(String, nullable=False, index=True)
    dhash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class Video(Base):
    __tablename__ = "videos"
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    content_type = Column(String, nullable=False)
    duration = Column(Float, nullable=True)
    frames_analyzed = Column(Integer, default=0, nullable=False)
    ai_label = Column(String, nullable=True)
    ai_confidence = Column(Float, nullable=True)
    sensitive_frames = Column(Integer, default=0, nullable=False)
    risk_level = Column(String, nullable=True)
    risk_score = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

# ============================================================
# Legacy sqlite3 methods below
# ============================================================

def create_case(db: sqlite3.Connection, case_data: schemas.CaseCreate) -> int:
    cursor = db.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    case_num = case_data.case_number or f"SE-2026-{int(datetime.now().timestamp()) % 10000}"
    
    cursor.execute('''
        INSERT INTO cases (case_number, title, description, status, risk_level, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (case_num, case_data.title, case_data.description, "Detected", case_data.risk_level or "Medium", now, now))
    db.commit()
    return cursor.lastrowid

def get_all_cases(db: sqlite3.Connection):
    cursor = db.cursor()
    cursor.execute('''
        SELECT 
            c.id, 
            c.case_number, 
            c.title, 
            c.description, 
            c.status, 
            c.risk_level, 
            c.created_at, 
            c.updated_at,
            (SELECT COUNT(*) FROM evidence e WHERE e.case_id = c.id) as evidence_count,
            (SELECT COUNT(*) FROM takedowns t WHERE t.case_id = c.id) as takedown_count
        FROM cases c 
        ORDER BY c.id DESC
    ''')
    rows = cursor.fetchall()
    results = []
    for row in rows:
        d = dict(row)
        d["matches"] = d["evidence_count"] # In our MVP model, matches discovered/saved
        results.append(d)
    return results

def get_case_by_id(db: sqlite3.Connection, case_id: int):
    cursor = db.cursor()
    cursor.execute('''
        SELECT 
            c.id, 
            c.case_number, 
            c.title, 
            c.description, 
            c.status, 
            c.risk_level, 
            c.created_at, 
            c.updated_at,
            (SELECT COUNT(*) FROM evidence e WHERE e.case_id = c.id) as evidence_count,
            (SELECT COUNT(*) FROM takedowns t WHERE t.case_id = c.id) as takedown_count
        FROM cases c 
        WHERE c.id = ?
    ''', (case_id,))
    row = cursor.fetchone()
    if row:
        d = dict(row)
        d["matches"] = d["evidence_count"]
        return d
    return None

def update_case_status(db: sqlite3.Connection, case_id: int, status: str):
    cursor = db.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("UPDATE cases SET status = ?, updated_at = ? WHERE id = ?", (status, now, case_id))
    db.commit()
    return cursor.rowcount > 0

def update_case(db: sqlite3.Connection, case_id: int, case_data: schemas.CaseUpdate):
    cursor = db.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    fields = []
    values = []
    if case_data.title is not None:
        fields.append("title = ?")
        values.append(case_data.title)
    if case_data.description is not None:
        fields.append("description = ?")
        values.append(case_data.description)
    if case_data.status is not None:
        fields.append("status = ?")
        values.append(case_data.status)
    if case_data.risk_level is not None:
        fields.append("risk_level = ?")
        values.append(case_data.risk_level)
    
    if not fields:
        return False
    
    fields.append("updated_at = ?")
    values.append(now)
    values.append(case_id)
    
    query = f"UPDATE cases SET {', '.join(fields)} WHERE id = ?"
    cursor.execute(query, tuple(values))
    db.commit()
    return cursor.rowcount > 0

def delete_case(db: sqlite3.Connection, case_id: int):
    cursor = db.cursor()
    cursor.execute("DELETE FROM cases WHERE id = ?", (case_id,))
    cursor.execute("DELETE FROM evidence WHERE case_id = ?", (case_id,))
    cursor.execute("DELETE FROM takedowns WHERE case_id = ?", (case_id,))
    cursor.execute("DELETE FROM reports WHERE case_id = ?", (case_id,))
    db.commit()
    return cursor.rowcount > 0

# --- EVIDENCE FUNCTIONS ---
def add_evidence(db: sqlite3.Connection, evidence_data: schemas.EvidenceCreate) -> int:
    cursor = db.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    domain = evidence_data.domain
    if not domain and evidence_data.source_url:
        try:
            from urllib.parse import urlparse
            domain = urlparse(evidence_data.source_url).netloc
        except Exception:
            domain = "unknown-host.net"

    cursor.execute('''
        INSERT INTO evidence (case_id, anonymized_phash, source_url, domain, evidence_type, confidence, timestamp, sha256_checksum, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        evidence_data.case_id,
        evidence_data.anonymized_phash,
        evidence_data.source_url,
        domain or "web-source",
        evidence_data.evidence_type or "image",
        evidence_data.confidence or 0.95,
        now,
        evidence_data.sha256_checksum or "sha256-verified-evidence-token",
        evidence_data.notes or "Preserved from discovery scan."
    ))
    db.commit()
    
    # Auto update case status to 'Evidence Saved' if it's still 'Detected'
    cursor.execute("SELECT status FROM cases WHERE id = ?", (evidence_data.case_id,))
    c_status = cursor.fetchone()
    if c_status and c_status[0] == "Detected":
        update_case_status(db, evidence_data.case_id, "Evidence Saved")

    return cursor.lastrowid

def get_evidence_by_case(db: sqlite3.Connection, case_id: int):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM evidence WHERE case_id = ? ORDER BY id DESC", (case_id,))
    return [dict(r) for r in cursor.fetchall()]

def get_all_evidence(db: sqlite3.Connection):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM evidence ORDER BY id DESC")
    return [dict(r) for r in cursor.fetchall()]

def delete_evidence(db: sqlite3.Connection, evidence_id: int):
    cursor = db.cursor()
    cursor.execute("DELETE FROM evidence WHERE id = ?", (evidence_id,))
    db.commit()
    return cursor.rowcount > 0

# --- TAKEDOWN FUNCTIONS ---
def create_takedown(db: sqlite3.Connection, takedown_data: schemas.TakedownCreate) -> int:
    cursor = db.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    notice_text = takedown_data.notice_text or (
        f"FORMAL NOTICE OF NON-CONSENSUAL INTIMATE MEDIA (NCII) VIOLATION & DEMAND FOR IMMEDIATE TAKEDOWN\n\n"
        f"Target URL: {takedown_data.target_url}\n"
        f"Hosting Provider: {takedown_data.hosting_provider}\n\n"
        f"Pursuant to Section 66E and Section 67A of the Information Technology Act, 2000, and Rule 3(2)(b) of the "
        f"Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, you are hereby "
        f"provided formal notice of unauthorized, non-consensual intimate imagery hosted on your infrastructure.\n\n"
        f"You are strictly required to disable access or remove the identified content within 24 hours of receipt of this communication."
    )
    
    cursor.execute('''
        INSERT INTO takedowns (case_id, evidence_id, target_url, hosting_provider, provider_email, status, notice_text, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        takedown_data.case_id,
        takedown_data.evidence_id,
        takedown_data.target_url,
        takedown_data.hosting_provider or "Hosting / Cloud Provider",
        takedown_data.provider_email or "abuse@provider.com",
        "Draft",
        notice_text,
        now,
        now
    ))
    db.commit()
    return cursor.lastrowid

def get_takedowns(db: sqlite3.Connection, case_id: int = None):
    cursor = db.cursor()
    if case_id:
        cursor.execute("SELECT * FROM takedowns WHERE case_id = ? ORDER BY id DESC", (case_id,))
    else:
        cursor.execute("SELECT * FROM takedowns ORDER BY id DESC")
    return [dict(r) for r in cursor.fetchall()]

def update_takedown_status(db: sqlite3.Connection, takedown_id: int, status: str):
    cursor = db.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("UPDATE takedowns SET status = ?, updated_at = ? WHERE id = ?", (status, now, takedown_id))
    db.commit()
    return cursor.rowcount > 0

def delete_takedown(db: sqlite3.Connection, takedown_id: int):
    cursor = db.cursor()
    cursor.execute("DELETE FROM takedowns WHERE id = ?", (takedown_id,))
    db.commit()
    return cursor.rowcount > 0

# --- STATS SUMMARY ---
def get_stats_summary(db: sqlite3.Connection) -> dict:
    cursor = db.cursor()
    cursor.execute("SELECT COUNT(*) FROM cases")
    total_cases = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM cases WHERE status NOT IN ('Resolved', 'Removed')")
    active_cases = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM evidence")
    evidence_items = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM takedowns WHERE status IN ('Draft', 'Sent', 'Under Review')")
    takedowns_active = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM takedowns WHERE status IN ('Removed', 'Resolved')")
    takedowns_resolved = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM reports")
    reports_generated = cursor.fetchone()[0]

    return {
        "total_cases": total_cases,
        "active_cases": active_cases,
        "total_matches": evidence_items,
        "evidence_items": evidence_items,
        "takedowns_active": takedowns_active,
        "takedowns_resolved": takedowns_resolved,
        "reports_generated": reports_generated
    }