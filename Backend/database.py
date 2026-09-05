import sqlite3
import os
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_URL = os.path.join(BASE_DIR, "sentinex.db")
DATABASE_URL_SA = f"sqlite:///{DATABASE_URL}"

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

engine = create_engine(
    DATABASE_URL_SA,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_sa_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initializes the SQLite database and creates/migrates all tables."""
    Base.metadata.create_all(bind=engine)
    conn = sqlite3.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    # Table 1: Cases
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS cases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            case_number TEXT UNIQUE,
            title TEXT,
            description TEXT,
            status TEXT DEFAULT 'Detected',
            risk_level TEXT DEFAULT 'Medium',
            created_at TEXT,
            updated_at TEXT,
            source TEXT
        )
    ''')

    # Ensure all columns exist in cases (handle migrations from older DB schema)
    cursor.execute("PRAGMA table_info(cases)")
    existing_case_cols = [row[1] for row in cursor.fetchall()]
    if "description" not in existing_case_cols:
        cursor.execute("ALTER TABLE cases ADD COLUMN description TEXT DEFAULT 'Confidential investigation.'")
    if "risk_level" not in existing_case_cols:
        cursor.execute("ALTER TABLE cases ADD COLUMN risk_level TEXT DEFAULT 'Medium'")
    if "created_at" not in existing_case_cols:
        cursor.execute("ALTER TABLE cases ADD COLUMN created_at TEXT")
    if "updated_at" not in existing_case_cols:
        cursor.execute("ALTER TABLE cases ADD COLUMN updated_at TEXT")
    if "source" not in existing_case_cols:
        cursor.execute("ALTER TABLE cases ADD COLUMN source TEXT")
    
    # Table 2: Evidence (Stores anonymized perceptual hashes and URL metadata - NEVER raw files)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS evidence (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            case_id INTEGER,
            anonymized_phash TEXT,
            source_url TEXT,
            domain TEXT,
            evidence_type TEXT DEFAULT 'image',
            confidence REAL DEFAULT 0.95,
            timestamp TEXT,
            sha256_checksum TEXT,
            notes TEXT,
            FOREIGN KEY (case_id) REFERENCES cases (id) ON DELETE CASCADE
        )
    ''')

    # Ensure all columns exist in evidence
    cursor.execute("PRAGMA table_info(evidence)")
    existing_ev_cols = [row[1] for row in cursor.fetchall()]
    if "anonymized_phash" not in existing_ev_cols:
        cursor.execute("ALTER TABLE evidence ADD COLUMN anonymized_phash TEXT")
    if "source_url" not in existing_ev_cols:
        cursor.execute("ALTER TABLE evidence ADD COLUMN source_url TEXT")
    if "domain" not in existing_ev_cols:
        cursor.execute("ALTER TABLE evidence ADD COLUMN domain TEXT")
    if "evidence_type" not in existing_ev_cols:
        cursor.execute("ALTER TABLE evidence ADD COLUMN evidence_type TEXT DEFAULT 'image'")
    if "confidence" not in existing_ev_cols:
        cursor.execute("ALTER TABLE evidence ADD COLUMN confidence REAL DEFAULT 0.95")
    if "timestamp" not in existing_ev_cols:
        cursor.execute("ALTER TABLE evidence ADD COLUMN timestamp TEXT")
    if "sha256_checksum" not in existing_ev_cols:
        cursor.execute("ALTER TABLE evidence ADD COLUMN sha256_checksum TEXT")
    if "notes" not in existing_ev_cols:
        cursor.execute("ALTER TABLE evidence ADD COLUMN notes TEXT")

    # Table 3: Takedowns (Manages DMCA / NCII takedown notices and status)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS takedowns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            case_id INTEGER,
            evidence_id INTEGER,
            target_url TEXT,
            hosting_provider TEXT,
            provider_email TEXT,
            status TEXT DEFAULT 'Draft',
            notice_text TEXT,
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY (case_id) REFERENCES cases (id) ON DELETE CASCADE
        )
    ''')

    # Table 4: Reports (Tracks generated legal complaints and notices)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            case_id INTEGER,
            report_number TEXT UNIQUE,
            report_type TEXT,
            title TEXT,
            statutory_clauses TEXT,
            created_at TEXT,
            pdf_path TEXT,
            FOREIGN KEY (case_id) REFERENCES cases (id) ON DELETE CASCADE
        )
    ''')

    # Table 5: Open-Web Simulated Index (Simulated web crawler index for matching perceptual hashes)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS web_index (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            domain TEXT,
            url TEXT,
            page_title TEXT,
            phash TEXT,
            hosting_provider TEXT,
            abuse_email TEXT,
            indexed_at TEXT
        )
    ''')

    conn.commit()

    # Seed web index with realistic initial data if empty
    cursor.execute("SELECT COUNT(*) FROM web_index")
    if cursor.fetchone()[0] == 0:
        seed_sample_web_index(cursor)
        conn.commit()

    # Seed initial demo case if cases table is empty
    cursor.execute("SELECT COUNT(*) FROM cases")
    if cursor.fetchone()[0] == 0:
        seed_sample_case(cursor)
        conn.commit()

    conn.close()

def seed_sample_web_index(cursor):
    """Populates mock open-web crawler database for realistic reverse-fingerprint matching demonstration."""
    sample_index = [
        ("cyberlocker-vault.net", "https://cyberlocker-vault.net/dl/f9024a1b/private_leak_01.jpg", "CyberLocker Anonymous Share - Media #9024", "d9b23f8e4c1a7650", "Cloudflare / OVH Hosting", "abuse@cloudflare.com", "2026-08-19 14:22:10"),
        ("telegram-channel-web.me", "https://telegram-channel-web.me/c/leak_archive/5920", "Telegram Public Leak Channel #5920", "d9b23f8e4c1a7651", "Telegram CDN / Hetzner Online", "abuse@telegram.org", "2026-08-21 04:30:12"),
        ("anon-imageboard.to", "https://anon-imageboard.to/thread/482910/img_8921.png", "AnonBoard > General Thread #482910", "d9b23f8e4c1a7658", "TusHost Offshore Hosting", "abuse@anon-imageboard.to", "2026-08-20 09:15:33"),
        ("discord-media-attachments.net", "https://discord-media-attachments.net/attachments/982103/image_raw.png", "Discord Shared Attachment CDN", "d9b23f8e4c1a7652", "Discord Trust & Safety / Cloudflare", "abuse@discord.com", "2026-08-21 07:14:22"),
        ("mega-nz-vault.link", "https://mega-nz-vault.link/folder/a9108b/media_archive", "MEGA Cloud Encrypted Storage Vault", "d9b23f8e4c1a7653", "Mega Privacy Compliance NZ", "abuse@mega.nz", "2026-08-20 22:04:18"),
        ("rapidstream-hub.cc", "https://rapidstream-hub.cc/v/881920/stream_playback.mp4", "RapidStream Video Player Embed", "vid_hash_8829f0a", "OVHcloud France", "abuse@ovh.com", "2026-08-21 06:12:00"),
        ("reddit-leak-archive.com", "https://reddit-leak-archive.com/r/shared_media/comments/991a0", "Reddit Mirror Thread #991a0", "d9b23f8e4c1a7670", "Fastly CDN / AWS US-East", "abuse@reddit.com", "2026-08-18 11:05:44"),
        ("paste-drop-media.io", "https://paste-drop-media.io/view/7721a9c", "PasteDrop Media Host - Direct Link", "a8c14e9f3b2d1045", "DigitalOcean Netherlands", "abuse@digitalocean.com", "2026-08-20 18:40:02")
    ]
    cursor.executemany('''
        INSERT INTO web_index (domain, url, page_title, phash, hosting_provider, abuse_email, indexed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', sample_index)

def seed_sample_case(cursor):
    """Seeds an initial demonstration case with evidence and lifecycle data."""
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute('''
        INSERT INTO cases (case_number, title, description, status, risk_level, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', ("SE-2026-1082", "Unauthorized Media Leak Investigation", "Incident involving leaked intimate content across anonymous file hosts and forums.", "Evidence Saved", "High", now, now))
    
    case_id = cursor.lastrowid

    # Add evidence items
    cursor.execute('''
        INSERT INTO evidence (case_id, anonymized_phash, source_url, domain, evidence_type, confidence, timestamp, sha256_checksum, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        case_id,
        "d9b23f8e4c1a7650",
        "https://cyberlocker-vault.net/dl/f9024a1b/private_leak_01.jpg",
        "cyberlocker-vault.net",
        "image",
        0.98,
        now,
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "Direct visual match discovered via perceptual fingerprint search."
    ))
    evidence_id = cursor.lastrowid

    # Add takedown notice
    cursor.execute('''
        INSERT INTO takedowns (case_id, evidence_id, target_url, hosting_provider, provider_email, status, notice_text, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        case_id,
        evidence_id,
        "https://cyberlocker-vault.net/dl/f9024a1b/private_leak_01.jpg",
        "Cloudflare / OVH Hosting",
        "abuse@cyberlocker-vault.net",
        "Draft",
        "FORMAL NOTICE OF NON-CONSENSUAL INTIMATE MEDIA (NCII) VIOLATION & DEMAND FOR IMMEDIATE TAKEDOWN\n\nPursuant to Section 66E and Section 67A of the Information Technology Act, 2000, and Rule 3(2)(b) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, you are hereby provided actual knowledge of infringing intimate content hosted at the above URL.\n\nYou are formally required to disable access to the infringing material within 24 hours of receipt of this notice.",
        now,
        now
    ))

def get_db():
    """Yields a database connection for FastAPI dependency injection."""
    conn = sqlite3.connect(DATABASE_URL, check_same_thread=False)
    conn.row_factory = sqlite3.Row 
    try:
        yield conn
    finally:
        conn.close()