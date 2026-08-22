import React, { useState } from "react";
import { computeLocalPerceptualHash, computeSHA256 } from "./utils/privacyFingerprint";
import { detectLocalManipulation } from "./utils/localManipulationDetector";

const API_BASE = "http://localhost:8000";

function AnalyzeImage({ caseId = 1, returnPage = "dashboard", onBack, onSearchTriggered, onEvidenceSaved }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [savingEvidence, setSavingEvidence] = useState(false);
  const [evidenceSaved, setEvidenceSaved] = useState(false);

  function handleFile(e) {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setResult(null);
    setEvidenceSaved(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile || !droppedFile.type.startsWith("image/")) {
      return;
    }
    setFile(droppedFile);
    setPreview(URL.createObjectURL(droppedFile));
    setResult(null);
    setEvidenceSaved(false);
  }

  async function analyzeImageLocally() {
    if (!file) return;

    setAnalyzing(true);
    setResult(null);
    setStatusMessage("Initializing client-side sandbox...");

    try {
      // Step 1: Compute Perceptual Hash (dHash) on HTML5 Canvas - 0 NETWORK BYTES
      await new Promise((r) => setTimeout(r, 250));
      setStatusMessage("Validating media format & extracting memory sandbox buffers...");
      const phash = await computeLocalPerceptualHash(file);
      
      // Step 2: Compute cryptographic SHA-256 evidence integrity token
      setStatusMessage("Computing cryptographic SHA-256 evidence integrity seal...");
      const sha256 = await computeSHA256(file);

      // Step 3: Run multi-model inspection pipeline
      setStatusMessage("Evaluating Human/Face Presence & Independent Content Safety (SFW/NSFW)...");
      await new Promise((r) => setTimeout(r, 300));
      setStatusMessage("Analyzing AI Diffusion/GAN Spectral Artifacts & ELA Manipulation...");
      await new Promise((r) => setTimeout(r, 300));
      setStatusMessage("Evaluating Biometric Deepfake Risk & Computing Authenticity Index...");
      const analysis = await detectLocalManipulation(file);

      // Step 4: Check reverse search index using ONLY the anonymized hash
      setStatusMessage("Querying anonymized threat index with visual fingerprint...");
      let matchesFound = 0;
      let matchedItems = [];

      try {
        const searchRes = await fetch(`${API_BASE}/search/fingerprint`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phash: phash, threshold: 12 }),
        });
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          matchedItems = searchData.results || [];
          matchesFound = searchData.matches_found || matchedItems.length;
        }
      } catch (err) {
        console.warn("Offline search mock mode:", err);
      }

      setResult({
        ...analysis,
        phash,
        sha256,
        matches: matchesFound,
        matchedResults: matchedItems,
        timestamp: new Date().toISOString(),
      });
      setStatusMessage("Analysis Complete. Integrity Token Sealed.");
    } catch (err) {
      console.error("Analysis error:", err);
      setStatusMessage("Analysis error: " + err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function saveFingerprintToCase() {
    if (!result) return;
    setSavingEvidence(true);

    try {
      const response = await fetch(`${API_BASE}/cases/${caseId || 1}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: Number(caseId || 1),
          anonymized_phash: result.phash,
          source_url: `local-scan://${file.name}`,
          domain: "client-device-scan",
          evidence_type: "image",
          confidence: (result.authenticityScore ? (100 - result.authenticityScore) : 90) / 100.0,
          sha256_checksum: result.sha256,
          notes: `Verdict: ${result.overallVerdict}. Safety: ${result.contentSafety}. AI Probability: ${result.aiGeneratedProbability}%. Deepfake Risk: ${result.deepfakeRisk}. Authenticity: ${result.authenticityScore}%.`
        })
      });

      if (response.ok) {
        setEvidenceSaved(true);
        if (onEvidenceSaved) onEvidenceSaved();
      } else {
        alert("Failed to save evidence to database.");
      }
    } catch (err) {
      console.error("Error saving evidence:", err);
      alert("Could not reach backend database.");
    } finally {
      setSavingEvidence(false);
    }
  }

  function removeImage() {
    setFile(null);
    setPreview("");
    setResult(null);
    setEvidenceSaved(false);
  }

  return (
    <div className="analyze-page">
      {/* Header */}
      <header className="analyze-header">
        <button className="back-button" onClick={onBack}>
          <i className="fa-solid fa-arrow-left" style={{ marginRight: "6px" }}></i> Back to {returnPage === "workspace" ? "Workspace" : "Dashboard"}
        </button>
        <div>
          <div className="zero-trust-badge">
            <span className="dot"></span>
            ZERO-TRUST ARCHITECTURE: 0 RAW BYTES TRANSMITTED
          </div>
          <h1>Local Privacy-First Image Scan</h1>
        </div>
      </header>

      <div className="analyze-layout">
        {/* Main Upload Area */}
        <section className="upload-card">
          <div className="section-title-row">
            <div>
              <p className="section-label">ON-DEVICE PROCESSING</p>
              <h2>Select Media to Fingerprint</h2>
            </div>
            <span className="secure-tag">
              <i className="fa-solid fa-lock" style={{ marginRight: "6px" }}></i> Client-Side Only
            </span>
          </div>

          <p className="analyze-description">
            Your media is converted to an anonymized perceptual fingerprint (pHash) 
            strictly inside your browser via Canvas & Web Crypto. The raw image is <b>never</b> uploaded.
          </p>

          {!file ? (
            <div
              className="drop-zone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <div className="upload-icon" style={{ color: "#38bdf8" }}>
                <i className="fa-solid fa-shield-halved"></i>
              </div>
              <h3>Drop private media here to inspect</h3>
              <p>or select from your device for sandboxed analysis</p>
              <label className="upload-button">
                <i className="fa-solid fa-arrow-up-from-bracket" style={{ marginRight: "8px" }}></i> Choose Image
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFile}
                  hidden
                />
              </label>
              <small>Supported: JPG, PNG, WEBP · Processed 100% In-Browser</small>
            </div>
          ) : (
            <div className="image-preview-area">
              <div className="preview-header">
                <div>
                  <strong>{file.name}</strong>
                  <p>{(file.size / 1024).toFixed(1)} KB · Local Memory Sandbox</p>
                </div>
                <button className="remove-button" onClick={removeImage}>
                  <i className="fa-solid fa-xmark" style={{ marginRight: "4px" }}></i> Remove
                </button>
              </div>

              {/* IMAGE PREVIEW AREA WITH SCAN ANIMATION */}
              <div className="preview-container">
                <img src={preview} alt="Selected image preview" className="preview-image" />
                
                {/* ANIMATION - Only shows when 'analyzing' is true */}
                {analyzing && (
                  <div className="scan-overlay">
                    <div className="scan-line"></div>
                    <div className="bounding-box"></div>
                    <div className="radar-grid"></div>
                  </div>
                )}
              </div>

              {!result && !analyzing && (
                <button className="analyze-button pulse-btn" onClick={analyzeImageLocally}>
                  <i className="fa-solid fa-fingerprint" style={{ marginRight: "8px" }}></i> Generate Fingerprint & Scan Locally
                </button>
              )}

              {/* HIGH-TECH LOADING TEXT */}
              {analyzing && (
                <div className="loading-state">
                  <div className="spinner-cyber"></div>
                  <strong className="loading-title">
                    [ RUNNING ON-DEVICE VISION & HASHING ENGINE ]
                  </strong>
                  <p className="loading-sub">{statusMessage}</p>
                </div>
              )}
            </div>
          )}

          {/* Privacy Notice */}
          <div className="analysis-privacy" style={{ marginTop: file ? "20px" : "0" }}>
            <span style={{ color: "#34d399", fontSize: "18px" }}>
              <i className="fa-solid fa-lock"></i>
            </span>
            <div>
              <strong>Strict Zero-Knowledge Guarantee</strong>
              <p>
                Only mathematical perceptual hashes and case metadata are transmitted to discover matches. 
                Your original photograph stays on this device.
              </p>
            </div>
          </div>
        </section>

        {/* Right Information Panel */}
        <aside className="analysis-info">
          <div className="info-icon" style={{ color: "#60a5fa" }}>
            <i className="fa-solid fa-shield-halved"></i>
          </div>
          <h3>Zero-Trust Inspection Pipeline</h3>
          
          <div className="analysis-step">
            <span>01</span>
            <div>
              <strong>Human & Face Detection</strong>
              <p>Isolates skin color locus & biometric facial contours to verify subject presence.</p>
            </div>
          </div>
          <div className="analysis-step">
            <span>02</span>
            <div>
              <strong>Independent Content Safety</strong>
              <p>Evaluates SFW / Sensitive / NSFW classification independently from manipulation models.</p>
            </div>
          </div>
          <div className="analysis-step">
            <span>03</span>
            <div>
              <strong>AI-Generation & Deepfakes</strong>
              <p>Spectral diffusion analysis, error level gradients (ELA), and facial boundary warping check.</p>
            </div>
          </div>
          <div className="analysis-step">
            <span>04</span>
            <div>
              <strong>Authenticity & Alert Matrix</strong>
              <p>Computes composite authenticity score and maps findings against the statutory alert matrix.</p>
            </div>
          </div>
        </aside>
      </div>

      {/* Result Panel */}
      {result && (
        <section className="analysis-result">
          <div className="result-header">
            <div>
              <p className="section-label">LOCAL INSPECTION COMPLETED</p>
              <h2>Forensic Inspection & Specification Report</h2>
            </div>
            <span className="result-status-verified">
              <i className="fa-solid fa-circle-check" style={{ marginRight: "6px" }}></i> 0 Raw Uploads (Zero-Trust Verified)
            </span>
          </div>

          {/* Alert Matrix Hero Verdict Banner */}
          <div className={`verdict-hero-banner ${result.alertClass || "moderate"}`}>
            <div>
              <span className={`verdict-badge ${result.alertClass || "moderate"}`}>
                {result.overallVerdict}
              </span>
              <h3 style={{ fontSize: "20px", margin: "10px 0 6px", color: "var(--text-color)" }}>
                {result.alertBadgeText}
              </h3>
              <p style={{ fontSize: "13.5px", color: "#cbd5e1", maxWidth: "650px", lineHeight: "1.5" }}>
                {result.alertDescription}
              </p>
            </div>

            {/* Authenticity Score Gauge */}
            <div className="authenticity-score-box">
              <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "#94a3b8", letterSpacing: "0.5px" }}>
                Authenticity Score
              </span>
              <strong
                className="score-number"
                style={{
                  color: result.authenticityScore >= 75 ? "#10b981" : result.authenticityScore >= 45 ? "#f59e0b" : "#ef4444"
                }}
              >
                {result.authenticityScore}%
              </strong>
              <small style={{ fontSize: "11px", color: "#94a3b8" }}>
                {result.authenticityScore >= 75 ? "Organic / Authentic" : result.authenticityScore >= 45 ? "Altered Media" : "Synthetic / Deepfake"}
              </small>
              <div className="authenticity-bar">
                <div
                  className="authenticity-bar-fill"
                  style={{
                    width: `${result.authenticityScore}%`,
                    background: result.authenticityScore >= 75 ? "#10b981" : result.authenticityScore >= 45 ? "#f59e0b" : "#ef4444"
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* 8-Point Forensic Specification Grid */}
          <div className="forensic-spec-grid">
            {/* Card 1: File Type & Integrity */}
            <div className="forensic-spec-card">
              <div className="forensic-card-header">
                <span className="forensic-card-label">File Type & Integrity</span>
                <span style={{ fontSize: "16px", color: "#38bdf8" }}><i className="fa-solid fa-file-shield"></i></span>
              </div>
              <strong className="forensic-card-value">{result.fileType}</strong>
              <p className="forensic-card-sub">
                Size: <b>{result.fileSizeKb} KB</b> · SHA-256 Digest Sealed
              </p>
            </div>

            {/* Card 2: Human & Face Detection */}
            <div className="forensic-spec-card">
              <div className="forensic-card-header">
                <span className="forensic-card-label">Human & Face Detection</span>
                <span style={{ fontSize: "16px", color: "#a855f7" }}><i className="fa-solid fa-user-check"></i></span>
              </div>
              <strong className="forensic-card-value">
                {result.humanDetected ? "Human Subject Detected" : "No Human Isolated"}
              </strong>
              <p className="forensic-card-sub">
                {result.faceDetected 
                  ? `✓ ${result.faceCount} Face(s) Detected (${result.faceConfidence}% conf.)` 
                  : "No clear facial landmark boundaries isolated"}
              </p>
            </div>

            {/* Card 3: Content Safety (Independent Pipeline) */}
            <div className="forensic-spec-card">
              <div className="forensic-card-header">
                <span className="forensic-card-label">Content Safety (Independent)</span>
                <span style={{ fontSize: "16px", color: "#34d399" }}><i className="fa-solid fa-shield-halved"></i></span>
              </div>
              <strong
                className="forensic-card-value"
                style={{
                  color: result.contentSafety === "SFW" ? "#34d399" : result.contentSafety === "NSFW" ? "#ef4444" : "#f59e0b"
                }}
              >
                {result.contentSafety === "SFW" ? "SFW (Safe for Work)" : result.contentSafety === "NSFW" ? "NSFW (Explicit Content)" : "Sensitive Media"}
              </strong>
              <p className="forensic-card-sub">
                Safety Score: <b>{result.safetyScore}%</b> · Independent Safety Model
              </p>
            </div>

            {/* Card 4: AI-Generation Probability */}
            <div className="forensic-spec-card">
              <div className="forensic-card-header">
                <span className="forensic-card-label">AI-Generation Probability</span>
                <span style={{ fontSize: "16px", color: "#c084fc" }}><i className="fa-solid fa-robot"></i></span>
              </div>
              <strong
                className="forensic-card-value"
                style={{
                  color: result.aiGeneratedProbability >= 65 ? "#c084fc" : "#93c5fd"
                }}
              >
                {result.aiGeneratedProbability}% AI Probability
              </strong>
              <p className="forensic-card-sub">
                {result.aiGeneratedProbability >= 65 ? "Diffusion / GAN Spectral Artifacts" : "Natural Camera Sensor Noise"}
              </p>
            </div>

            {/* Card 5: Local Manipulation & Splicing */}
            <div className="forensic-spec-card">
              <div className="forensic-card-header">
                <span className="forensic-card-label">Manipulation & Splicing</span>
                <span style={{ fontSize: "16px", color: "#fb923c" }}><i className="fa-solid fa-wand-magic-sparkles"></i></span>
              </div>
              <strong
                className="forensic-card-value"
                style={{
                  color: result.manipulationDetected ? "#fb923c" : "#34d399"
                }}
              >
                {result.manipulationDetected ? "Manipulation Detected" : "No Splicing Detected"}
              </strong>
              <p className="forensic-card-sub">
                {result.manipulationType}
              </p>
            </div>

            {/* Card 6: Deepfake & Biometric Risk */}
            <div className="forensic-spec-card">
              <div className="forensic-card-header">
                <span className="forensic-card-label">Deepfake & Face-Swap Risk</span>
                <span style={{ fontSize: "16px", color: "#f87171" }}><i className="fa-solid fa-masks-theater"></i></span>
              </div>
              <strong
                className="forensic-card-value"
                style={{
                  color: result.deepfakeRisk === "Critical" || result.deepfakeRisk === "High" ? "#f87171" : "#34d399"
                }}
              >
                {result.deepfakeRisk} Risk ({result.faceSwapProbability}%)
              </strong>
              <p className="forensic-card-sub">
                Facial Boundary Gradient: {result.compressionAnomalyScore}%
              </p>
            </div>

            {/* Card 7: Perceptual Hash (dHash) */}
            <div className="forensic-spec-card">
              <div className="forensic-card-header">
                <span className="forensic-card-label">Perceptual Hash (dHash)</span>
                <span style={{ fontSize: "16px", color: "#facc15" }}><i className="fa-solid fa-fingerprint"></i></span>
              </div>
              <strong className="hash-code">{result.phash}</strong>
              <p className="forensic-card-sub">
                Anonymized 64-bit Visual Fingerprint
              </p>
            </div>

            {/* Card 8: Discovered Threat Matches */}
            <div className="forensic-spec-card">
              <div className="forensic-card-header">
                <span className="forensic-card-label">Open-Web Threat Matches</span>
                <span style={{ fontSize: "16px", color: "#ef4444" }}><i className="fa-solid fa-globe"></i></span>
              </div>
              <strong
                className="forensic-card-value"
                style={{
                  color: result.matches > 0 ? "#ef4444" : "#34d399"
                }}
              >
                {result.matches} Discovered Match{result.matches !== 1 ? "es" : ""}
              </strong>
              <p className="forensic-card-sub">
                Across indexed mirrors, forums & lockers
              </p>
            </div>
          </div>

          {/* Statutory Guidance */}
          <div className="statutory-box">
            <h4><i className="fa-solid fa-scale-balanced" style={{ marginRight: "8px", color: "#c084fc" }}></i> Suggested IT Act & Legal Provisions (Advisory)</h4>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "4px 0 10px" }}>
              The following legal provisions are suggested for reference in formal complaints based on detected forensic indicators:
            </p>
            <div className="statutory-tags">
              {(result.statutoryViolations || result.suggestedStatutes || []).map((v, i) => (
                <span key={i} className="statute-pill">{v}</span>
              ))}
            </div>
          </div>

          {/* Action Row */}
          <div className="result-actions-row">
            <button
              className="save-evidence-btn"
              onClick={saveFingerprintToCase}
              disabled={savingEvidence || evidenceSaved}
            >
              {evidenceSaved ? (
                <>
                  <i className="fa-solid fa-check" style={{ marginRight: "6px" }}></i> Saved to Case Evidence
                </>
              ) : savingEvidence ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: "6px" }}></i> Saving...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-box-archive" style={{ marginRight: "8px" }}></i> Preserve Fingerprint in Evidence Vault
                </>
              )}
            </button>

            {onSearchTriggered && (
              <button
                className="search-matches-btn"
                onClick={() => onSearchTriggered(result.phash, result.matchedResults)}
              >
                <i className="fa-solid fa-globe" style={{ marginRight: "8px" }}></i> View {result.matches} Discovered Matches <i className="fa-solid fa-arrow-right" style={{ marginLeft: "6px" }}></i>
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default AnalyzeImage;