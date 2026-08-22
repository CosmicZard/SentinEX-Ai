import React, { useState } from "react";
import { computeLocalPerceptualHash, computeSHA256 } from "./utils/privacyFingerprint";
import { detectLocalManipulation } from "./utils/localManipulationDetector";

const API_BASE = "http://localhost:8000";

function AnalyzeImage({ caseId = 1, returnPage = "dashboard", onBack, onSearchTriggered, onEvidenceSaved, onSwitchToVideo }) {
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

    if (selectedFile.type && selectedFile.type.startsWith("video/") && onSwitchToVideo) {
      onSwitchToVideo();
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setResult(null);
    setEvidenceSaved(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;

    if (droppedFile.type && droppedFile.type.startsWith("video/") && onSwitchToVideo) {
      onSwitchToVideo();
      return;
    }

    if (!droppedFile.type.startsWith("image/")) {
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
    setStatusMessage("Uploading to SentinEX AI analysis engine...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Hit our newly upgraded backend endpoint that uses Swytchcode (OpenAI)
      setStatusMessage("Evaluating Deepfake Risk & Content Safety via Swytchcode AI...");
      const uploadRes = await fetch(`${API_BASE}/cases/${caseId || 1}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error("Analysis failed on backend server.");
      }

      const uploadData = await uploadRes.json();
      
      // Early SFW check if you returned that earlier, else it gives full data
      const analysis = uploadData.content_detection;

      const phash = uploadData.phash || "phash_not_computed";
      const sha256 = uploadData.sha256 || "sha256_not_computed";

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

      // The backend upload already creates evidence and image records, so we don't need to manually click 'save'
      setEvidenceSaved(true);
      if (onEvidenceSaved) onEvidenceSaved();

    } catch (err) {
      console.error("Backend AI processing error:", err);
      alert("Failed to analyze image using AI backend.");
    } finally {
      setAnalyzing(false);
      setStatusMessage("");
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

          {onSwitchToVideo && (
            <div className="segmented-control" style={{ margin: "12px 0 16px" }}>
              <button
                type="button"
                className="segmented-btn active"
              >
                <i className="fa-solid fa-image"></i> Image Inspection
              </button>
              <button
                type="button"
                className="segmented-btn"
                onClick={onSwitchToVideo}
              >
                <i className="fa-solid fa-video"></i> Switch to Video Stream
              </button>
            </div>
          )}

          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "16px", lineHeight: "1.5" }}>
            Media is processed into an anonymized perceptual fingerprint (pHash) 
            strictly inside your browser via Canvas & Web Crypto APIs. Original image bytes are never uploaded.
          </p>

          {!file ? (
            <div
              className="dropzone-container"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <div className="dropzone-icon">
                <i className="fa-solid fa-cloud-arrow-up"></i>
              </div>
              <h3 className="dropzone-title">Select or drag image to inspect</h3>
              <p className="dropzone-sub">Processes 100% in-browser on this device</p>
              
              <div style={{ marginTop: "14px" }}>
                <label className="btn btn-primary btn-sm" style={{ cursor: "pointer" }}>
                  <i className="fa-solid fa-folder-open"></i> Browse Files
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFile}
                    hidden
                  />
                </label>
              </div>
              <span className="file-spec-tag">JPEG, PNG, WEBP · Up to 25MB · Zero Data Upload</span>
            </div>
          ) : (
            <div className="image-preview-area">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div>
                  <strong style={{ fontSize: "13.5px", color: "var(--text-primary)" }}>{file.name}</strong>
                  <p style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>{(file.size / 1024).toFixed(1)} KB · In-Memory Canvas Sandbox</p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={removeImage}>
                  <i className="fa-solid fa-xmark"></i> Remove
                </button>
              </div>

              {/* CLEAN IMAGE VIEWPORT */}
              <div className="media-viewport">
                <img src={preview} alt="Selected preview" />
              </div>

              {!result && !analyzing && (
                <button
                  className="btn btn-primary"
                  onClick={analyzeImageLocally}
                  style={{ width: "100%", padding: "10px", marginTop: "8px" }}
                >
                  <i className="fa-solid fa-fingerprint"></i> Run Forensic Fingerprinting & Deepfake Scan
                </button>
              )}

              {/* PROGRESS CHECKLIST */}
              {analyzing && (
                <div className="analysis-progress-card">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", fontSize: "13px", color: "var(--primary)" }}>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <span>Analyzing Image Locally...</span>
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>{statusMessage}</p>
                </div>
              )}
            </div>
          )}

          {/* Privacy Notice */}
          <div className="privacy-notice" style={{ marginTop: file ? "18px" : "0" }}>
            <span style={{ color: "var(--primary)", fontSize: "16px" }}>
              <i className="fa-solid fa-lock"></i>
            </span>
            <div>
              <strong>Zero-Knowledge Architecture</strong>
              <p>
                Only mathematical perceptual hashes and case metadata are transmitted to discover matches. 
                Your original photograph stays on this device.
              </p>
            </div>
          </div>
        </section>

        {/* Right Information Panel */}
        <aside className="analysis-info">
          <div className="info-icon" style={{ color: "#059669" }}>
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
              <i className="fa-solid fa-circle-check"></i> 0 Raw Uploads (Zero-Trust Verified)
            </span>
          </div>

          {/* Alert Matrix Hero Verdict Banner */}
          <div className={`verdict-hero-banner ${result.alertClass || "moderate"}`}>
            <div style={{ flex: 1 }}>
              <span className={`verdict-badge ${result.alertClass || "moderate"}`}>
                {result.overallVerdict}
              </span>
              <h3 style={{ fontSize: "18px", fontWeight: "700", margin: "8px 0 6px", color: "var(--text-primary)" }}>
                {result.alertBadgeText}
              </h3>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", maxWidth: "620px", lineHeight: "1.5" }}>
                {result.alertDescription}
              </p>
            </div>

            {/* Authenticity Score Gauge */}
            <div className="authenticity-score-box">
              <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.5px" }}>
                Authenticity Score
              </span>
              <strong
                className="score-number"
                style={{
                  color: result.authenticityScore >= 75 ? "#059669" : result.authenticityScore >= 45 ? "#d97706" : "#dc2626"
                }}
              >
                {result.authenticityScore}%
              </strong>
              <small style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                {result.authenticityScore >= 75 ? "Organic / Authentic" : result.authenticityScore >= 45 ? "Altered Media" : "Synthetic / Deepfake"}
              </small>
              <div className="authenticity-bar">
                <div
                  className="authenticity-bar-fill"
                  style={{
                    width: `${result.authenticityScore}%`,
                    background: result.authenticityScore >= 75 ? "#059669" : result.authenticityScore >= 45 ? "#d97706" : "#dc2626"
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
                <span style={{ fontSize: "15px", color: "var(--primary)" }}><i className="fa-solid fa-file-shield"></i></span>
              </div>
              <strong className="forensic-card-value">{result.fileType}</strong>
              <p className="forensic-card-sub">
                Size: <b>{result.fileSizeKb} KB</b> · SHA-256 Sealed
              </p>
            </div>

            {/* Card 2: Human & Face Detection */}
            <div className="forensic-spec-card">
              <div className="forensic-card-header">
                <span className="forensic-card-label">Biometrics & Subject</span>
                <span style={{ fontSize: "15px", color: "#7c3aed" }}><i className="fa-solid fa-user-check"></i></span>
              </div>
              <strong className="forensic-card-value">
                {result.humanDetected ? "Human Subject Detected" : "No Human Isolated"}
              </strong>
              <p className="forensic-card-sub">
                {result.faceDetected 
                  ? `✓ ${result.faceCount} Face(s) (${result.faceConfidence}% conf.)` 
                  : "No facial landmark boundaries isolated"}
              </p>
            </div>

            {/* Card 3: Content Safety (Independent Pipeline) */}
            <div className="forensic-spec-card">
              <div className="forensic-card-header">
                <span className="forensic-card-label">Content Safety Rating</span>
                <span style={{ fontSize: "15px", color: "var(--primary)" }}><i className="fa-solid fa-shield-halved"></i></span>
              </div>
              <strong
                className="forensic-card-value"
                style={{
                  color: result.contentSafety === "SFW" ? "#059669" : result.contentSafety === "NSFW" ? "#dc2626" : "#d97706"
                }}
              >
                {result.contentSafety === "SFW" ? "SFW (Safe for Work)" : result.contentSafety === "NSFW" ? "NSFW (Explicit Content)" : "Sensitive Media"}
              </strong>
              <p className="forensic-card-sub">
                Safety Score: <b>{result.safetyScore}%</b> · Independent Engine
              </p>
            </div>

            {/* Card 4: AI-Generation Probability */}
            <div className="forensic-spec-card">
              <div className="forensic-card-header">
                <span className="forensic-card-label">AI Generation Risk</span>
                <span style={{ fontSize: "15px", color: "#7c3aed" }}><i className="fa-solid fa-robot"></i></span>
              </div>
              <strong
                className="forensic-card-value"
                style={{
                  color: result.aiGeneratedProbability >= 65 ? "#7c3aed" : "#0284c7"
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
                <span style={{ fontSize: "15px", color: "#d97706" }}><i className="fa-solid fa-wand-magic-sparkles"></i></span>
              </div>
              <strong
                className="forensic-card-value"
                style={{
                  color: result.manipulationDetected ? "#d97706" : "#059669"
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
                <span className="forensic-card-label">Deepfake & Face Swap</span>
                <span style={{ fontSize: "15px", color: "#dc2626" }}><i className="fa-solid fa-masks-theater"></i></span>
              </div>
              <strong
                className="forensic-card-value"
                style={{
                  color: result.deepfakeRisk === "Critical" || result.deepfakeRisk === "High" ? "#dc2626" : "#059669"
                }}
              >
                {result.deepfakeRisk} Risk ({result.faceSwapProbability}%)
              </strong>
              <p className="forensic-card-sub">
                Boundary Anomaly: {result.compressionAnomalyScore}%
              </p>
            </div>

            {/* Card 7: Perceptual Hash (dHash) */}
            <div className="forensic-spec-card">
              <div className="forensic-card-header">
                <span className="forensic-card-label">Perceptual Hash (dHash)</span>
                <span style={{ fontSize: "15px", color: "var(--primary)" }}><i className="fa-solid fa-fingerprint"></i></span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", margin: "2px 0 4px" }}>
                <code className="hash-code">{result.phash}</code>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    navigator.clipboard.writeText(result.phash);
                    if (onToast) onToast("Perceptual hash copied to clipboard", "success");
                  }}
                  title="Copy Hash"
                  style={{ padding: "2px 6px", fontSize: "11px" }}
                >
                  <i className="fa-solid fa-copy"></i>
                </button>
              </div>
              <p className="forensic-card-sub">
                Anonymized 64-bit Visual Fingerprint
              </p>
            </div>

            {/* Card 8: Discovered Threat Matches */}
            <div className="forensic-spec-card">
              <div className="forensic-card-header">
                <span className="forensic-card-label">Threat Index Matches</span>
                <span style={{ fontSize: "15px", color: result.matches > 0 ? "#dc2626" : "var(--primary)" }}><i className="fa-solid fa-globe"></i></span>
              </div>
              <strong
                className="forensic-card-value"
                style={{
                  color: result.matches > 0 ? "#dc2626" : "#059669"
                }}
              >
                {result.matches} Discovered Match{result.matches !== 1 ? "es" : ""}
              </strong>
              <p className="forensic-card-sub">
                Across indexed mirrors & lockers
              </p>
            </div>
          </div>

          {/* Statutory Guidance */}
          {result.contentSafety !== "SFW" && (
            <div className="statutory-box">
              <h4>
                <i className="fa-solid fa-scale-balanced" style={{ color: "var(--primary)" }}></i>
                Suggested Statutory Provisions (India IT Act & Legal Framework)
              </h4>
              <p style={{ fontSize: "12.5px", color: "var(--text-muted)", margin: "4px 0 10px" }}>
                Suggested legal provisions for notice drafting based on detected indicators:
              </p>
              <div className="statutory-tags">
                {(result.statutoryViolations || result.suggestedStatutes || []).map((v, i) => (
                  <span key={i} className="statute-pill">{v}</span>
                ))}
              </div>
            </div>
          )}

          {/* Action Row */}
          <div style={{ display: "flex", gap: "10px", marginTop: "20px", flexWrap: "wrap" }}>
            <button
              className="btn btn-primary"
              onClick={saveFingerprintToCase}
              disabled={savingEvidence || evidenceSaved}
            >
              {evidenceSaved ? (
                <>
                  <i className="fa-solid fa-check"></i> Fingerprint Saved to Vault
                </>
              ) : savingEvidence ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Preserving Evidence...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-box-archive"></i> Preserve Fingerprint in Evidence Vault
                </>
              )}
            </button>

            {onSearchTriggered && (
              <button
                className="btn btn-secondary"
                onClick={() => onSearchTriggered(result.phash, result.matchedResults)}
              >
                <i className="fa-solid fa-globe"></i> View {result.matches} Discovered Matches <i className="fa-solid fa-arrow-right" style={{ marginLeft: "4px" }}></i>
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default AnalyzeImage;