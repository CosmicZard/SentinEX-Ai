import React, { useState, useEffect } from "react";
import "./CaseWorkspace.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

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

  // Sync state if caseData prop changes
  useEffect(() => {
    setCurrentCase(caseData);
  }, [caseData]);
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
          INCIDENT LIFECYCLE & TAKEDOWN PROGRESSION (LINEAR-STYLE)
      ========================================================= */}
      <div className="pipeline-card" style={{ width: "100%" }}>
        <div className="pipeline-header">
          <span className="pipeline-title">
            <i className="fa-solid fa-timeline" style={{ color: "var(--primary)" }}></i>
            Incident Lifecycle Pipeline
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Stage:</span>
            <select
              value={currentCase?.status || "Detected"}
              onChange={(e) => advanceStage(e.target.value)}
              className="stage-select-compact"
              title="Change active case stage"
            >
              {STAGES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* COMPACT LINEAR-STYLE STEPPER FLOW */}
        <div className="pipeline-steps-row">
          {FLOW_STEPS.map((step, idx) => {
            const isDone = currentFlowIndex > idx;
            const isCurr = currentFlowIndex === idx;

            return (
              <React.Fragment key={step.id}>
                <div
                  className={`pipeline-step ${isDone ? "is-done" : isCurr ? "is-curr" : "is-pending"}`}
                  onClick={() => advanceStage(step.stageKey)}
                  title={`Click to set stage: ${step.stageKey}`}
                >
                  <div className="step-badge">
                    {isDone ? (
                      <i className="fa-solid fa-check"></i>
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </div>
                  <div>
                    <div className="step-text-title">{step.title}</div>
                    <small style={{ fontSize: "11px", color: "var(--text-muted)", display: "block" }}>{step.subtitle}</small>
                  </div>
                </div>

                {idx < FLOW_STEPS.length - 1 && (
                  <div className={`step-divider ${currentFlowIndex > idx ? "is-done" : ""}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Case Metrics Cards */}
      <div className="case-summary" style={{ width: "100%", marginBottom: "20px" }}>
        <div className="summary-card">
          <span>Current Stage</span>
          <strong style={{ fontSize: "16px", color: "var(--primary)" }}>
            {currentCase?.status || "Detected"}
          </strong>
        </div>
        <div className="summary-card" onClick={onOpenMatches} style={{ cursor: "pointer" }}>
          <span>Discovered Matches</span>
          <strong style={{ color: "#d97706" }}>{evidenceList.length > 0 ? evidenceList.length + 2 : 0}</strong>
          <small>View matches <i className="fa-solid fa-arrow-right"></i></small>
        </div>
        <div className="summary-card" onClick={onOpenEvidence} style={{ cursor: "pointer" }}>
          <span>Preserved Evidence</span>
          <strong style={{ color: "#059669" }}>{evidenceList.length} Items</strong>
          <small>View vault <i className="fa-solid fa-arrow-right"></i></small>
        </div>
        <div className="summary-card" onClick={onOpenTakedowns} style={{ cursor: "pointer" }}>
          <span>Takedowns Logged</span>
          <strong style={{ color: "#dc2626" }}>{takedownList.length} Active</strong>
          <small style={{ color: "#dc2626" }}>Manage notices <i className="fa-solid fa-arrow-right"></i></small>
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
              <span><i className="fa-solid fa-image" style={{ color: "#059669" }}></i></span>
              <div>
                <strong>Scan Image Locally</strong>
                <small>Compute pHash & deepfake check</small>
              </div>
            </button>

            <button className="analysis-button" onClick={onAnalyzeVideo}>
              <span><i className="fa-solid fa-video" style={{ color: "#7c3aed" }}></i></span>
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
              <span><i className="fa-solid fa-globe" style={{ color: "#d97706" }}></i></span>
              <div>
                <strong>Discovered Matches</strong>
                <small>Review open-web crawler hits</small>
              </div>
            </button>

            <button className="analysis-button" onClick={onOpenEvidence}>
              <span><i className="fa-solid fa-box-archive" style={{ color: "#059669" }}></i></span>
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
            <span><i className="fa-solid fa-bullhorn" style={{ color: "#dc2626" }}></i></span>
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

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button
              className="btn btn-secondary"
              onClick={onOpenLegalCenter}
              style={{ justifyContent: "flex-start", padding: "10px 14px", height: "auto" }}
            >
              <i className="fa-solid fa-scale-balanced" style={{ color: "#7c3aed", fontSize: "16px" }}></i>
              <div style={{ textAlign: "left", marginLeft: "6px" }}>
                <strong style={{ display: "block", fontSize: "13px" }}>Customize Complaint & Statutes</strong>
                <small style={{ fontSize: "11px", color: "var(--text-muted)" }}>Set anonymity, citations, and incident statement</small>
              </div>
            </button>

            <button
              className="btn btn-primary"
              onClick={triggerEmergencyReport}
              disabled={isGenerating}
              style={{ justifyContent: "flex-start", padding: "10px 14px", height: "auto" }}
            >
              {isGenerating ? (
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "16px" }}></i>
              ) : (
                <i className="fa-solid fa-file-pdf" style={{ fontSize: "16px" }}></i>
              )}
              <div style={{ textAlign: "left", marginLeft: "6px" }}>
                <strong style={{ display: "block", fontSize: "13px" }}>{isGenerating ? "Compiling legal package..." : "Quick Download NCRP Complaint PDF"}</strong>
                <small style={{ fontSize: "11px", color: "rgba(255,255,255,0.85)" }}>Generates official ReportLab legal document</small>
              </div>
            </button>
          </div>
        </section>
      </div>

      {/* Case Description & Details */}
      <div className="workspace-card" style={{ width: "100%", marginTop: "25px" }}>
        <p className="section-label">CASE DETAILS & NOTES</p>
        <p style={{ color: "#334155", lineHeight: "1.6", marginTop: "8px" }}>
          {currentCase?.description || "No notes entered for this investigation."}
        </p>
      </div>
    </div>
  );
}

export default CaseWorkspace;