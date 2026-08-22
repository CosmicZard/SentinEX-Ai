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
          <i className="fa-solid fa-arrow-left" style={{ marginRight: "6px" }}></i> Back to Dashboard
        </button>
        <div>
          <div className="zero-trust-badge">
            <span className="dot"></span>
            CASE REPOSITORY: {cases.length} ACTIVE INVESTIGATIONS
          </div>
          <h1>My Investigations & Cases</h1>
          <p className="case-id">Manage, track lifecycle progression, and inspect evidence for all registered cases.</p>
        </div>
      </div>

      <div className="workspace-card" style={{ width: "100%" }}>
        {/* Search & Filter Controls */}
        <div className="mycases-controls-row">
          <div className="search-input-wrap" style={{ flex: 1 }}>
            <span className="search-icon"><i className="fa-solid fa-magnifying-glass"></i></span>
            <input
              type="text"
              placeholder="Search cases by Case ID or Title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="vault-search-input"
            />
          </div>

          <button className="create-button" onClick={onCreateNew} style={{ whiteSpace: "nowrap" }}>
            <i className="fa-solid fa-plus" style={{ marginRight: "6px" }}></i> New Case
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

              <div className="case-middle">
                <span className={`status ${item.status?.toLowerCase().replace(' ', '-') || 'detected'}`}>
                  {item.status || "Detected"}
                </span>
                <span className="match-count">
                  {item.evidence_count || item.matches || 0} evidence item{(item.evidence_count || item.matches) !== 1 ? "s" : ""}
                </span>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  className="open-case"
                  onClick={() => onOpenCase(item)}
                >
                  Open Workspace <i className="fa-solid fa-arrow-right" style={{ marginLeft: "6px" }}></i>
                </button>

                <button
                  className="open-case"
                  style={{ borderColor: "#ef4444", color: "#ef4444" }}
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