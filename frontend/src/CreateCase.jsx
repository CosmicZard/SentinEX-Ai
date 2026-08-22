import { useState } from "react";

function CreateCase({ onBack, onCreated }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    source: "",
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
      description: form.description || "Investigation initialized.",
      risk_level: form.risk_level,
      status: "Detected"
    };

    onCreated(newCase);
  }

  return (
    <div className="case-page" style={{ maxWidth: "600px", margin: "40px auto" }}>
      <div className="case-header" style={{ borderBottom: "none", paddingBottom: "0" }}>
        <button className="back-button" onClick={onBack} style={{ marginBottom: "20px" }}>
          <i className="fa-solid fa-arrow-left"></i> Back
        </button>
      </div>

      <div style={{ background: "var(--bg-surface)", padding: "32px", borderRadius: "12px", border: "1px solid var(--border-subtle)", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "8px" }}>
          New Investigation
        </h1>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "32px" }}>
          Initialize a secure, zero-knowledge workspace to track media and manage legal actions.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label htmlFor="title" style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
              Case Title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              placeholder="e.g. Unauthorized Media Leak"
              value={form.title}
              onChange={handleChange}
              required
              style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-medium)", fontSize: "14px", width: "100%", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "flex", gap: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
              <label htmlFor="risk_level" style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>Threat Level</label>
              <select
                id="risk_level"
                name="risk_level"
                value={form.risk_level}
                onChange={handleChange}
                style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-medium)", fontSize: "14px", width: "100%", boxSizing: "border-box", background: "var(--bg-surface)" }}
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
              <label htmlFor="source" style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>Target Platform</label>
              <input
                id="source"
                name="source"
                type="text"
                placeholder="e.g. Telegram / Website"
                value={form.source}
                onChange={handleChange}
                style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-medium)", fontSize: "14px", width: "100%", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label htmlFor="description" style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
              Notes (Optional)
            </label>
            <textarea
              id="description"
              name="description"
              rows="3"
              placeholder="Add relevant context or incident details..."
              value={form.description}
              onChange={handleChange}
              style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-medium)", fontSize: "14px", width: "100%", boxSizing: "border-box", resize: "vertical" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px", borderTop: "1px solid var(--border-subtle)", paddingTop: "24px" }}>
            <button 
              type="button" 
              onClick={onBack} 
              style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid var(--border-medium)", background: "transparent", cursor: "pointer", fontSize: "14px", fontWeight: "600" }}>
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              style={{ padding: "10px 20px", borderRadius: "8px", border: "none", background: "var(--primary)", color: "#fff", cursor: loading ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}>
              {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-plus"></i>}
              {loading ? "Creating..." : "Create Workspace"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default CreateCase;
