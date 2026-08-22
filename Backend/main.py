from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

# Import modular routers & database
from database import init_db
from routers import cases, search, takedowns, analysis

# 1. Initialize SQLite tables & seed sample index
init_db()

# 2. Ensure local directories
os.makedirs("reports", exist_ok=True)

# 3. Create FastAPI App
app = FastAPI(
    title="SentinEx-AI — Privacy-First NCII Detection & Takedown Platform",
    description="Zero-Trust Cybersecurity Backend for Local Media Fingerprinting, Evidence Preservation, and IT Act Takedowns.",
    version="2.0.0"
)

# 4. Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {
        "platform": "SentinEx-AI",
        "status": "Online",
        "privacy_mode": "Zero-Trust Client-Side Processing",
        "legal_engine": "IT Act 2000 (Sec 66E / 67A) Compliant",
        "docs_url": "/docs"
    }

# 5. Connect Routers
app.include_router(cases.router, prefix="/cases", tags=["Cases & Evidence Management"])
app.include_router(search.router, prefix="/search", tags=["Reverse Fingerprint Search"])
app.include_router(takedowns.router, prefix="/takedowns", tags=["Takedown Operations"])
app.include_router(analysis.router, prefix="/analysis", tags=["Visual Analysis & Alert Matrix"])