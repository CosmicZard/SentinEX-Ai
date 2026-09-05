import { useState, useEffect } from "react";
import "./App.css";
import CreateCase from "./CreateCase";
import AnalyzeImage from "./AnalyzeImage";
import AnalyzeVideo from "./AnalyzeVideo";
import CaseWorkspace from "./CaseWorkspace";
import DetectedMatches from "./DetectedMatches";
import EvidenceVault from "./EvidenceVault";
import TakedownCenter from "./TakedownCenter";
import LegalCenter from "./LegalCenter";
import MyCases from "./MyCases";
import Reports from "./Reports";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function App() {
  const [page, setPage] = useState("dashboard");
  const [returnPage, setReturnPage] = useState("dashboard");
  const [selectedCase, setSelectedCase] = useState(null);
  const [myCases, setMyCases] = useState([]);
  const [stats, setStats] = useState({
    total_cases: 0,
    active_cases: 0,
    total_matches: 0,
    evidence_items: 0,
    takedowns_active: 0,
    takedowns_resolved: 0,
    reports_generated: 0
  });
  const [toast, setToast] = useState(null);

  // Search context passed between modules
  const [activeSearchHash, setActiveSearchHash] = useState("");
  const [activeSearchResults, setActiveSearchResults] = useState([]);
  const [activeTakedownTarget, setActiveTakedownTarget] = useState(null);

  // Fetch real cases and stats from FastAPI backend
  useEffect(() => {
    loadPlatformData();
    const interval = setInterval(loadPlatformData, 3000);
    return () => clearInterval(interval);
  }, [page]);

  async function loadPlatformData() {
    try {
      // 1. Fetch Cases
      const caseRes = await fetch(`${API_BASE}/cases/`);
      if (caseRes.ok) {
        const caseData = await caseRes.json();
        setMyCases(caseData);
      }

      // 2. Fetch Stats Summary
      const statsRes = await fetch(`${API_BASE}/cases/stats/summary`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
      console.warn("Backend poll error (is backend running on :8000?):", error.message);
    }
  }

  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  }

  // Navigation helpers
  function navigateToModule(targetPage, origin = "dashboard") {
    setReturnPage(origin);
    setPage(targetPage);
  }

  function handleCaseCreated(newCaseData) {
    if (!newCaseData) {
      setPage("dashboard");
      return;
    }

    fetch(`${API_BASE}/cases/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        case_number: newCaseData.id,
        title: newCaseData.title,
        description: newCaseData.description,
        risk_level: newCaseData.risk_level
      }),
    })
      .then((res) => res.json())
      .then((savedCase) => {
        setMyCases([savedCase, ...myCases]);
        setSelectedCase(savedCase);
        setReturnPage("dashboard");
        setPage("workspace");
        showToast("Case workspace successfully created.", "success");
      })
      .catch((err) => {
        console.error("Case creation error:", err);
        alert("Could not reach backend server on port 8000.");
      });
  }

  // Delete case
  async function handleDeleteCase(caseId) {
    try {
      const response = await fetch(`${API_BASE}/cases/${caseId}`, { method: "DELETE" });
      if (response.ok) {
        setMyCases((prev) => prev.filter((c) => c.id !== caseId));
        if (selectedCase?.id === caseId) {
          setSelectedCase(null);
        }
        showToast("Case deleted successfully.", "success");
      }
    } catch (err) {
      alert("Error deleting case.");
    }
  }

  // Navigation helpers
  function navigateToSearch(hash, results = [], origin = "dashboard") {
    setActiveSearchHash(hash);
    setActiveSearchResults(results);
    setReturnPage(origin);
    setPage("matches");
  }

  function navigateToTakedown(targetMatch, origin = "dashboard") {
    setActiveTakedownTarget(targetMatch);
    setReturnPage(origin);
    setPage("takedowns");
  }

  // --- PAGE ROUTING ---
  if (page === "create-case") {
    return (
      <CreateCase
        returnPage={returnPage}
        onBack={() => setPage(returnPage)}
        onCreated={handleCaseCreated}
      />
    );
  }

  if (page === "workspace") {
    return (
      <CaseWorkspace
        caseData={selectedCase}
        onBack={() => setPage("dashboard")}
        onAnalyzeImage={() => navigateToModule("analyze", "workspace")}
        onAnalyzeVideo={() => navigateToModule("video", "workspace")}
        onOpenMatches={() => navigateToModule("matches", "workspace")}
        onOpenEvidence={() => navigateToModule("evidence", "workspace")}
        onOpenTakedowns={() => navigateToModule("takedowns", "workspace")}
        onOpenLegalCenter={() => navigateToModule("legal", "workspace")}
        onReportGenerated={() => {
          loadPlatformData();
          showToast("Official report generated.", "success");
        }}
        onToast={showToast}
      />
    );
  }

  if (page === "analyze") {
    return (
      <AnalyzeImage
        caseId={selectedCase?.id || 1}
        returnPage={returnPage}
        onBack={() => setPage(returnPage)}
        onSwitchToVideo={() => navigateToModule("video", returnPage)}
        onSearchTriggered={(hash, res) => navigateToSearch(hash, res, returnPage)}
        onEvidenceSaved={() => {
          loadPlatformData();
          showToast("Fingerprint preserved in Evidence Vault.", "success");
        }}
      />
    );
  }

  if (page === "video") {
    return (
      <AnalyzeVideo
        caseId={selectedCase?.id || 1}
        returnPage={returnPage}
        onBack={() => setPage(returnPage)}
        onSwitchToImage={() => navigateToModule("analyze", returnPage)}
        onSearchTriggered={(hash, res) => navigateToSearch(hash, res, returnPage)}
        onEvidenceSaved={() => {
          loadPlatformData();
          showToast("Video fingerprint preserved in Evidence Vault.", "success");
        }}
      />
    );
  }

  if (page === "matches") {
    return (
      <DetectedMatches
        caseData={selectedCase}
        returnPage={returnPage}
        initialHash={activeSearchHash}
        initialResults={activeSearchResults}
        onBack={() => setPage(returnPage)}
        onPreserveEvidence={() => loadPlatformData()}
        onIssueTakedown={(target) => navigateToTakedown(target, returnPage)}
        onAddToComplaint={() => navigateToModule("legal", returnPage)}
        onToast={showToast}
      />
    );
  }

  if (page === "evidence") {
    return (
      <EvidenceVault
        caseData={selectedCase}
        returnPage={returnPage}
        onBack={() => setPage(returnPage)}
        onIssueTakedown={(target) => navigateToTakedown(target, returnPage)}
        onGenerateReport={() => navigateToModule("legal", returnPage)}
        onToast={showToast}
      />
    );
  }

  if (page === "takedowns") {
    return (
      <TakedownCenter
        caseData={selectedCase}
        returnPage={returnPage}
        initialTarget={activeTakedownTarget}
        onBack={() => setPage(returnPage)}
        onToast={showToast}
      />
    );
  }

  if (page === "legal") {
    return (
      <LegalCenter
        caseData={selectedCase}
        returnPage={returnPage}
        onBack={() => setPage(returnPage)}
        onToast={showToast}
      />
    );
  }

  if (page === "my-cases") {
    return (
      <MyCases
        cases={myCases}
        returnPage={returnPage}
        onBack={() => setPage("dashboard")}
        onOpenCase={(item) => {
          setSelectedCase(item);
          setReturnPage("dashboard");
          setPage("workspace");
        }}
        onDeleteCase={handleDeleteCase}
        onCreateNew={() => navigateToModule("create-case", "my-cases")}
      />
    );
  }

  if (page === "reports") {
    return (
      <Reports
        returnPage={returnPage}
        onBack={() => setPage("dashboard")}
        onToast={showToast}
      />
    );
  }

  // --- MAIN PLATFORM DASHBOARD ---
  return (
    <div className="dashboard">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <i className="fa-solid fa-shield-halved"></i>
          </div>
          <div>
            <span className="brand-title">SentinEx-AI</span>
            <span className="brand-sub">Privacy & NCII Defense</span>
          </div>
        </div>

        <nav className="side-nav">
          <div className="nav-category">Core Workflows</div>
          <a
            className={page === "dashboard" ? "active" : ""}
            href="#"
            onClick={(e) => { e.preventDefault(); navigateToModule("dashboard", "dashboard"); }}
          >
            <span className="side-nav-left"><i className="fa-solid fa-gauge-high"></i> Overview</span>
          </a>

          <a
            className={page === "analyze" ? "active" : ""}
            href="#"
            onClick={(e) => { e.preventDefault(); navigateToModule("analyze", "dashboard"); }}
          >
            <span className="side-nav-left"><i className="fa-solid fa-fingerprint"></i> Scan & Fingerprint</span>
          </a>

          <a
            className={page === "matches" ? "active" : ""}
            href="#"
            onClick={(e) => { e.preventDefault(); navigateToModule("matches", "dashboard"); }}
          >
            <span className="side-nav-left"><i className="fa-solid fa-globe"></i> Threat Matches</span>
            {stats.total_matches > 0 && <span className="nav-count-badge">{stats.total_matches}</span>}
          </a>

          <a
            className={page === "evidence" ? "active" : ""}
            href="#"
            onClick={(e) => { e.preventDefault(); navigateToModule("evidence", "dashboard"); }}
          >
            <span className="side-nav-left"><i className="fa-solid fa-box-archive"></i> Evidence Vault</span>
            {stats.evidence_items > 0 && <span className="nav-count-badge">{stats.evidence_items}</span>}
          </a>

          <div className="nav-category" style={{ marginTop: "10px" }}>Legal & Enforcement</div>
          <a
            className={page === "takedowns" ? "active" : ""}
            href="#"
            onClick={(e) => { e.preventDefault(); navigateToModule("takedowns", "dashboard"); }}
          >
            <span className="side-nav-left"><i className="fa-solid fa-bullhorn"></i> Takedown Center</span>
            {stats.takedowns_active > 0 && <span className="nav-count-badge">{stats.takedowns_active}</span>}
          </a>

          <a
            className={page === "legal" ? "active" : ""}
            href="#"
            onClick={(e) => { e.preventDefault(); navigateToModule("legal", "dashboard"); }}
          >
            <span className="side-nav-left"><i className="fa-solid fa-scale-balanced"></i> IT Act Filings</span>
          </a>

          <div className="nav-category" style={{ marginTop: "10px" }}>Management</div>
          <a
            className={page === "my-cases" ? "active" : ""}
            href="#"
            onClick={(e) => { e.preventDefault(); navigateToModule("my-cases", "dashboard"); }}
          >
            <span className="side-nav-left"><i className="fa-solid fa-folder-open"></i> Cases</span>
            <span className="nav-count-badge">{myCases.length}</span>
          </a>

          <a
            className={page === "reports" ? "active" : ""}
            href="#"
            onClick={(e) => { e.preventDefault(); navigateToModule("reports", "dashboard"); }}
          >
            <span className="side-nav-left"><i className="fa-solid fa-file-shield"></i> Reports Archive</span>
            {stats.reports_generated > 0 && <span className="nav-count-badge">{stats.reports_generated}</span>}
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="system-status-indicator">
            <div className="status-left">
              <span className="status-dot-static"></span>
              <span>Client Sandbox</span>
            </div>
            <span className="status-tag-subtle">0 Uploads</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="dashboard-main">
        {/* Topbar */}
        <header className="topbar">
          <div>
            <div className="breadcrumbs">
              <span>SentinEx Platform</span>
              <span>/</span>
              <span>Dashboard</span>
            </div>
            <h1 className="topbar-title">Investigation Overview</h1>
          </div>
          <div className="topbar-actions">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigateToModule("analyze", "dashboard")}
            >
              <i className="fa-solid fa-fingerprint"></i> Quick Scan
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigateToModule("create-case", "dashboard")}
            >
              <i className="fa-solid fa-plus"></i> New Investigation
            </button>
          </div>
        </header>

        {/* Metrics Ribbon */}
        <section className="metrics-ribbon">
          <div className="metric-kpi-card" onClick={() => navigateToModule("my-cases", "dashboard")}>
            <div className="kpi-header">
              <span className="kpi-label">Active Cases</span>
              <span className="kpi-icon"><i className="fa-solid fa-folder-open"></i></span>
            </div>
            <div className="kpi-value">{stats.active_cases}</div>
            <div className="kpi-sub">Total {myCases.length} registered</div>
          </div>

          <div className="metric-kpi-card" onClick={() => navigateToModule("matches", "dashboard")}>
            <div className="kpi-header">
              <span className="kpi-label">Threat Matches</span>
              <span className="kpi-icon" style={{ color: "#d97706" }}><i className="fa-solid fa-globe"></i></span>
            </div>
            <div className="kpi-value" style={{ color: "#d97706" }}>{stats.total_matches}</div>
            <div className="kpi-sub">Across indexed hosts</div>
          </div>

          <div className="metric-kpi-card" onClick={() => navigateToModule("evidence", "dashboard")}>
            <div className="kpi-header">
              <span className="kpi-label">Evidence Vault</span>
              <span className="kpi-icon" style={{ color: "#059669" }}><i className="fa-solid fa-box-archive"></i></span>
            </div>
            <div className="kpi-value" style={{ color: "#059669" }}>{stats.evidence_items}</div>
            <div className="kpi-sub">SHA-256 sealed items</div>
          </div>

          <div className="metric-kpi-card" onClick={() => navigateToModule("takedowns", "dashboard")}>
            <div className="kpi-header">
              <span className="kpi-label">Active Takedowns</span>
              <span className="kpi-icon" style={{ color: "#dc2626" }}><i className="fa-solid fa-bullhorn"></i></span>
            </div>
            <div className="kpi-value" style={{ color: "#dc2626" }}>{stats.takedowns_active}</div>
            <div className="kpi-sub">24-hr removal demands</div>
          </div>

          <div className="metric-kpi-card" onClick={() => navigateToModule("reports", "dashboard")}>
            <div className="kpi-header">
              <span className="kpi-label">IT Act Filings</span>
              <span className="kpi-icon" style={{ color: "#7c3aed" }}><i className="fa-solid fa-scale-balanced"></i></span>
            </div>
            <div className="kpi-value" style={{ color: "#7c3aed" }}>{stats.reports_generated}</div>
            <div className="kpi-sub">NCRP legal packages</div>
          </div>
        </section>

        {/* Quick Workflow Launchers */}
        <div className="section-header-row" style={{ marginTop: "8px" }}>
          <div>
            <h2 className="section-header-title">Investigation Workflows</h2>
            <p className="section-header-desc">Zero-knowledge tools for evidence preservation and removal</p>
          </div>
        </div>

        <section className="workflow-grid">
          <div className="workflow-card" onClick={() => navigateToModule("analyze", "dashboard")}>
            <div className="workflow-icon-wrap">
              <i className="fa-solid fa-camera"></i>
            </div>
            <h3>Scan Image Locally</h3>
            <p>Compute perceptual hashes (pHash) and detect deepfake synthesis without uploading files.</p>
            <span className="workflow-card-action">Launch Scanner <i className="fa-solid fa-arrow-right"></i></span>
          </div>

          <div className="workflow-card" onClick={() => navigateToModule("video", "dashboard")}>
            <div className="workflow-icon-wrap" style={{ background: "#f3e8ff", borderColor: "#d8b4fe", color: "#7c3aed" }}>
              <i className="fa-solid fa-film"></i>
            </div>
            <h3>Scan Video Stream</h3>
            <p>Sample video keyframes in-browser to identify face swaps, boundary artifacts, and motion anomalies.</p>
            <span className="workflow-card-action" style={{ color: "#7c3aed" }}>Launch Video Inspector <i className="fa-solid fa-arrow-right"></i></span>
          </div>

          <div className="workflow-card" onClick={() => navigateToModule("matches", "dashboard")}>
            <div className="workflow-icon-wrap" style={{ background: "#fffbeb", borderColor: "#fde68a", color: "#d97706" }}>
              <i className="fa-solid fa-magnifying-glass"></i>
            </div>
            <h3>Threat Discovery</h3>
            <p>Query open-web repositories and cyberlockers using anonymized perceptual hash digests.</p>
            <span className="workflow-card-action" style={{ color: "#d97706" }}>Review Matches <i className="fa-solid fa-arrow-right"></i></span>
          </div>

          <div className="workflow-card" onClick={() => navigateToModule("takedowns", "dashboard")}>
            <div className="workflow-icon-wrap" style={{ background: "#fef2f2", borderColor: "#fecaca", color: "#dc2626" }}>
              <i className="fa-solid fa-bullhorn"></i>
            </div>
            <h3>Issue 24-Hr Takedown</h3>
            <p>Draft and dispatch formal statutory removal notices under IT Rules 2021 Rule 3(2)(b).</p>
            <span className="workflow-card-action" style={{ color: "#dc2626" }}>Open Takedown Hub <i className="fa-solid fa-arrow-right"></i></span>
          </div>
        </section>

        {/* Active Cases Section */}
        <section className="section-container" style={{ marginTop: "24px" }}>
          <div className="section-header-row">
            <div>
              <h2 className="section-header-title">Recent Case Workspaces</h2>
              <p className="section-header-desc">Track active evidence lockers and intermediary correspondence</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigateToModule("my-cases", "dashboard")}>
              View All ({myCases.length}) <i className="fa-solid fa-arrow-right" style={{ marginLeft: "4px" }}></i>
            </button>
          </div>

          <div className="case-list">
            {myCases.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--text-muted)" }}>
                <i className="fa-solid fa-folder-open" style={{ fontSize: "28px", marginBottom: "8px", display: "block" }}></i>
                <strong style={{ display: "block", color: "var(--text-primary)", marginBottom: "4px" }}>No Active Investigations</strong>
                <p style={{ fontSize: "12.5px", marginBottom: "12px" }}>Create a case workspace to organize evidence, matches, and legal takedown notices.</p>
                <button className="btn btn-primary btn-sm" onClick={() => navigateToModule("create-case", "dashboard")}>
                  <i className="fa-solid fa-plus"></i> Create Case
                </button>
              </div>
            ) : (
              myCases.slice(0, 4).map((item) => (
                <div className="case-card" key={item.id}>
                  <div className="case-left">
                    <div className="case-icon">
                      <i className="fa-solid fa-folder-closed"></i>
                    </div>
                    <div>
                      <h3>{item.title}</h3>
                      <p>
                        <b>{item.case_number}</b> · Severity: <span className={`risk-pill risk-${item.risk_level?.toLowerCase() || 'medium'}`}>{item.risk_level || "Medium"}</span> · {item.created_at || "Recent"}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <span className="badge badge-evidence">
                      {item.status || "Detected"}
                    </span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setSelectedCase(item);
                        setReturnPage("dashboard");
                        setPage("workspace");
                      }}
                    >
                      Open <i className="fa-solid fa-arrow-right" style={{ marginLeft: "4px" }}></i>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Legal & Privacy Notice */}
        <div className="privacy-notice" style={{ marginTop: "16px" }}>
          <span style={{ color: "var(--primary)", fontSize: "16px" }}>
            <i className="fa-solid fa-shield-halved"></i>
          </span>
          <div>
            <strong>Statutory Framework & Privacy Guarantee</strong>
            <p>
              Non-consensual image sharing is punishable under Sections 66E, 67, and 67A of the Information Technology Act, 2000. 
              Rule 3(2)(b) of the Intermediary Guidelines mandates 24-hour intermediary removal. All visual fingerprinting runs 100% locally in your browser memory.
            </p>
          </div>
        </div>
      </main>

      {/* Toast Notification */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            <span className="toast-icon">
              {toast.type === "success" ? (
                <i className="fa-solid fa-circle-check"></i>
              ) : (
                <i className="fa-solid fa-triangle-exclamation"></i>
              )}
            </span>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;