import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ShieldCheck,
  FileText,
  Clock,
  AlertTriangle,
  Flame,
  Search,
  Scale,
  Building2,
  Calendar,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import AuthoritySidebar from "../../components/AuthoritySidebar";
import { getApiUrl, authFetch } from "../../services/authService";

function AuthorityCaseManagement() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [complaint, setComplaint] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const [compRes, histRes] = await Promise.allSettled([
          authFetch(`${getApiUrl()}/complaints/${id}`),
          authFetch(`${getApiUrl()}/authority/complaints/${id}/history`),
        ]);

        if (compRes.status === "fulfilled" && compRes.value?.ok) {
          const cData = await compRes.value.json();
          if (cData.success && cData.complaint) {
            setComplaint(cData.complaint);
          } else {
            throw new Error(cData.message || "Failed to load case information.");
          }
        } else {
          throw new Error("Unable to load case file.");
        }

        if (histRes.status === "fulfilled" && histRes.value?.ok) {
          const hData = await histRes.value.json();
          if (hData.success && Array.isArray(hData.history)) {
            setHistory(hData.history);
          }
        }
      } catch (err) {
        console.error("Error fetching case details:", err);
        setError(err.message || "Error loading case dossier.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="admin-layout">
        <AuthoritySidebar />
        <main className="admin-main" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
          <div style={{ textAlign: "center", color: "var(--color-text-muted)" }}>
            <RefreshCw size={28} className="spin-icon" style={{ margin: "0 auto 0.75rem auto" }} />
            <p>Loading case management file #{id}...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="admin-layout">
        <AuthoritySidebar />
        <main className="admin-main">
          <div className="card" style={{ padding: "2.5rem", textAlign: "center", maxWidth: 480, margin: "3rem auto" }}>
            <AlertTriangle size={36} style={{ color: "var(--color-danger)", margin: "0 auto 1rem auto" }} />
            <h3 style={{ margin: "0 0 0.5rem 0" }}>Case Not Found</h3>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
              {error || "No active dossier found for the specified case identifier."}
            </p>
            <button onClick={() => navigate("/authority/cases")} className="btn btn-primary">
              <ArrowLeft size={16} />
              Return to Case Docket
            </button>
          </div>
        </main>
      </div>
    );
  }

  const riskScore = Number(complaint.risk_score) || 0;
  const isCritical = riskScore >= 75 || String(complaint.priority).toUpperCase().includes("HIGH");

  return (
    <div className="admin-layout">
      <AuthoritySidebar />

      <main className="admin-main">
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", color: "var(--color-text-muted)", marginBottom: "0.25rem" }}>
              <button
                onClick={() => navigate("/authority/cases")}
                style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer", padding: 0, display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
              >
                <ArrowLeft size={13} />
                Authority Cases
              </button>
              <span>/</span>
              <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>Case #{complaint.complaint_id}</span>
            </div>
            <h1 style={{ fontSize: "1.625rem", fontWeight: 700, color: "var(--color-text)", margin: 0, display: "flex", alignItems: "center", gap: "0.625rem" }}>
              <ShieldCheck style={{ color: "var(--color-primary)" }} size={26} />
              Case Management Record
            </h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.35rem 0.75rem",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.75rem",
                fontWeight: 700,
                background: "var(--color-bg-secondary)",
                color: "var(--color-text)",
                border: "1px solid var(--color-border)",
              }}
            >
              <CheckCircle2 size={13} style={{ color: "var(--color-primary)" }} />
              STATUS: {complaint.status}
            </span>
            <button
              onClick={() => navigate(`/authority/investigation/${id}`)}
              className="btn btn-primary"
              style={{ padding: "0.45rem 0.875rem", fontSize: "0.8125rem" }}
            >
              <Scale size={15} />
              Open Investigation Module
            </button>
          </div>
        </div>

        {/* CASE DETAILS & RISK GRID */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem", marginBottom: "1.5rem" }}>
          {/* CASE INFORMATION */}
          <div className="card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
              <FileText size={18} style={{ color: "var(--color-primary)" }} />
              <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--color-text)", margin: 0 }}>
                Case Information
              </h3>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: "0.5rem", fontSize: "0.875rem" }}>
                <span style={{ color: "var(--color-text-muted)" }}>Category:</span>
                <span style={{ fontWeight: 600, color: "var(--color-text)" }}>{complaint.category || "N/A"}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: "0.5rem", fontSize: "0.875rem" }}>
                <span style={{ color: "var(--color-text-muted)" }}>Food Product:</span>
                <span style={{ fontWeight: 600, color: "var(--color-text)" }}>{complaint.product_name || "N/A"}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: "0.5rem", fontSize: "0.875rem" }}>
                <span style={{ color: "var(--color-text-muted)" }}>Priority Level:</span>
                <span style={{ fontWeight: 600, color: isCritical ? "#DC2626" : "var(--color-text)" }}>
                  {complaint.priority || "NORMAL"}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: "0.5rem", fontSize: "0.875rem" }}>
                <span style={{ color: "var(--color-text-muted)" }}>Risk Severity:</span>
                <span style={{ fontWeight: 700, color: isCritical ? "#DC2626" : "var(--color-primary)" }}>
                  {complaint.risk_score ?? "N/A"} / 100
                </span>
              </div>

              <div style={{ marginTop: "0.5rem" }}>
                <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", marginBottom: "0.35rem" }}>
                  Consumer Grievance Narrative
                </span>
                <p style={{ margin: 0, padding: "0.875rem", background: "var(--color-bg-secondary)", borderRadius: "var(--radius-md)", fontSize: "0.84375rem", color: "var(--color-text)", lineHeight: 1.5 }}>
                  {complaint.description || "No description provided."}
                </p>
              </div>
            </div>
          </div>

          {/* RISK ASSESSMENT CARD */}
          <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
                <AlertTriangle size={18} style={{ color: isCritical ? "#DC2626" : "#F59E0B" }} />
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--color-text)", margin: 0 }}>
                  Algorithmic Risk Assessment
                </h3>
              </div>

              <div style={{ padding: "1.5rem", background: isCritical ? "rgba(239, 68, 68, 0.08)" : "var(--color-bg-secondary)", borderRadius: "var(--radius-md)", textAlign: "center", marginBottom: "1rem" }}>
                <div style={{ fontSize: "3rem", fontWeight: 800, color: isCritical ? "#DC2626" : "var(--color-primary)", lineHeight: 1 }}>
                  {complaint.risk_score ?? 0}
                  <span style={{ fontSize: "1.125rem", color: "var(--color-text-muted)", fontWeight: 500 }}>/100</span>
                </div>
                <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", fontWeight: 700, textTransform: "uppercase", color: isCritical ? "#DC2626" : "var(--color-text)" }}>
                  {complaint.priority || "ASSESSMENT NORMAL"}
                </div>
              </div>

              <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", lineHeight: 1.5, margin: 0 }}>
                Preliminary automated risk calculation based on reported adulterants, food item hazard rating, and vendor history.
              </p>
            </div>

            <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--color-border)" }}>
              <button
                onClick={() => navigate(`/authority/investigation/${id}`)}
                className="btn btn-secondary"
                style={{ width: "100%", justifyContent: "center", padding: "0.625rem" }}
              >
                Proceed to In-Field Audit & Orders
              </button>
            </div>
          </div>
        </div>

        {/* INVESTIGATION HISTORY */}
        <div className="card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <Clock size={18} style={{ color: "var(--color-primary)" }} />
            <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--color-text)", margin: 0 }}>
              Chronological Audit Trail
            </h3>
          </div>

          {history.length === 0 ? (
            <div style={{ padding: "2.5rem 1rem", textAlign: "center", color: "var(--color-text-muted)" }}>
              <Clock size={36} style={{ margin: "0 auto 0.5rem auto", opacity: 0.35 }} />
              <p style={{ margin: 0, fontSize: "0.875rem" }}>No investigation history available yet for this case docket.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {history.map((item, idx) => (
                <div
                  key={item.id || idx}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "1rem",
                    padding: "1rem",
                    background: "var(--color-bg-secondary)",
                    borderRadius: "var(--radius-md)",
                    borderLeft: "4px solid var(--color-primary)",
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "var(--color-primary)",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem", flexWrap: "wrap" }}>
                      <strong style={{ fontSize: "0.875rem", color: "var(--color-text)" }}>
                        {item.status ? item.status.replaceAll("_", " ") : "STATUS LOGGED"}
                      </strong>
                      <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                        {item.created_at ? new Date(item.created_at).toLocaleString("en-IN") : "Date on file"}
                      </span>
                    </div>
                    <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.84375rem", color: "var(--color-text)" }}>
                      {item.remarks || "No remarks provided."}
                    </p>
                    <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                      Authority: {item.authority_name || "Authorized Authority"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default AuthorityCaseManagement;