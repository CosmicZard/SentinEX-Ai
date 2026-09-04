import React, { useState } from "react";
import { jsPDF } from "jspdf";

const API_BASE = "http://localhost:8000";

function LegalCenter({ caseData, returnPage = "dashboard", onBack, onToast }) {
  const [complainantAlias, setComplainantAlias] = useState("CONFIDENTIAL_VICTIM_01");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split("T")[0]);
  const [knownSuspect, setKnownSuspect] = useState("Unknown / Anonymous Online Actor");
  const [incidentDetails, setIncidentDetails] = useState(
    "Unauthorized capture, possession, or electronic dissemination of private intimate images/videos without consent. " +
    "The content was identified across online file hosts and image forums using zero-trust perceptual fingerprinting."
  );

  const [selectedStatutes, setSelectedStatutes] = useState({
    sec66E: true,
    sec67A: true,
    sec66D: true,
    rule3_2_b: true,
    ipc354C: true
  });

  const [isGeneratingBackend, setIsGeneratingBackend] = useState(false);

  function toggleStatute(key) {
    setSelectedStatutes({ ...selectedStatutes, [key]: !selectedStatutes[key] });
  }

  async function handleDownloadPDF() {
    setIsGeneratingBackend(true);
    try {
      if (caseData?.id) {
        const aliasParam = encodeURIComponent(isAnonymous ? complainantAlias + " (Protected Identity)" : complainantAlias);
        const notesParam = encodeURIComponent(incidentDetails);

        const res = await fetch(`${API_BASE}/cases/${caseData.id}/generate-pdf?victim_alias=${aliasParam}&notes=${notesParam}`, {
          method: "POST"
        });

        if (res.ok) {
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `SentinEx_NCRP_Complaint_${caseData.case_number}.pdf`;
          document.body.appendChild(link);
          link.click();
          link.remove();
          if (onToast) onToast("Official NCRP IT Act Complaint PDF generated.", "success");
          setIsGeneratingBackend(false);
          return;
        }
      }
      downloadClientJsPDF();
    } catch (err) {
      console.warn("Backend PDF service unreachable, using browser generation:", err);
      downloadClientJsPDF();
    } finally {
      setIsGeneratingBackend(false);
    }
  }

  function downloadClientJsPDF() {
    const doc = new jsPDF();
    const caseNum = caseData?.case_number || "SE-2026-CONFIDENTIAL";

    // Header
    doc.setFillColor(15, 23, 42); // Navy
    doc.rect(0, 0, 210, 25, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("FORMAL CYBERCRIME COMPLAINT (IT ACT 2000)", 105, 12, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("National Cyber Crime Reporting Portal (NCRP) / Cyber Crime Cell Format", 105, 19, { align: "center" });

    // Meta Box
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Case Reference: ${caseNum}`, 14, 35);
    doc.text(`Date of Filing: ${new Date().toLocaleDateString()}`, 140, 35);
    doc.text(`Complainant: ${isAnonymous ? complainantAlias + " [ANONYMOUS/PROTECTED]" : complainantAlias}`, 14, 42);
    doc.text(`Suspect/Perpetrator: ${knownSuspect}`, 14, 49);

    doc.setDrawColor(203, 213, 225);
    doc.line(14, 54, 196, 54);

    // Section 1: Statutes
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 138);
    doc.text("1. SUGGESTED STATUTORY CITATIONS (FOR COMPLAINT REFERENCE)", 14, 62);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    let y = 69;

    if (selectedStatutes.sec66E) {
      doc.text("• Section 66E IT Act, 2000: Violation of Bodily Privacy (Capturing/Publishing private area)", 16, y);
      y += 6;
    }
    if (selectedStatutes.sec67A) {
      doc.text("• Section 67 & 67A IT Act, 2000: Publishing Sexually Explicit Material (Non-bailable, up to 5 yrs)", 16, y);
      y += 6;
    }
    if (selectedStatutes.sec66D) {
      doc.text("• Section 66D IT Act, 2000: Cheating by Personation / AI Deepfake Impersonation", 16, y);
      y += 6;
    }
    if (selectedStatutes.rule3_2_b) {
      doc.text("• IT Intermediary Rules 2021, Rule 3(2)(b): Mandatory 24-Hour Takedown Order for NCII", 16, y);
      y += 6;
    }
    if (selectedStatutes.ipc354C) {
      doc.text("• Section 354C IPC / Section 77 BNS: Voyeurism and Unauthorized Dissemination", 16, y);
      y += 6;
    }

    y += 4;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 138);
    doc.text("2. STATEMENT OF FACTS", 14, y);
    y += 7;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    const splitDetails = doc.splitTextToSize(incidentDetails, 180);
    doc.text(splitDetails, 14, y);
    y += splitDetails.length * 5 + 6;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 138);
    doc.text("3. RELIEF & PRAYER DEMANDED", 14, y);
    y += 7;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.text("A. Immediate registration of FIR under Section 66E, 67A IT Act and Section 354C IPC.", 16, y);
    y += 6;
    doc.text("B. Issuance of 24-Hour Emergency Takedown Orders to relevant intermediaries and hosts.", 16, y);
    y += 6;
    doc.text("C. Preservation of IP logs, upload records, and subscriber data under Section 91 CrPC / 94 BNSS.", 16, y);
    y += 12;

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Generated by SentinEx-AI Privacy Defense Engine (Zero-Trust SHA-256 Validated)", 14, y);

    doc.save(`SentinEx_Legal_Complaint_${caseNum}.pdf`);
    if (onToast) onToast("Client-side jsPDF complaint downloaded.", "success");
  }

  function copyTextDraft() {
    const text = `OFFICIAL CYBER CRIME COMPLAINT DRAFT (NCRP / CYBER CELL)
Case Identifier: ${caseData?.case_number || "SE-2026-CONFIDENTIAL"}
Date: ${incidentDate}
Complainant: ${isAnonymous ? complainantAlias + " (Confidential/Protected Identity)" : complainantAlias}
Suspect Details: ${knownSuspect}

SUGGESTED STATUTORY PROVISIONS CITED:
${selectedStatutes.sec66E ? "- Section 66E, Information Technology Act 2000 (Bodily Privacy Violation)\n" : ""}${selectedStatutes.sec67A ? "- Section 67A, Information Technology Act 2000 (Publishing Sexually Explicit Content)\n" : ""}${selectedStatutes.sec66D ? "- Section 66D, Information Technology Act 2000 (Impersonation / Deepfakes)\n" : ""}${selectedStatutes.rule3_2_b ? "- Rule 3(2)(b), Information Technology Rules 2021 (24-Hour Removal Mandate)\n" : ""}${selectedStatutes.ipc354C ? "- Section 354C, Indian Penal Code (Voyeurism)\n" : ""}
STATEMENT OF FACTS:
${incidentDetails}

PRAYER:
1. Registration of formal FIR under suggested IT Act provisions.
2. Emergency 24-hour takedown notices to intermediary hosting providers.
3. Subpoena for server connection and IP logs under Sec 91 CrPC.

Generated via SentinEx-AI Zero-Trust Platform`;

    navigator.clipboard.writeText(text);
    if (onToast) onToast("Complaint text copied to clipboard.", "success");
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
            <span>Legal Center</span>
            <span>/</span>
            <span>IT Act Sec 66E / 67A Package</span>
          </div>
          <h1 style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-primary)" }}>
            Cybercrime Complaint & Legal Package Generator
          </h1>
          <p style={{ fontSize: "12.5px", color: "var(--text-muted)", marginTop: "2px" }}>
            {caseData ? `Case: ${caseData.title} (${caseData.case_number})` : "National Cyber Crime Reporting Portal (NCRP) Draft Generator"}
          </p>
        </div>
      </div>

      <div className="legal-layout" style={{ width: "100%" }}>
        {/* Left Column: Complaint Builder Form */}
        <section className="workspace-card">
          <div className="section-title-row">
            <div>
              <p className="section-label">COMPLAINT CONFIGURATOR</p>
              <h2>Incident & Complainant Details</h2>
            </div>
            <span className="badge badge-evidence">
              <i className="fa-solid fa-shield-halved"></i> Privacy Shield Active
            </span>
          </div>

          <div className="form-group" style={{ marginTop: "15px" }}>
            <label className="checkbox-label" style={{ padding: "12px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                style={{ width: "18px", height: "18px" }}
              />
              <span><strong>Keep my identity a secret</strong> (We'll use an alias in public documents)</span>
            </label>
          </div>

          <div className="form-grid-2" style={{ gap: "20px", marginTop: "20px" }}>
            <div className="form-group">
              <label style={{ fontWeight: "600", color: "#334155" }}>Your Name (or Alias):</label>
              <input
                type="text"
                value={complainantAlias}
                onChange={(e) => setComplainantAlias(e.target.value)}
                className="vault-search-input"
                style={{ padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1", marginTop: "6px" }}
              />
            </div>
            <div className="form-group">
              <label style={{ fontWeight: "600", color: "#334155" }}>When did you notice this?</label>
              <input
                type="date"
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                className="vault-search-input"
                style={{ padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1", marginTop: "6px" }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: "20px" }}>
            <label style={{ fontWeight: "600", color: "#334155" }}>Do you know who did this, or where it was posted?</label>
            <input
              type="text"
              value={knownSuspect}
              onChange={(e) => setKnownSuspect(e.target.value)}
              className="vault-search-input"
              style={{ padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1", marginTop: "6px" }}
            />
          </div>

          <div className="form-group" style={{ marginTop: "25px" }}>
            <label style={{ fontWeight: "600", color: "#334155", marginBottom: "10px", display: "block" }}>
              Which laws apply? (We've checked the most common ones for you)
            </label>
            <div className="statute-checklist" style={{ display: "grid", gap: "12px" }}>
              <label className="check-item" style={{ padding: "14px", backgroundColor: selectedStatutes.sec66E ? "#f0fdf4" : "#f8fafc", border: selectedStatutes.sec66E ? "1px solid #86efac" : "1px solid #e2e8f0", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: "12px", transition: "all 0.2s" }}>
                <input
                  type="checkbox"
                  checked={selectedStatutes.sec66E}
                  onChange={() => toggleStatute("sec66E")}
                  style={{ marginTop: "4px", width: "16px", height: "16px" }}
                />
                <div>
                  <strong style={{ display: "block", color: "#1e293b", fontSize: "14px" }}>IT Act Sec 66E — Violation of Bodily Privacy</strong>
                  <small style={{ color: "#64748b", fontSize: "12.5px", display: "block", marginTop: "2px" }}>Capturing or sharing private images without consent</small>
                </div>
              </label>

              <label className="check-item" style={{ padding: "14px", backgroundColor: selectedStatutes.sec67A ? "#f0fdf4" : "#f8fafc", border: selectedStatutes.sec67A ? "1px solid #86efac" : "1px solid #e2e8f0", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: "12px", transition: "all 0.2s" }}>
                <input
                  type="checkbox"
                  checked={selectedStatutes.sec67A}
                  onChange={() => toggleStatute("sec67A")}
                  style={{ marginTop: "4px", width: "16px", height: "16px" }}
                />
                <div>
                  <strong style={{ display: "block", color: "#1e293b", fontSize: "14px" }}>IT Act Sec 67A — Sexually Explicit Material</strong>
                  <small style={{ color: "#64748b", fontSize: "12.5px", display: "block", marginTop: "2px" }}>A serious, non-bailable offense (up to 5 years in prison)</small>
                </div>
              </label>

              <label className="check-item" style={{ padding: "14px", backgroundColor: selectedStatutes.sec66D ? "#f0fdf4" : "#f8fafc", border: selectedStatutes.sec66D ? "1px solid #86efac" : "1px solid #e2e8f0", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: "12px", transition: "all 0.2s" }}>
                <input
                  type="checkbox"
                  checked={selectedStatutes.sec66D}
                  onChange={() => toggleStatute("sec66D")}
                  style={{ marginTop: "4px", width: "16px", height: "16px" }}
                />
                <div>
                  <strong style={{ display: "block", color: "#1e293b", fontSize: "14px" }}>IT Act Sec 66D — AI Deepfakes & Impersonation</strong>
                  <small style={{ color: "#64748b", fontSize: "12.5px", display: "block", marginTop: "2px" }}>Applies if your face was swapped or manipulated</small>
                </div>
              </label>

              <label className="check-item" style={{ padding: "14px", backgroundColor: selectedStatutes.rule3_2_b ? "#f0fdf4" : "#f8fafc", border: selectedStatutes.rule3_2_b ? "1px solid #86efac" : "1px solid #e2e8f0", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: "12px", transition: "all 0.2s" }}>
                <input
                  type="checkbox"
                  checked={selectedStatutes.rule3_2_b}
                  onChange={() => toggleStatute("rule3_2_b")}
                  style={{ marginTop: "4px", width: "16px", height: "16px" }}
                />
                <div>
                  <strong style={{ display: "block", color: "#1e293b", fontSize: "14px" }}>IT Rules 2021 Rule 3(2)(b) — 24-Hr Removal</strong>
                  <small style={{ color: "#64748b", fontSize: "12.5px", display: "block", marginTop: "2px" }}>Forces platforms to delete the content within 24 hours</small>
                </div>
              </label>

              <label className="check-item" style={{ padding: "14px", backgroundColor: selectedStatutes.ipc354C ? "#f0fdf4" : "#f8fafc", border: selectedStatutes.ipc354C ? "1px solid #86efac" : "1px solid #e2e8f0", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: "12px", transition: "all 0.2s" }}>
                <input
                  type="checkbox"
                  checked={selectedStatutes.ipc354C}
                  onChange={() => toggleStatute("ipc354C")}
                  style={{ marginTop: "4px", width: "16px", height: "16px" }}
                />
                <div>
                  <strong style={{ display: "block", color: "#1e293b", fontSize: "14px" }}>IPC Sec 354C / BNS Sec 77 — Voyeurism</strong>
                  <small style={{ color: "#64748b", fontSize: "12.5px", display: "block", marginTop: "2px" }}>For secretly recording or sharing private acts</small>
                </div>
              </label>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: "25px" }}>
            <label style={{ fontWeight: "600", color: "#334155" }}>Tell us what happened (in your own words):</label>
            <textarea
              rows={5}
              value={incidentDetails}
              onChange={(e) => setIncidentDetails(e.target.value)}
              className="notice-preview-textarea"
              style={{ padding: "14px", borderRadius: "8px", border: "1px solid #cbd5e1", marginTop: "6px", width: "100%", lineHeight: "1.5", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
            <button
              className="btn btn-primary"
              onClick={handleDownloadPDF}
              disabled={isGeneratingBackend}
            >
              {isGeneratingBackend ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Generating Package...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-file-pdf"></i> Download NCRP Complaint PDF
                </>
              )}
            </button>

            <button className="btn btn-secondary" onClick={copyTextDraft}>
              <i className="fa-solid fa-copy"></i> Copy Complaint Text
            </button>
          </div>
        </section>

        {/* Right Information & Legal FAQ */}
        <aside className="analysis-info" style={{ marginTop: 0 }}>
          <div className="info-icon" style={{ color: "#059669" }}>
            <i className="fa-solid fa-scale-balanced"></i>
          </div>
          <h3>Legal Rights & Filing Guide</h3>

          <div className="analysis-step">
            <span>01</span>
            <div>
              <strong>National Cyber Crime Portal (NCRP)</strong>
              <p>Reports can be lodged at <b>cybercrime.gov.in</b> or by dialing the national helpline <b>1930</b>.</p>
            </div>
          </div>

          <div className="analysis-step">
            <span>02</span>
            <div>
              <strong>24-Hour Removal Mandate</strong>
              <p>Under Rule 3(2)(b) of the IT Rules 2021, social media platforms and intermediaries must take down NCII content within 24 hours.</p>
            </div>
          </div>

          <div className="analysis-step">
            <span>03</span>
            <div>
              <strong>Cryptographic Chain of Custody</strong>
              <p>SentinEx-AI attaches SHA-256 integrity checksums to prevent claims of evidence tampering.</p>
            </div>
          </div>

          <div className="analysis-step">
            <span>04</span>
            <div>
              <strong>Non-Bailable Provisions</strong>
              <p>Section 67A carries up to 5 years imprisonment and severe fines upon conviction.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default LegalCenter;
