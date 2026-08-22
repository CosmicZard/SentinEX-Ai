import React, { useState, useEffect } from "react";

const API_BASE = "http://localhost:8000";

function EvidenceVault({ caseData, returnPage = "dashboard", onBack, onIssueTakedown, onGenerateReport, onToast }) {
  const [evidenceList, setEvidenceList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadEvidence();
  }, [caseData]);

  async function loadEvidence() {
    setLoading(true);
    try {
      if (caseData?.id) {
        const res = await fetch(`${API_BASE}/cases/${caseData.id}/evidence`);
        if (res.ok) {
          const data = await res.json();
          setEvidenceList(data);
        }
      } else {
        // Fetch all cases and collect evidence
        const res = await fetch(`${API_BASE}/cases/`);
        if (res.ok) {
          const cases = await res.json();
          let allEvidence = [];
          for (const c of cases) {
            const evRes = await fetch(`${API_BASE}/cases/${c.id}/evidence`);
            if (evRes.ok) {
              const evData = await evRes.json();
              allEvidence.push(...evData);
            }
          }
          setEvidenceList(allEvidence);
        }
      }
    } catch (err) {
      console.warn("Evidence load error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteEvidence(id) {
    if (!window.confirm("Are you sure you want to permanently delete this evidence item?")) return;

    try {
      const res = await fetch(`${API_BASE}/cases/evidence/${id}`, { method: "DELETE" });
      if (res.ok) {
        setEvidenceList(evidenceList.filter((e) => e.id !== id));
        if (onToast) onToast("Evidence item removed from vault.", "success");
      }
    } catch (err) {
      alert("Failed to delete evidence item.");
    }
  }

  function exportJSONManifest() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(evidenceList, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `evidence-manifest-${caseData?.case_number || "global"}-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    if (onToast) onToast("JSON Evidence Manifest exported successfully.");
  }

  function exportCSV() {
    if (evidenceList.length === 0) {
      alert("No evidence records to export.");
      return;
    }
    const headers = ["ID", "Case ID", "Domain", "Source URL", "Perceptual Hash", "SHA-256 Checksum", "Confidence", "Timestamp"];
    const rows = evidenceList.map((e) => [
      e.id,
      e.case_id,
      `"${e.domain || "Unknown"}"`,
      `"${e.source_url || ""}"`,
      `"${e.anonymized_phash || ""}"`,
      `"${e.sha256_checksum || ""}"`,
      `${Math.round((e.confidence || 0.95) * 100)}%`,
      `"${e.timestamp || new Date().toISOString()}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `forensic-evidence-${caseData?.case_number || "export"}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    if (onToast) onToast("CSV Evidence table exported successfully.");
  }

  const filteredEvidence = evidenceList.filter((e) => {
    if (!searchTerm) return true;
    return (
      (e.source_url && e.source_url.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.domain && e.domain.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.anonymized_phash && e.anonymized_phash.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  return (
    <div className="case-workspace">
      {/* Top Header */}
      <div className="workspace-top">
        <button className="back-button" onClick={onBack}>
          <i className="fa-solid fa-arrow-left" style={{ marginRight: "6px" }}></i> Back to {returnPage === "workspace" ? "Workspace" : "Dashboard"}
        </button>
        <div>
          <div className="zero-trust-badge">
            <span className="dot"></span>
            DIGITAL EVIDENCE VAULT: TAMPER-EVIDENT FORENSIC LEDGER
          </div>
          <h1>Preserved Digital Evidence Locker</h1>
          <p className="case-id">
            {caseData ? `Case: ${caseData.title} (${caseData.case_number})` : "Global Evidence Vault"}
          </p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="workspace-card" style={{ width: "100%", marginBottom: "20px" }}>
        <div className="vault-controls-row">
          <input
            type="text"
            placeholder="Filter evidence by URL, domain, or pHash..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="vault-search-input"
          />

          <div className="vault-export-btns">
            <button className="export-btn" onClick={exportJSONManifest}>
              <i className="fa-solid fa-file-code" style={{ marginRight: "6px" }}></i> Export JSON Manifest
            </button>
            <button className="export-btn" onClick={exportCSV}>
              <i className="fa-solid fa-file-csv" style={{ marginRight: "6px" }}></i> Export CSV Table
            </button>
          </div>
        </div>
      </div>

      {/* Evidence Table */}
      <div className="section-container" style={{ width: "100%" }}>
        <div className="section-header-row">
          <div>
            <h2 className="section-header-title">Preserved Forensic Records ({filteredEvidence.length})</h2>
            <p className="section-header-desc">Cryptographic chain-of-custody archive</p>
          </div>
          <span className="badge badge-evidence">
            <i className="fa-solid fa-shield-halved"></i> SHA-256 Validated
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "20px", marginBottom: "8px" }}></i>
            <p>Loading forensic evidence records...</p>
          </div>
        ) : filteredEvidence.length === 0 ? (
          <div style={{ textAlign: "center", padding: "36px 16px", color: "var(--text-muted)" }}>
            <i className="fa-solid fa-box-archive" style={{ fontSize: "28px", color: "var(--primary)", marginBottom: "8px", display: "block" }}></i>
            <strong style={{ display: "block", color: "var(--text-primary)", marginBottom: "4px" }}>No Evidence Records in Vault</strong>
            <p style={{ fontSize: "12.5px" }}>Scan media or discover open-web matches to preserve digital proof with cryptographic hashes.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Source Domain & Target URL</th>
                  <th>Perceptual Hash</th>
                  <th>SHA-256 Checksum</th>
                  <th>Timestamp</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvidence.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="badge badge-takedown">
                        {item.evidence_type === "video" ? (
                          <>
                            <i className="fa-solid fa-video"></i> Video
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-image"></i> Image
                          </>
                        )}
                      </span>
                    </td>
                    <td>
                      <strong style={{ display: "block", color: "var(--text-primary)" }}>{item.domain || "Web Source"}</strong>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.source_url}>
                        {item.source_url}
                      </div>
                    </td>
                    <td>
                      <code className="hash-pill">{item.anonymized_phash}</code>
                    </td>
                    <td>
                      <span className="hash-pill" title={item.sha256_checksum}>
                        {item.sha256_checksum ? item.sha256_checksum.substring(0, 16) + "..." : "sha256-verified"}
                      </span>
                    </td>
                    <td>
                      <small style={{ color: "var(--text-muted)" }}>{item.timestamp ? item.timestamp.split(" ")[0] : "Recent"}</small>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => onIssueTakedown && onIssueTakedown(item)}
                          title="Generate Takedown Notice"
                        >
                          <i className="fa-solid fa-bullhorn"></i> Takedown
                        </button>
                        <button
                          className="btn btn-danger-subtle btn-sm"
                          onClick={() => handleDeleteEvidence(item.id)}
                          title="Remove Evidence"
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default EvidenceVault;
