import React, { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

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
          <i className="fa-solid fa-arrow-left"></i> Back to Dashboard
        </button>
        <div>
          <div className="breadcrumbs" style={{ marginBottom: "4px" }}>
            <span>Reports & Filings</span>
            <span>/</span>
            <span>{reports.length} Archived Legal Complaints</span>
          </div>
          <h1 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>
            Generated Reports & Legal Filings
          </h1>
          <p style={{ fontSize: "12.5px", color: "var(--text-muted)", marginTop: "2px" }}>
            Access, download, and manage legally formatted cybercrime complaints (IT Act Sec 66E / 67A).
          </p>
        </div>
      </div>

      {/* Main List Area */}
      <div className="section-container" style={{ width: "100%" }}>
        {/* Search Bar */}
        <input
          type="text"
          placeholder="Search reports by Report ID, Case Number, or Title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-input"
          style={{ marginBottom: "16px" }}
        />

        {/* The List of Reports */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "20px", marginBottom: "8px" }}></i>
            <p>Loading generated reports...</p>
          </div>
        ) : (
          <div className="case-list">
            {filteredReports.map((item) => (
              <div className="case-card" key={item.id}>
                <div className="case-left">
                  <div className="case-icon">
                    <i className="fa-solid fa-file-pdf"></i>
                  </div>
                  <div>
                    <h3>{item.title}</h3>
                    <p>
                      <b>{item.report_number}</b> · Case: <strong>{item.case_number || `Case #${item.case_id}`}</strong> · {item.created_at || "Recent"}
                    </p>
                    <small style={{ color: "var(--primary)", display: "block", marginTop: "2px", fontWeight: "600" }}>
                      <i className="fa-solid fa-scale-balanced" style={{ marginRight: "4px" }}></i> {item.statutory_clauses || "IT Act Sec 66E, 67A"}
                    </small>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span className="badge badge-evidence">
                    <i className="fa-solid fa-circle-check"></i> PDF Ready
                  </span>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => downloadReportPDF(item)}
                  >
                    <i className="fa-solid fa-download"></i> Download PDF
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