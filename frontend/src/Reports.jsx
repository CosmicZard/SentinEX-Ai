import React, { useState, useEffect } from "react";

const API_BASE = "http://localhost:8000";

function Reports({ onBack, onToast }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/cases/reports/all`);
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoading(false);
    }
  }

  async function downloadReportPDF(report) {
    try {
      const res = await fetch(`${API_BASE}/cases/${report.case_id}/generate-pdf`, { method: "POST" });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `SentinEx_${report.report_number || "Complaint"}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        if (onToast) onToast("Report PDF downloaded successfully.", "success");
      }
    } catch (err) {
      alert("Error downloading report.");
    }
  }

  const filteredReports = reports.filter((r) => {
    return (
      (r.title && r.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.report_number && r.report_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.case_number && r.case_number.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  return (
    <div className="case-workspace">
      {/* Header Area */}
      <div className="workspace-top">
        <button className="back-button" onClick={onBack}>
          <i className="fa-solid fa-arrow-left" style={{ marginRight: "6px" }}></i> Back to Dashboard
        </button>
        <div>
          <div className="zero-trust-badge">
            <span className="dot"></span>
            OFFICIAL COMPLAINTS & STATUTORY REPORTS: {reports.length} ARCHIVED
          </div>
          <h1>Generated Reports & Legal Filings</h1>
          <p className="case-id">Access, download, and manage legally formatted cybercrime complaints (IT Act Sec 66E / 67A).</p>
        </div>
      </div>

      {/* Main List Area */}
      <div className="workspace-card" style={{ width: "100%" }}>
        {/* Search Bar */}
        <input
          type="text"
          placeholder="Search reports by Report ID, Case Number, or Title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="vault-search-input"
          style={{ marginBottom: "20px" }}
        />

        {/* The List of Reports */}
        {loading ? (
          <div className="loading-card"><div className="spinner-cyber"></div><p>Loading generated reports...</p></div>
        ) : (
          <div className="case-list">
            {filteredReports.map((item) => (
              <div className="case-card" key={item.id}>
                <div className="case-left">
                  <div className="case-icon" style={{ background: "#172033", color: "#60a5fa" }}>
                    <i className="fa-solid fa-file-pdf"></i>
                  </div>
                  <div>
                    <h3>{item.title}</h3>
                    <p>
                      <b>{item.report_number}</b> · Case: <strong>{item.case_number || `Case #${item.case_id}`}</strong> · Generated: {item.created_at || "Recent"}
                    </p>
                    <small style={{ color: "#34d399", display: "block", marginTop: "4px" }}>
                      <i className="fa-solid fa-scale-balanced" style={{ marginRight: "4px" }}></i> {item.statutory_clauses || "IT Act Sec 66E, 67A"}
                    </small>
                  </div>
                </div>

                <div className="case-middle">
                  <span className="status evidence" style={{ background: "#064e3b", color: "#34d399" }}>
                    <i className="fa-solid fa-circle-check" style={{ marginRight: "4px" }}></i> Verified ReportLab PDF
                  </span>
                </div>

                {/* ACTION BUTTONS */}
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    className="open-case"
                    style={{ background: "#1e3a8a", color: "white", borderColor: "#3b82f6" }}
                    onClick={() => downloadReportPDF(item)}
                  >
                    <i className="fa-solid fa-download" style={{ marginRight: "6px" }}></i> Download PDF
                  </button>
                </div>
              </div>
            ))}

            {filteredReports.length === 0 && (
              <div className="empty-state-card">
                <span style={{ fontSize: "32px", display: "block", marginBottom: "10px", color: "#64748b" }}>
                  <i className="fa-solid fa-inbox"></i>
                </span>
                <h3>No generated reports found</h3>
                <p>Open an active case and generate an IT Act Legal Complaint to archive official documents here.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Reports;