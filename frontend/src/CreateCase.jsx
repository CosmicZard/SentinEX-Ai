import { useState } from "react";

function CreateCase({ onBack, onCreated }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    source: "Unknown / Multiple Online Sources",
    risk_level: "High"
  });

  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.title.trim()) {
      alert("Please enter a case title.");
      return;
    }

    setLoading(true);
    const newCase = {
      id: `SE-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      title: form.title.trim(),
      description: form.description ? `${form.description} (Source: ${form.source})` : `Case initialized for tracking unauthorized media from ${form.source}.`,
      risk_level: form.risk_level,
      status: "Detected"
    };

    onCreated(newCase);
  }

  return (
    <div className="case-page">
      <div className="case-header">
        <button className="back-button" onClick={onBack}>
          <i className="fa-solid fa-arrow-left"></i> Back to Dashboard
        </button>

        <div>
          <div className="breadcrumbs" style={{ marginBottom: "4px" }}>
            <span>Case Management</span>
            <span>/</span>
            <span>New Investigation</span>
          </div>
          <h1 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>
            Create New Case Workspace
          </h1>
        </div>
      </div>

      <div className="case-layout">
        <form className="case-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <p className="section-label">CASE CONFIGURATION</p>
            <h2>Start a New Investigation</h2>
            <p className="form-description">
              Set up a secure case environment. You can scan media, discover leaked copies, 
              preserve cryptographic evidence, and generate takedowns inside this workspace.
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="title">
              Case Title <span>*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              placeholder="e.g. Unauthorized Photo Leak Investigation"
              value={form.title}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label htmlFor="risk_level">Threat Severity Assessment</label>
              <select
                id="risk_level"
                name="risk_level"
                value={form.risk_level}
                onChange={handleChange}
                className="select-input"
              >
                <option value="Critical">Critical (Immediate Dissemination Threat)</option>
                <option value="High">High (Multiple Unverified Copies)</option>
                <option value="Medium">Medium (Single Suspect Source)</option>
                <option value="Low">Low (Monitoring / Preemptive Protection)</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="source">Suspected Platform or Source</label>
              <input
                id="source"
                name="source"
                type="text"
                placeholder="e.g. Telegram Channel / Anon Forum / CyberLocker"
                value={form.source}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Incident Summary & Context</label>
            <textarea
              id="description"
              name="description"
              rows="4"
              placeholder="Describe the incident, timestamps of discovery, or known details..."
              value={form.description}
              onChange={handleChange}
            />
          </div>

          <div className="privacy-box">
            <span style={{ color: "#059669", fontSize: "18px" }}>
              <i className="fa-solid fa-lock"></i>
            </span>
            <div>
              <strong>Zero-Knowledge Assurance</strong>
              <p>
                Case metadata is stored securely in your encrypted database. Raw media will never be uploaded to remote servers.
              </p>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="secondary-button" onClick={onBack}>
              Cancel
            </button>

            <button type="submit" className="create-button" disabled={loading}>
              {loading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: "6px" }}></i> Creating Workspace...
                </>
              ) : (
                <>
                  Create Case Workspace <i className="fa-solid fa-arrow-right" style={{ marginLeft: "6px" }}></i>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="case-info-card">
          <div className="info-icon" style={{ color: "#059669" }}>
            <i className="fa-solid fa-shield-halved"></i>
          </div>
          <h3>Investigation Workflow</h3>

          <div className="info-step">
            <span>01</span>
            <p><b>Scan Media:</b> Generate on-device visual fingerprints (pHash) without uploading raw files.</p>
          </div>

          <div className="info-step">
            <span>02</span>
            <p><b>Threat Discovery:</b> Query open-web indices using anonymized hash tokens.</p>
          </div>

          <div className="info-step">
            <span>03</span>
            <p><b>Evidence Vault:</b> Preserve URLs and tamper-evident SHA-256 tokens.</p>
          </div>

          <div className="info-step">
            <span>04</span>
            <p><b>Takedown & IT Act Notice:</b> Issue 24-hr removal demands and NCRP complaint drafts.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateCase;
