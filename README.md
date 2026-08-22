# SentinEx-AI — Privacy-First NCII Detection & Takedown Platform

**Team Name:** Elite4x  
**Hackathon:** HACK-4-CROWN — Forging The Empire of Tomorrow  

> **Key USP:** *"The victim should never have to sacrifice their privacy to protect their privacy."*

SentinEx-AI is an enterprise-grade cybersecurity platform that follows a **Zero-Trust Client-Side Architecture** to detect non-consensual intimate image sharing (NCII), identify manipulated/deepfake copies, preserve cryptographic digital evidence, issue 24-hour statutory takedown demands, and generate official legal complaints under the **Information Technology Act, 2000 (Sections 66E, 67, 67A)**.

---

## 🛡️ Core Architecture & Zero-Trust Privacy Guarantee

1. **0 Raw Uploads (Client-Side Sandboxing)**:
   - Visual fingerprinting (64-bit Perceptual Hash / dHash) runs 100% in-browser on HTML5 Canvas.
   - Deepfake & manipulation heuristics (compression anomaly, frequency gradient, face swap artifacts) execute locally.
   - Raw images/videos **never leave the user's device**.

2. **Open-Web Reverse Threat Discovery**:
   - Web index and OSINT search queries are executed using **only the anonymized mathematical pHash** via Hamming distance calculation.

3. **Tamper-Evident Evidence Vault**:
   - Preserves URLs, discovery timestamps, and cryptographic **SHA-256 integrity tokens** for legal chain-of-custody.
   - Exportable Evidence Manifest (JSON / CSV).

4. **Automated 24-Hour Takedown Center**:
   - Generates statutory DMCA / NCII Intermediary Takedown Notices citing Rule 3(2)(b) of the IT Rules 2021 (mandatory 24-hour removal).
   - Auto-lookup for cloud providers (Cloudflare, AWS, DigitalOcean, Hetzner, Reddit, Telegram, etc.) with 1-click email dispatch.

5. **Formal Legal Complaint & NCRP Portal Package**:
   - Generates official Cyber Crime Cell & National Cyber Crime Reporting Portal (NCRP - cybercrime.gov.in) complaint PDFs (dual ReportLab backend & jsPDF offline client).
   - Cites Sections 66E (Bodily Privacy), 67 (Obscenity), 67A (Sexually Explicit Acts), 66D (Deepfake Personation), and IPC Sec 354C (Voyeurism).

6. **7-Stage Incident Lifecycle Management**:
   - Tracks case progression: `Detected` → `Evidence Saved` → `Report Generated` → `Submitted` → `Under Review` → `Removed` → `Resolved`.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.10+** (tested on Python 3.13)
- **Node.js 18+** & **npm** (tested on Node v22)

---

### Option 1: 1-Click Launch (Windows)
Double-click or run:
```cmd
start-all.bat
```
This automatically starts both the FastAPI backend and the React Vite frontend in separate console windows.

---

### Option 2: Manual Setup & Execution

#### 1. Backend Setup (FastAPI)
```bash
# Navigate to Backend folder
cd Backend

# Install Python dependencies
pip install -r requirements.txt

# Start the FastAPI server
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
- **API URL:** `http://localhost:8000`
- **Interactive Swagger Docs:** `http://localhost:8000/docs`

#### 2. Frontend Setup (React + Vite)
```bash
# In a separate terminal, navigate to frontend folder
cd frontend

# Install Node dependencies
npm install

# Start Vite Development Server
npm run dev
```
- **Frontend App:** `http://localhost:5173`

---

## 🧪 Verification & Testing

To run the automated backend test suite (testing all 12 pipeline & matrix verification steps):
```bash
cd Backend
python test_app.py
```
To run frontend production build verification:
```bash
cd frontend
npm run build
```

---

## 📂 Project Structure

```
SentinEX-Ai/
├── Backend/
│   ├── main.py                     # FastAPI entry point & CORS configuration
│   ├── database.py                 # SQLite DB initialization & seed data
│   ├── models.py                   # Case, Evidence, Takedown models & queries
│   ├── schemas.py                  # Pydantic data validation schemas
│   ├── requirements.txt            # Backend dependencies
│   ├── test_app.py                 # 12-stage automated pipeline & matrix test suite
│   ├── routers/
│   │   ├── cases.py                # Cases & evidence vault endpoints
│   │   ├── search.py               # Reverse pHash Hamming distance search
│   │   ├── takedowns.py            # Statutory takedown notices & status updates
│   │   └── analysis.py             # Alert matrix multi-model validation engine
│   └── services/
│       ├── legal_pdf_service.py    # IT Act complaint PDF generator (ReportLab)
│       ├── fingerprint_service.py  # Image pHash / dHash computation
│       ├── matching_service.py     # Hamming distance calculations
│       └── content_detection_service.py # Risk & deepfake evaluation
├── frontend/
│   ├── src/
│   │   ├── App.jsx                 # Dashboard, navigation & state management
│   │   ├── AnalyzeImage.jsx        # Client-side image canvas fingerprinting & local heuristics
│   │   ├── AnalyzeVideo.jsx        # Client-side video frame sampling & scanning
│   │   ├── CaseWorkspace.jsx       # 7-stage lifecycle case tracker
│   │   ├── DetectedMatches.jsx     # Reverse threat discovery matches view
│   │   ├── EvidenceVault.jsx       # Tamper-evident evidence chain-of-custody
│   │   ├── LegalCenter.jsx         # NCRP / Cyber Crime Cell legal complaint generator
│   │   ├── TakedownCenter.jsx      # DMCA & IT Rule 3(2)(b) takedown dispatcher
│   │   └── Reports.jsx             # Generated reports archive
│   ├── package.json
│   └── vite.config.js
├── start-all.bat                    # 1-Click Windows full stack launcher
├── start-backend.bat                # Backend launcher script
├── start-frontend.bat               # Frontend launcher script
└── README.md
```
