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
