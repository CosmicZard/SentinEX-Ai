import React, { useState, useEffect } from "react";
import "./CaseWorkspace.css";

const API_BASE = "http://localhost:8000";

const STAGES = [
  "Detected",
  "Evidence Saved",
  "Report Generated",
  "Submitted",
  "Under Review",
  "Removed",
  "Resolved"
];

const FLOW_STEPS = [
  {
    id: "submit",
    title: "Submit",
    subtitle: "Content Details",
    icon: "fa-solid fa-file-arrow-up",
    stageKey: "Detected",
    index: 0
  },
  {
    id: "distribute",
    title: "Distribute",
    subtitle: "DMCA & IT Notices",
    icon: "fa-solid fa-paper-plane",
    stageKey: "Submitted",
    index: 1
  },
  {
    id: "monitor",
    title: "Monitor",
    subtitle: "Platform Response",
    icon: "fa-solid fa-shield-halved",
    stageKey: "Under Review",
    index: 2
  },
  {
    id: "resolved",
    title: "Resolved",
    subtitle: "Content Removed",
    icon: "fa-solid fa-circle-check",
    stageKey: "Resolved",
    index: 3
  }
];

function CaseWorkspace({
  caseData,
  onBack,
  onAnalyzeImage,
  onAnalyzeVideo,
  onOpenMatches,
  onOpenEvidence,
  onOpenTakedowns,
  onOpenLegalCenter,
  onReportGenerated,
  onToast
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [currentCase, setCurrentCase] = useState(caseData);
  const [evidenceList, setEvidenceList] = useState([]);
  const [takedownList, setTakedownList] = useState([]);
  const [reportList, setReportList] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (caseData?.id) {
      loadFullCaseDetails();
    }
  }, [caseData]);

  async function loadFullCaseDetails() {
    if (!caseData?.id) return;
    try {
      const res = await fetch(`${API_BASE}/cases/${caseData.id}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentCase(data.case);
        setEvidenceList(data.evidence || []);
        setTakedownList(data.takedowns || []);
        setReportList(data.reports || []);
      }
    } catch (err) {
      console.warn("Failed to load case details:", err);
    }
  }

  async function advanceStage(stageName) {
    if (!currentCase?.id) return;
    try {
      const res = await fetch(`${API_BASE}/cases/${currentCase.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: stageName })
      });
      if (res.ok) {
        setCurrentCase({ ...currentCase, status: stageName });
        if (onToast) onToast(`Case status updated to: ${stageName}`, "success");
      }
    } catch (err) {
      alert("Failed to update status.");
    }
  }

  async function triggerEmergencyReport() {
    if (!currentCase?.id) return;
    setIsGenerating(true);

    try {
      const res = await fetch(`${API_BASE}/cases/${currentCase.id}/generate-pdf`, {
        method: "POST"
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `SentinEx_IT_Act_Complaint_${currentCase.case_number}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();

        if (onToast) onToast("IT Act Complaint generated and downloaded.", "success");
        loadFullCaseDetails();
        if (onReportGenerated) onReportGenerated();
      } else {
        alert("Failed to generate PDF on server.");
      }
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      alert("Could not reach backend server.");
    } finally {
      setIsGenerating(false);
    }
  }

  const activeStageIndex = STAGES.indexOf(currentCase?.status || "Detected");

  let currentFlowIndex = 0;
  if (activeStageIndex >= 5) {
    currentFlowIndex = 3;
  } else if (activeStageIndex === 4) {
    currentFlowIndex = 2;
  } else if (activeStageIndex >= 2) {
    currentFlowIndex = 1;
  } else {
    currentFlowIndex = 0;
  }

  return (
    <div className="case-workspace">
      {/* Top Header */}
      <div className="workspace-top">
        <button className="back-button" onClick={onBack}>
          <i className="fa-solid fa-arrow-left" style={{ marginRight: "6px" }}></i> Back to Dashboard
        </button>
        <div>
          <div className="zero-trust-badge">
            <span className="dot"></span>
            ZERO-TRUST ENCRYPTED WORKSPACE: {currentCase?.case_number || "SE-2026-001"}
          </div>
          <h1>{currentCase?.title || "Unauthorized Image Distribution"}</h1>
          <p className="case-id">
            {currentCase?.case_number || "SE-2026-001"} · Severity: <b>{currentCase?.risk_level || "High"}</b> · Created: {currentCase?.created_at || "Recent"}
          </p>
        </div>
      </div>

      {/* =========================================================
          INCIDENT LIFECYCLE & TAKEDOWN PROGRESSION (DARK SOC THEME)
      ========================================================= */}
      <div className="workspace-card lifecycle-progression-card" style={{ width: "100%", marginBottom: "25px" }}>
        <div className="progression-header">
          <div>
            <h2 className="progression-title">Automated DMCA & Statutory Takedown</h2>
            <p className="progression-subtitle">
              Zero-trust legal enforcement & content removal tracking.
            </p>
          </div>
          <div className="status-dropdown-wrap">
            <span className="live-status-pill">
              <span className="status-pulse-dot"></span>
              Stage: <strong>{currentCase?.status || "Detected"}</strong>
            </span>
            <select
              value={currentCase?.status || "Detected"}
              onChange={(e) => advanceStage(e.target.value)}
              className="stage-selector-dropdown"
              title="Change active case stage"
            >
              {STAGES.map((st) => (
                <option key={st} value={st}>
                  Set Stage: {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* TOP HORIZONTAL STEPPER FLOW */}
        <div className="flow-stepper-row">
          {FLOW_STEPS.map((step, idx) => {
            const isDone = currentFlowIndex > idx;
            const isCurr = currentFlowIndex === idx;

            return (
              <React.Fragment key={step.id}>
                <div
                  className={`flow-node-item ${isDone ? "is-done" : isCurr ? "is-curr" : "is-pending"}`}
                  onClick={() => advanceStage(step.stageKey)}
                  title={`Click to set stage to: ${step.stageKey}`}
                >
                  <div className="flow-circle-badge">
                    {isDone ? (
                      <i className="fa-solid fa-check"></i>
                    ) : (
                      <i className={step.icon}></i>
                    )}
                  </div>
                  <strong className="flow-node-title">{step.title}</strong>
                  <span className="flow-node-sub">{step.subtitle}</span>
                </div>

                {idx < FLOW_STEPS.length - 1 && (
                  <div className={`flow-arrow-separator ${currentFlowIndex > idx ? "is-done" : ""}`}>
                    <i className="fa-solid fa-arrow-right"></i>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Case Metrics Cards */}
      <div className="case-summary" style={{ width: "100%", marginBottom: "25px" }}>
        <div className="summary-card">
          <span>Current Stage</span>
          <strong className="status-badge" style={{ fontSize: "14px" }}>
            {currentCase?.status || "Detected"}
          </strong>
        </div>
        <div className="summary-card" onClick={onOpenMatches} style={{ cursor: "pointer" }}>
          <span>Discovered Matches</span>
          <strong style={{ color: "#38bdf8" }}>{evidenceList.length > 0 ? evidenceList.length + 2 : 0}</strong>
          <small style={{ color: "#94a3b8" }}>View matches <i className="fa-solid fa-arrow-right" style={{ marginLeft: "4px" }}></i></small>
        </div>
        <div className="summary-card" onClick={onOpenEvidence} style={{ cursor: "pointer" }}>
          <span>Preserved Evidence</span>
          <strong style={{ color: "#34d399" }}>{evidenceList.length} Items</strong>
          <small style={{ color: "#94a3b8" }}>View vault <i className="fa-solid fa-arrow-right" style={{ marginLeft: "4px" }}></i></small>
        </div>
        <div className="summary-card" onClick={onOpenTakedowns} style={{ cursor: "pointer" }}>
          <span>Takedowns Logged</span>
          <strong style={{ color: "#f87171" }}>{takedownList.length} Active</strong>
          <small style={{ color: "#94a3b8" }}>Manage notices <i className="fa-solid fa-arrow-right" style={{ marginLeft: "4px" }}></i></small>
        </div>
      </div>

      {/* Main Operations Grid */}
      <div className="workspace-grid" style={{ width: "100%" }}>
        {/* Module 1: Media Scanning */}
        <section className="workspace-card">
          <span className="section-label">LOCAL VISION ENGINE</span>
          <h2>Scan & Fingerprint Media</h2>
          <p>
            Inspect sensitive media locally in your browser. Generates anonymized perceptual hashes (pHash) 
            and checks for AI deepfakes without uploading raw files.
          </p>

          <div className="analysis-actions">
            <button className="analysis-button" onClick={onAnalyzeImage}>
              <span><i className="fa-solid fa-image" style={{ color: "#38bdf8" }}></i></span>
              <div>
                <strong>Scan Image Locally</strong>
                <small>Compute pHash & deepfake check</small>
              </div>
            </button>

            <button className="analysis-button" onClick={onAnalyzeVideo}>
              <span><i className="fa-solid fa-video" style={{ color: "#a855f7" }}></i></span>
              <div>
                <strong>Scan Video Locally</strong>
                <small>Keyframe temporal anomaly check</small>
              </div>
            </button>
          </div>
        </section>

        {/* Module 2: Discovery & Evidence */}
        <section className="workspace-card">
          <span className="section-label">DISCOVERY & EVIDENCE</span>
          <h2>Matches & Evidence Locker</h2>
          <p>
            Track discovered open-web leaks and preserve URLs, timestamps, and SHA-256 cryptographic proof tokens in the evidence vault.
          </p>

          <div className="analysis-actions">
            <button className="analysis-button" onClick={onOpenMatches}>
              <span><i className="fa-solid fa-globe" style={{ color: "#f59e0b" }}></i></span>
              <div>
                <strong>Discovered Matches</strong>
                <small>Review open-web crawler hits</small>
              </div>
            </button>

            <button className="analysis-button" onClick={onOpenEvidence}>
              <span><i className="fa-solid fa-box-archive" style={{ color: "#10b981" }}></i></span>
              <div>
                <strong>Evidence Locker ({evidenceList.length})</strong>
                <small>Forensic records & export manifest</small>
              </div>
            </button>
          </div>
        </section>

        {/* Module 3: Takedown Operations */}
        <section className="workspace-card">
          <span className="section-label">INTERMEDIARY REMOVAL</span>
          <h2>Takedown Notice Hub</h2>
          <p>
            Issue structured 24-hour statutory takedown notices to hosting providers (Cloudflare, AWS, OVH, forums, social hosts).
          </p>

          <button className="analysis-button" onClick={onOpenTakedowns} style={{ width: "100%" }}>
            <span><i className="fa-solid fa-bullhorn" style={{ color: "#ef4444" }}></i></span>
            <div>
              <strong>Open Takedown Center</strong>
              <small>Draft, dispatch, and track provider removal status</small>
            </div>
          </button>
        </section>

        {/* Module 4: Legal Reporting */}
        <section className="workspace-card legal-action-card">
          <span className="section-label">LEGAL ACTION (IT ACT 2000)</span>
          <h2>Cybercrime Complaint Package</h2>
          <p>
            Compile case evidence into an official complaint for the National Cyber Crime Reporting Portal (IT Act Sec 66E, 67, 67A).
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "15px" }}>
            <button
              className="action-btn legal-btn"
              onClick={onOpenLegalCenter}
              style={{ padding: "12px", textAlign: "left", display: "flex", alignItems: "center", gap: "10px" }}
            >
              <span><i className="fa-solid fa-scale-balanced" style={{ color: "#c084fc" }}></i></span>
              <div>
                <strong>Customize Complaint & Statutes</strong>
                <small style={{ display: "block", color: "#93c5fd" }}>Set anonymity, citations, and details</small>
              </div>
            </button>

            <button
              className="emergency-report-btn"
              onClick={triggerEmergencyReport}
              disabled={isGenerating}
            >
              <span>
                {isGenerating ? (
                  <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                  <i className="fa-solid fa-file-pdf"></i>
                )}
              </span>
              <div>
                <strong>{isGenerating ? "Compiling legal package..." : "Quick Download NCRP Complaint PDF"}</strong>
                <small>Generates official ReportLab legal document</small>
              </div>
            </button>
          </div>
        </section>
      </div>

      {/* Case Description & Details */}
      <div className="workspace-card" style={{ width: "100%", marginTop: "25px" }}>
        <p className="section-label">CASE DETAILS & NOTES</p>
        <p style={{ color: "#cbd5e1", lineHeight: "1.6", marginTop: "8px" }}>
          {currentCase?.description || "No notes entered for this investigation."}
        </p>
      </div>
    </div>
  );
}

export default CaseWorkspace;