import React, { useState } from "react";

function MyCases({ cases, onBack, onOpenCase, onDeleteCase, onCreateNew }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      (c.title && c.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.case_number && c.case_number.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" ||
      (c.status && c.status.toLowerCase() === statusFilter.toLowerCase());

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="case-workspace">
      <div className="workspace-top">
        <button className="back-button" onClick={onBack}>
          <i className="fa-solid fa-arrow-left"></i> Back to Dashboard
        </button>
        <div>
          <div className="breadcrumbs" style={{ marginBottom: "4px" }}>
            <span>Case Repository</span>
            <span>/</span>
            <span>{cases.length} Active Investigations</span>
          </div>
          <h1 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>
            My Investigations & Cases
          </h1>
          <p style={{ fontSize: "12.5px", color: "var(--text-muted)", marginTop: "2px" }}>
            Manage, track lifecycle progression, and inspect evidence for all registered cases.
          </p>
        </div>
      </div>

      <div className="section-container" style={{ width: "100%" }}>
        {/* Search & Filter Controls */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search cases by Case ID or Title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ flex: 1 }}
          />

          <button className="btn btn-primary" onClick={onCreateNew} style={{ whiteSpace: "nowrap" }}>
            <i className="fa-solid fa-plus"></i> New Case
          </button>
        </div>

        {/* Status Filter Pills */}
        <div className="filter-bar" style={{ marginTop: "15px" }}>
          <span className="filter-label">Filter Status:</span>
          {["all", "Detected", "Evidence Saved", "Report Generated", "Submitted", "Under Review", "Removed", "Resolved"].map((st) => (
            <button
              key={st}
              className={`filter-pill ${statusFilter === st.toLowerCase() || (st === "all" && statusFilter === "all") ? "active" : ""}`}
              onClick={() => setStatusFilter(st === "all" ? "all" : st.toLowerCase())}
            >
              {st === "all" ? `All (${cases.length})` : st}
            </button>
          ))}
        </div>

        {/* Case Cards List */}
        <div className="case-list" style={{ marginTop: "20px" }}>
          {filteredCases.map((item) => (
            <div className="case-card" key={item.id}>
              <div className="case-left">
                <div className="case-icon">
                  <i className="fa-solid fa-folder-closed"></i>
                </div>
                <div>
                  <h3>{item.title}</h3>
                  <p>
                    <b>{item.case_number || `SE-${item.id}`}</b> · Risk: <span className={`risk-tag ${item.risk_level?.toLowerCase() || 'medium'}`}>{item.risk_level || "Medium"}</span> · Created: {item.created_at || "Recent"}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="badge badge-evidence">
                  {item.status || "Detected"}
                </span>

                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => onOpenCase(item)}
                >
                  Open <i className="fa-solid fa-arrow-right" style={{ marginLeft: "4px" }}></i>
                </button>

                <button
                  className="btn btn-danger-subtle btn-sm"
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to permanently delete case ${item.case_number}?`)) {
                      onDeleteCase(item.id);
                    }
                  }}
                  title="Delete Case"
                >
                  <i className="fa-solid fa-trash-can"></i>
                </button>
              </div>
            </div>
          ))}

          {filteredCases.length === 0 && (
            <div className="empty-state-card">
              <span style={{ fontSize: "32px", display: "block", marginBottom: "10px", color: "#64748b" }}>
                <i className="fa-solid fa-inbox"></i>
              </span>
              <h3>No investigations matching current criteria</h3>
              <p>Create a new case workspace to begin monitoring and takedown operations.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MyCases;