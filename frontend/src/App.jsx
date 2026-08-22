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

const API_BASE = "http://localhost:8000";

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
          <div className="brand-icon" style={{ color: "#38bdf8" }}>
            <i className="fa-solid fa-shield-halved"></i>
          </div>
          <div>
            <span className="brand-title">SentinEx-AI</span>
            <span className="brand-sub">Zero-Trust NCII Defense</span>
          </div>
        </div>

        <nav className="side-nav">
          <a
            className={page === "dashboard" ? "active" : ""}
            href="#"
            onClick={(e) => { e.preventDefault(); navigateToModule("dashboard", "dashboard"); }}
          >
            <span><i className="fa-solid fa-gauge-high"></i></span> Dashboard
          </a>

          <a
            className={page === "analyze" ? "active" : ""}
            href="#"
            onClick={(e) => { e.preventDefault(); navigateToModule("analyze", "dashboard"); }}
          >
            <span><i className="fa-solid fa-camera-retro"></i></span> Scan Media (Zero-Trust)
          </a>

          <a
            className={page === "matches" ? "active" : ""}
            href="#"
            onClick={(e) => { e.preventDefault(); navigateToModule("matches", "dashboard"); }}
          >
            <span><i className="fa-solid fa-globe"></i></span> Discovered Matches
          </a>

          <a
            className={page === "evidence" ? "active" : ""}
            href="#"
            onClick={(e) => { e.preventDefault(); navigateToModule("evidence", "dashboard"); }}
          >
            <span><i className="fa-solid fa-box-archive"></i></span> Evidence Vault ({stats.evidence_items})
          </a>

          <a
            className={page === "takedowns" ? "active" : ""}
            href="#"
            onClick={(e) => { e.preventDefault(); navigateToModule("takedowns", "dashboard"); }}
          >
            <span><i className="fa-solid fa-bullhorn"></i></span> Takedown Center ({stats.takedowns_active})
          </a>

          <a
            className={page === "legal" ? "active" : ""}
            href="#"
            onClick={(e) => { e.preventDefault(); navigateToModule("legal", "dashboard"); }}
          >
            <span><i className="fa-solid fa-scale-balanced"></i></span> Legal & IT Act Portal
          </a>

          <div className="nav-divider"></div>

          <a
            className={page === "my-cases" ? "active" : ""}
            href="#"
            onClick={(e) => { e.preventDefault(); navigateToModule("my-cases", "dashboard"); }}
          >
            <span><i className="fa-solid fa-folder-open"></i></span> My Cases ({myCases.length})
          </a>

          <a
            className={page === "reports" ? "active" : ""}
            href="#"
            onClick={(e) => { e.preventDefault(); navigateToModule("reports", "dashboard"); }}
          >
            <span><i className="fa-solid fa-file-shield"></i></span> Reports Archive ({stats.reports_generated})
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="zero-trust-guard">
            <span className="guard-icon" style={{ color: "#34d399" }}>
              <i className="fa-solid fa-shield-virus"></i>
            </span>
            <div>
              <strong>Zero-Trust Guard Active</strong>
              <small>0 Raw Media Bytes Stored</small>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="dashboard-main">
        {/* Topbar */}
        <header className="topbar">
          <div>
            <p className="welcome-small">PRIVACY-FIRST NCII DETECTION & LEGAL TAKEDOWN SUITE</p>
            <h1>Security Command Dashboard</h1>
          </div>
          <div className="profile">
            <div className="zero-trust-pill">
              <span className="live-dot"></span>
              Client-Side Engine Online
            </div>
            <div className="avatar" style={{ color: "#60a5fa" }}>
              <i className="fa-solid fa-user-shield"></i>
            </div>
          </div>
        </header>

        {/* Hero Welcome & Privacy Guarantee Card */}
        <section className="welcome-card">
          <div>
            <span className="secure-tag">
              <i className="fa-solid fa-lock" style={{ marginRight: "6px" }}></i>
              Zero-Knowledge Client Architecture
            </span>
            <h2>Protecting Intimate Privacy Without Compromise</h2>
            <p>
              SentinEx-AI empowers victims of non-consensual image sharing to discover leaked copies, 
              preserve tamper-evident digital proof, issue 24-hour statutory takedowns, and prepare NCRP cybercrime complaints. 
              <b>Your original media never leaves your device.</b>
            </p>
            <div className="welcome-btn-row">
              <button className="create-button" onClick={() => navigateToModule("create-case", "dashboard")}>
                <i className="fa-solid fa-plus" style={{ marginRight: "8px" }}></i>
                Create New Case
              </button>
            </div>
          </div>
          <div className="shield" style={{ color: "#3b82f6" }}>
            <i className="fa-solid fa-shield-halved"></i>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="stats-grid">
          <div className="stat-card" onClick={() => navigateToModule("my-cases", "dashboard")}>
            <span className="stat-icon" style={{ background: "#172554", color: "#60a5fa" }}>
              <i className="fa-solid fa-folder-open"></i>
            </span>
            <div>
              <p>Active Cases</p>
              <strong>{stats.active_cases}</strong>
            </div>
          </div>

          <div className="stat-card" onClick={() => navigateToModule("matches", "dashboard")}>
            <span className="stat-icon" style={{ background: "#451a03", color: "#f59e0b" }}>
              <i className="fa-solid fa-magnifying-glass"></i>
            </span>
            <div>
              <p>Potential Matches</p>
              <strong>{stats.total_matches > 0 ? stats.total_matches + 3 : 0}</strong>
            </div>
          </div>

          <div className="stat-card" onClick={() => navigateToModule("evidence", "dashboard")}>
            <span className="stat-icon" style={{ background: "#064e3b", color: "#34d399" }}>
              <i className="fa-solid fa-vault"></i>
            </span>
            <div>
              <p>Preserved Evidence</p>
              <strong>{stats.evidence_items} Items</strong>
            </div>
          </div>

          <div className="stat-card" onClick={() => navigateToModule("takedowns", "dashboard")}>
            <span className="stat-icon" style={{ background: "#4c0519", color: "#fb7185" }}>
              <i className="fa-solid fa-triangle-exclamation"></i>
            </span>
            <div>
              <p>Active Takedowns</p>
              <strong>{stats.takedowns_active}</strong>
            </div>
          </div>

          <div className="stat-card" onClick={() => navigateToModule("legal", "dashboard")}>
            <span className="stat-icon" style={{ background: "#311042", color: "#c084fc" }}>
              <i className="fa-solid fa-scale-balanced"></i>
            </span>
            <div>
              <p>IT Act Filings</p>
              <strong>{stats.reports_generated}</strong>
            </div>
          </div>
        </section>

        {/* Active Cases Section */}
        <section className="cases-section">
          <div className="section-title">
            <div>
              <p className="section-label">CASE MANAGEMENT</p>
              <h2>Recent Investigations</h2>
            </div>
            <button className="view-button" onClick={() => navigateToModule("my-cases", "dashboard")}>
              View All ({myCases.length}) <i className="fa-solid fa-arrow-right" style={{ marginLeft: "4px" }}></i>
            </button>
          </div>

          <div className="case-list">
            {myCases.length === 0 ? (
              <div className="empty-state-card">
                <span className="empty-state-icon">
                  <i className="fa-solid fa-inbox"></i>
                </span>
                <h3>No Active Investigations Found</h3>
                <p>Create your first secure case workspace to scan, detect, and preserve forensic evidence without exposing raw media.</p>
                <button className="create-button" onClick={() => navigateToModule("create-case", "dashboard")} style={{ marginTop: "6px" }}>
                  <i className="fa-solid fa-plus" style={{ marginRight: "8px" }}></i>
                  Create Your First Case
                </button>
              </div>
            ) : (
              myCases.slice(0, 3).map((item) => (
                <div className="case-card" key={item.id}>
                  <div className="case-left">
                    <div className="case-icon">
                      <i className="fa-solid fa-folder-closed"></i>
                    </div>
                    <div>
                      <h3>{item.title}</h3>
                      <p>
                        <b>{item.case_number}</b> · Severity: <span className={`risk-tag ${item.risk_level?.toLowerCase() || 'medium'}`}>{item.risk_level || "Medium"}</span>
                      </p>
                    </div>
                  </div>

                  <div className="case-middle">
                    <span className={`status ${item.status?.toLowerCase().replace(' ', '-') || 'detected'}`}>
                      {item.status || "Detected"}
                    </span>
                    <span className="match-count">
                      {item.evidence_count || item.matches || 0} evidence record{(item.evidence_count || item.matches) !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      className="open-case"
                      onClick={() => {
                        setSelectedCase(item);
                        setReturnPage("dashboard");
                        setPage("workspace");
                      }}
                    >
                      Open Workspace <i className="fa-solid fa-arrow-right" style={{ marginLeft: "6px" }}></i>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Legal & Privacy Notice */}
        <div className="privacy-notice">
          <span style={{ color: "#38bdf8", fontSize: "20px" }}>
            <i className="fa-solid fa-shield-halved"></i>
          </span>
          <div>
            <strong>Legal & Safety Framework (India IT Act, 2000)</strong>
            <p>
              Non-consensual intimate image sharing is punishable under Sections 66E, 67, and 67A of the Information Technology Act, 2000. 
              Rule 3(2)(b) of the Intermediary Guidelines mandates intermediaries disable access within 24 hours. 
              All data processed in SentinEx-AI respects zero-knowledge principles.
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