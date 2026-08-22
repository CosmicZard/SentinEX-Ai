from pydantic import BaseModel, Field
from typing import Optional, List

# --- CASE SCHEMAS ---
class CaseCreate(BaseModel):
    case_number: Optional[str] = None
    title: Optional[str] = "New NCII Investigation"
    description: Optional[str] = "Confidential investigation tracking unauthorized media dissemination."
    risk_level: Optional[str] = "Medium"
    source: Optional[str] = None

class CaseStatusUpdate(BaseModel):
    status: str # Detected | Evidence Saved | Report Generated | Submitted | Under Review | Removed | Resolved

class CaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    risk_level: Optional[str] = None
    source: Optional[str] = None

class CaseResponse(BaseModel):
    id: int
    case_number: str
    title: str
    description: Optional[str] = None
    status: str
    risk_level: str
    source: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    matches: int = 0
    evidence_count: int = 0
    takedown_count: int = 0

# --- EVIDENCE SCHEMAS ---
class EvidenceCreate(BaseModel):
    case_id: int
    anonymized_phash: str
    source_url: str
    domain: Optional[str] = None
    evidence_type: Optional[str] = "image"
    confidence: Optional[float] = 0.95
    sha256_checksum: Optional[str] = None
    notes: Optional[str] = None

class EvidenceResponse(BaseModel):
    id: int
    case_id: int
    anonymized_phash: str
    source_url: str
    domain: Optional[str] = None
    evidence_type: str = "image"
    confidence: float = 0.95
    timestamp: Optional[str] = None
    sha256_checksum: Optional[str] = None
    notes: Optional[str] = None

# --- SEARCH & FINGERPRINT SCHEMAS ---
class FingerprintSearchRequest(BaseModel):
    phash: str
    threshold: Optional[int] = 25
    case_id: Optional[int] = None
    query_tags: Optional[str] = None

class SearchMatchResult(BaseModel):
    id: Optional[int] = None
    domain: str
    url: str
    page_title: str
    phash: str
    confidence: float
    hamming_distance: int
    hosting_provider: str
    abuse_email: str
    indexed_at: str
    status: Optional[str] = "Detected"

class FingerprintSearchResponse(BaseModel):
    searched_phash: str
    matches_found: int
    results: List[SearchMatchResult]

# --- TAKEDOWN SCHEMAS ---
class TakedownCreate(BaseModel):
    case_id: int
    evidence_id: Optional[int] = None
    target_url: str
    hosting_provider: Optional[str] = "Hosting / Cloud Provider"
    provider_email: Optional[str] = "abuse@domain.com"
    notice_text: Optional[str] = None

class TakedownStatusUpdate(BaseModel):
    status: str # Draft | Sent | Acknowledged | Removed | Resolved

class TakedownResponse(BaseModel):
    id: int
    case_id: int
    evidence_id: Optional[int] = None
    target_url: str
    hosting_provider: Optional[str] = None
    provider_email: Optional[str] = None
    status: str
    notice_text: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

# --- STATS SCHEMA ---
class StatsSummary(BaseModel):
    total_cases: int
    active_cases: int
    total_matches: int
    evidence_items: int
    takedowns_active: int
    takedowns_resolved: int
    reports_generated: int