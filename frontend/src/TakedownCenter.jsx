import React, { useState, useEffect } from "react";

const API_BASE = "http://localhost:8000";

const KNOWN_HOSTS = {
  "Cloudflare / OVH": "abuse@cloudflare.com",
  "AWS (Amazon Web Services)": "abuse@amazonaws.com",
  "DigitalOcean": "abuse@digitalocean.com",
  "Hetzner Online": "abuse@hetzner.com",
  "Namecheap Hosting": "abuse@namecheap.com",
  "Reddit Inc.": "abuse@reddit.com",
  "Telegram Messenger": "abuse@telegram.org",
  "Imgur Media": "abuse@imgur.com",
  "CyberLocker Vault": "abuse@cyberlocker-vault.net",
  "Custom / Other Provider": "abuse@provider.com"
};

function TakedownCenter({ caseData, returnPage = "dashboard", initialTarget, onBack, onToast }) {
  const [takedowns, setTakedowns] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form state for generating a new notice
  const [targetUrl, setTargetUrl] = useState(initialTarget?.url || initialTarget?.source_url || "https://cyberlocker-vault.net/dl/f9024a1b/private_leak_01.jpg");
  const [selectedHost, setSelectedHost] = useState(initialTarget?.hosting_provider || "Cloudflare / OVH");
  const [abuseEmail, setAbuseEmail] = useState(initialTarget?.abuse_email || KNOWN_HOSTS["Cloudflare / OVH"]);
  const [legalFramework, setLegalFramework] = useState("IT_ACT_INDIA");
  const [generatedNotice, setGeneratedNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadTakedowns();
    generateNoticeDraft();
  }, [caseData, targetUrl, selectedHost, abuseEmail, legalFramework]);

  async function loadTakedowns() {
    setLoading(true);
    try {
      const url = caseData?.id ? `${API_BASE}/takedowns/?case_id=${caseData.id}` : `${API_BASE}/takedowns/`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTakedowns(data);
      }
    } catch (err) {
      console.error("Failed to load takedowns:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleHostChange(e) {
    const host = e.target.value;
    setSelectedHost(host);
    setAbuseEmail(KNOWN_HOSTS[host] || "abuse@domain.com");
  }

  function generateNoticeDraft() {
    const nowStr = new Date().toUTCString();
    let statuteCitations = "";

    if (legalFramework === "IT_ACT_INDIA") {
      statuteCitations = `• Section 66E, Information Technology Act, 2000 (Violation of Bodily Privacy)
• Section 67 & 67A, Information Technology Act, 2000 (Transmitting Obscene / Sexually Explicit Material)
• Rule 3(2)(b), Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 (MANDATORY 24-HOUR REMOVAL UPON RECEIPT)
• Section 354C, Indian Penal Code (Voyeurism)`;
    } else {
      statuteCitations = `• Title 17 U.S.C. § 512(c) (DMCA Statutory Notice of Infringement)
• EU Digital Services Act (DSA) Article 16 (Notice & Action Mechanism)
• Mandatory Intermediary Liability Exemption Revocation for Unlawful Intimate Content`;
    }

    const text = `SENTINEX-AI AUTOMATED STATUTORY TAKEDOWN NOTICE

TO: Abuse & Legal Compliance Department
COMPANY: ${selectedHost} (${abuseEmail})
DATE: ${nowStr}
SUBJECT: URGENT: 24-Hour Mandatory Takedown Demand — Non-Consensual Intimate Imagery (NCII)

Dear Compliance Officer,

This document constitutes formal statutory notification that unauthorized non-consensual intimate imagery (NCII) is currently being hosted, cached, or transmitted via infrastructure under your control.

1. INFRINGING MATERIAL LOCATION:
• Infringing URL: ${targetUrl}
• Hosting Platform: ${selectedHost}
• Linked Case Reference: ${caseData?.case_number || "SE-2026-CONFIDENTIAL"}

2. SUGGESTED / RELEVANT STATUTORY CITATIONS:
${statuteCitations}

3. IMMEDIATE ACTION REQUIRED:
Pursuant to Rule 3(2)(b) of the IT Rules 2021 and international intermediary standards, you are formally required to immediately disable access to, expunge, and remove the content specified at the above URL within 24 HOURS of receipt of this notice.

4. LOG PRESERVATION OBLIGATION:
You are further requested to preserve all IP connection logs, upload timestamps, account records, and billing identifiers associated with this content for criminal investigation by cyber law enforcement agencies.

CONFIDENTIALITY:
The victim's identity is protected. This notice is generated via SentinEx-AI Zero-Trust Verification Protocol.

Sincerely,
Authorized Representative / Complainant
SentinEx-AI Case Security ID: ${caseData?.case_number || "SE-2026-VERIFIED"}`;

    setGeneratedNotice(text);
  }

  async function handleSaveTakedown() {
    if (!caseData?.id) {
      alert("Please open or select an active case first.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/takedowns/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: Number(caseData.id),
          target_url: targetUrl,
          hosting_provider: selectedHost,
          provider_email: abuseEmail,
          notice_text: generatedNotice
        })
      });

      if (res.ok) {
        if (onToast) onToast("Takedown notice created and logged in case.", "success");
        loadTakedowns();
      }
    } catch (err) {
      alert("Error saving takedown.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange(takedownId, newStatus) {
    try {
      const res = await fetch(`${API_BASE}/takedowns/${takedownId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        setTakedowns(takedowns.map(t => t.id === takedownId ? { ...t, status: newStatus } : t));
        if (onToast) onToast(`Takedown #${takedownId} status updated to: ${newStatus}`, "success");
      }
    } catch (err) {
      alert("Failed to update status.");
    }
  }

  function copyNotice() {
    navigator.clipboard.writeText(generatedNotice);
    if (onToast) onToast("Notice text copied to clipboard.", "success");
  }

  function sendEmail() {
    const subject = encodeURIComponent(`URGENT: 24-Hour Takedown Demand - NCII Violation (${caseData?.case_number || "SE-2026"})`);
    const body = encodeURIComponent(generatedNotice);
    window.open(`mailto:${abuseEmail}?subject=${subject}&body=${body}`, "_blank");
  }

  function downloadNoticeText() {
    const blob = new Blob([generatedNotice], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SentinEx_Takedown_Notice_${caseData?.case_number || "Case"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="case-workspace">
      {/* Top Header */}
      <div className="workspace-top">
        <button className="back-button" onClick={onBack}>
          <i className="fa-solid fa-arrow-left"></i> Back to {returnPage === "workspace" ? "Workspace" : "Dashboard"}
        </button>
        <div>
          <div className="breadcrumbs" style={{ marginBottom: "4px" }}>
            <span>Takedown Center</span>
            <span>/</span>
            <span>24-Hour Statutory Intermediary Removal</span>
          </div>
          <h1 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>
            Automated Takedown Center & Notice Hub
          </h1>
          <p style={{ fontSize: "12.5px", color: "var(--text-muted)", marginTop: "2px" }}>
            {caseData ? `Case: ${caseData.title} (${caseData.case_number})` : "General Takedown Operations"}
          </p>
        </div>
      </div>

      <div className="takedown-layout" style={{ width: "100%" }}>
        {/* Left Column: Notice Generator */}
        <section className="workspace-card">
          <div className="section-title-row">
            <div>
              <p className="section-label">TAKEDOWN BUILDER</p>
              <h2>Generate Statutory Takedown Demand</h2>
            </div>
            <span className="badge badge-takedown">
              <i className="fa-solid fa-stopwatch"></i> 24-Hour Removal Rule
            </span>
          </div>

          <div className="form-group" style={{ marginTop: "15px" }}>
            <label>Target Infringing URL:</label>
            <input
              type="text"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              className="vault-search-input"
              placeholder="https://example-host.com/leak/image.jpg"
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Hosting / Cloud Provider:</label>
              <select
                value={selectedHost}
                onChange={handleHostChange}
                className="select-input"
              >
                {Object.keys(KNOWN_HOSTS).map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Provider Abuse Email:</label>
              <input
                type="email"
                value={abuseEmail}
                onChange={(e) => setAbuseEmail(e.target.value)}
                className="vault-search-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Governing Legal Framework:</label>
            <div className="radio-pill-group">
              <label className={`radio-pill ${legalFramework === "IT_ACT_INDIA" ? "active" : ""}`}>
                <input
                  type="radio"
                  name="framework"
                  checked={legalFramework === "IT_ACT_INDIA"}
                  onChange={() => setLegalFramework("IT_ACT_INDIA")}
                  hidden
                />
                India IT Act (Sec 66E/67A & Rule 3(2)(b) - 24hr Mandate)
              </label>
              <label className={`radio-pill ${legalFramework === "DMCA_DSA" ? "active" : ""}`}>
                <input
                  type="radio"
                  name="framework"
                  checked={legalFramework === "DMCA_DSA"}
                  onChange={() => setLegalFramework("DMCA_DSA")}
                  hidden
                />
                International (DMCA § 512 / EU DSA Art. 16)
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>Generated Notice Preview:</label>
            <textarea
              rows={10}
              value={generatedNotice}
              onChange={(e) => setGeneratedNotice(e.target.value)}
              className="notice-preview-textarea"
            />
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
            <button className="btn btn-secondary" onClick={copyNotice}>
              <i className="fa-solid fa-copy"></i> Copy Notice Text
            </button>
            <button className="btn btn-secondary" onClick={sendEmail}>
              <i className="fa-solid fa-envelope"></i> Open Mail Client
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSaveTakedown}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Logging Notice...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-box-archive"></i> Log in Case Tracker
                </>
              )}
            </button>
          </div>
        </section>

        {/* Active Takedown Tracker Table */}
        <section className="section-container" style={{ marginTop: "24px" }}>
          <div className="section-header-row">
            <div>
              <h2 className="section-header-title">Active Takedown Requests ({takedowns.length})</h2>
              <p className="section-header-desc">Track compliance status across target hosts</p>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "20px", marginBottom: "8px" }}></i>
              <p>Loading takedowns...</p>
            </div>
          ) : takedowns.length === 0 ? (
            <div style={{ textAlign: "center", padding: "36px 16px", color: "var(--text-muted)" }}>
              <i className="fa-solid fa-bullhorn" style={{ fontSize: "28px", color: "var(--primary)", marginBottom: "8px", display: "block" }}></i>
              <strong style={{ display: "block", color: "var(--text-primary)", marginBottom: "4px" }}>No Takedowns Logged</strong>
              <p style={{ fontSize: "12.5px" }}>Use the generator above to create and track removal requests sent to hosting providers.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Target URL & Host</th>
                    <th>Recipient</th>
                    <th>Current Status</th>
                    <th>Update Status</th>
                  </tr>
                </thead>
                <tbody>
                  {takedowns.map((t) => (
                    <tr key={t.id}>
                      <td><strong>#{t.id}</strong></td>
                      <td>
                        <strong style={{ display: "block", color: "var(--text-primary)" }}>{t.hosting_provider}</strong>
                        <div style={{ fontSize: "12px", color: "var(--text-muted)", maxWidth: "280px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.target_url}</div>
                      </td>
                      <td><small style={{ color: "var(--text-muted)" }}>{t.provider_email}</small></td>
                      <td>
                        <span className={`badge ${t.status === "Removed" || t.status === "Resolved" ? "badge-resolved" : "badge-takedown"}`}>
                          {t.status}
                        </span>
                      </td>
                      <td>
                        <select
                          value={t.status}
                          onChange={(e) => handleStatusChange(t.id, e.target.value)}
                          className="stage-select-compact"
                        >
                          <option value="Draft">Draft</option>
                          <option value="Sent">Sent</option>
                          <option value="Acknowledged">Acknowledged</option>
                          <option value="Under Review">Under Review</option>
                          <option value="Removed">Removed</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default TakedownCenter;
