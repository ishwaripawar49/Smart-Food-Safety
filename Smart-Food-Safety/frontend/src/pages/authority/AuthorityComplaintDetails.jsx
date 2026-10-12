import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  ShieldCheck,
  Building2,
  Calendar,
  MapPin,
  Camera,
  Save,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  AlertCircle,
  Gavel,
  RefreshCw,
  Flame,
  UserCheck,
  Info,
  ExternalLink,
} from "lucide-react";
import AuthoritySidebar from "../../components/AuthoritySidebar";
import ProtectedImage from "../../components/ProtectedImage";
import { getApiUrl, authFetch } from "../../services/authService";

function AuthorityComplaintDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [investigationStatus, setInvestigationStatus] = useState("UNDER_INVESTIGATION");
  const [authorityName, setAuthorityName] = useState("Authorized Food Safety Officer");
  const [remarks, setRemarks] = useState("");

  const [actionType, setActionType] = useState("");
  const [actionRemarks, setActionRemarks] = useState("");

  const [history, setHistory] = useState([]);
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);

  const [savingInvestigation, setSavingInvestigation] = useState(false);
  const [savingAction, setSavingAction] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: "", type: "" });

  // 1. Auth check
  useEffect(() => {
    const userString = localStorage.getItem("user");
    if (!userString) {
      navigate("/login");
      return;
    }
    try {
      const user = JSON.parse(userString);
      if (user.role !== "AUTHORIZED_AUTHORITY") {
        navigate("/login");
      }
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/login");
    }
  }, [navigate]);

  // 2. Fetch Complaint Details
  useEffect(() => {
    const fetchComplaint = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await authFetch(`${getApiUrl()}/complaints/${id}`);
        if (!response) return;

        if (response.status === 401 || response.status === 403) {
          navigate("/login");
          return;
        }

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch complaint details.");
        }

        const complaintData = data.complaint || data.data || data;
        setComplaint(complaintData);

        if (complaintData.investigation_status) {
          setInvestigationStatus(complaintData.investigation_status);
        }
      } catch (err) {
        console.error("Complaint fetch error:", err);
        setError(err.message || "Unable to load case details.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchComplaint();
    }
  }, [id, navigate]);

  // 3. Fetch Investigation History
  useEffect(() => {
    let mounted = true;

    const loadHistory = async () => {
      try {
        setHistoryLoading(true);
        const response = await authFetch(`${getApiUrl()}/authority/complaints/${id}/history`);
        if (!response || !mounted) return;

        if (response.ok) {
          const data = await response.json();
          if (mounted && data.success) {
            setHistory(data.history || []);
          }
        }
      } catch (err) {
        if (!mounted) return;
        console.error("History fetch error:", err);
      } finally {
        if (mounted) setHistoryLoading(false);
      }
    };

    if (id) {
      loadHistory();
    }

    return () => {
      mounted = false;
    };
  }, [id, historyRefreshTrigger]);

  // Handlers
  const handleInvestigationUpdate = async (e) => {
    e.preventDefault();
    if (!remarks.trim()) {
      setStatusMessage({ text: "Please enter investigation findings / audit remarks.", type: "error" });
      return;
    }

    try {
      setSavingInvestigation(true);
      setStatusMessage({ text: "", type: "" });

      const response = await authFetch(
        `${getApiUrl()}/authority/complaints/${id}/investigation`,
        {
          method: "PUT",
          body: JSON.stringify({
            authority_name: authorityName,
            investigation_status: investigationStatus,
            remarks: remarks,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to update investigation status.");
      }

      setStatusMessage({ text: "Investigation findings logged successfully.", type: "success" });
      setRemarks("");
      setHistoryRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error("Investigation update error:", err);
      setStatusMessage({ text: err.message || "Error logging investigation.", type: "error" });
    } finally {
      setSavingInvestigation(false);
    }
  };

  const handleAuthorityAction = async (e) => {
    e.preventDefault();
    if (!actionType) {
      setStatusMessage({ text: "Please select an authority enforcement action.", type: "error" });
      return;
    }
    if (!actionRemarks.trim()) {
      setStatusMessage({ text: "Please enter enforcement directives / order remarks.", type: "error" });
      return;
    }

    try {
      setSavingAction(true);
      setStatusMessage({ text: "", type: "" });

      const response = await authFetch(
        `${getApiUrl()}/authority/complaints/${id}/action`,
        {
          method: "POST",
          body: JSON.stringify({
            authority_name: authorityName,
            action_type: actionType,
            remarks: actionRemarks,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to record authority action.");
      }

      setStatusMessage({ text: "Official statutory directive recorded successfully.", type: "success" });
      setActionType("");
      setActionRemarks("");
      setHistoryRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error("Authority action error:", err);
      setStatusMessage({ text: err.message || "Error logging regulatory directive.", type: "error" });
    } finally {
      setSavingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-layout">
        <AuthoritySidebar />
        <main className="admin-main" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
          <div style={{ textAlign: "center", color: "var(--color-text-muted)" }}>
            <RefreshCw size={28} className="spin-icon" style={{ margin: "0 auto 0.75rem auto" }} />
            <p>Loading authority complaint file #{id}...</p>
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
          <div className="card" style={{ padding: "2.5rem", textAlign: "center", maxWidth: 500, margin: "3rem auto" }}>
            <AlertTriangle size={36} style={{ color: "var(--color-danger)", margin: "0 auto 1rem auto" }} />
            <h3 style={{ margin: "0 0 0.5rem 0" }}>Unable to Load Case File</h3>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
              {error || "The requested complaint could not be found."}
            </p>
            <button onClick={() => navigate("/authority/verified-complaints")} className="btn btn-primary">
              <ArrowLeft size={16} />
              Back to Verified Complaints
            </button>
          </div>
        </main>
      </div>
    );
  }

  const complaintId = complaint.complaint_id || `CMP-${complaint.id}`;
  const riskScore = Number(complaint.risk_score) || 0;
  const isCritical = riskScore >= 75 || String(complaint.risk_level).toUpperCase().includes("CRITICAL");
  const isHigh = riskScore >= 50 || String(complaint.risk_level).toUpperCase().includes("HIGH");

  const images = complaint.images || [];
  const firstImage = images.length > 0 ? images[0] : null;
  const imageUrl = firstImage
    ? firstImage.authenticated_url
      ? `${getApiUrl().replace(/\/api\/?$/, "")}${firstImage.authenticated_url}`
      : `${getApiUrl()}/complaints/${complaint.id}/images/${firstImage.id}`
    : null;

  return (
    <div className="admin-layout">
      <AuthoritySidebar />

      <main className="admin-main">
        {/* HEADER / NAVIGATION */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", color: "var(--color-text-muted)", marginBottom: "0.25rem" }}>
              <button
                onClick={() => navigate("/authority/verified-complaints")}
                style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer", padding: 0, display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
              >
                <ArrowLeft size={13} />
                Verified Queue
              </button>
              <span>/</span>
              <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>Dossier {complaintId}</span>
            </div>
            <h1 style={{ fontSize: "1.625rem", fontWeight: 700, color: "var(--color-text)", margin: 0, display: "flex", alignItems: "center", gap: "0.625rem" }}>
              <ShieldCheck style={{ color: "var(--color-primary)" }} size={26} />
              Authority Case Investigation & Enforcement
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
                textTransform: "uppercase",
                background: isCritical ? "rgba(239, 68, 68, 0.12)" : isHigh ? "rgba(249, 115, 22, 0.12)" : "rgba(34, 197, 94, 0.12)",
                color: isCritical ? "#DC2626" : isHigh ? "#EA580C" : "#16A34A",
                border: `1px solid ${isCritical ? "rgba(239, 68, 68, 0.25)" : isHigh ? "rgba(249, 115, 22, 0.25)" : "rgba(34, 197, 94, 0.25)"}`,
              }}
            >
              {isCritical ? <Flame size={14} /> : <AlertTriangle size={14} />}
              {complaint.risk_level || (isCritical ? "CRITICAL RISK" : isHigh ? "HIGH RISK" : "NORMAL RISK")}
            </span>
            <span
              style={{
                padding: "0.35rem 0.75rem",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.75rem",
                fontWeight: 600,
                background: "var(--color-bg-secondary)",
                color: "var(--color-text)",
                border: "1px solid var(--color-border)",
              }}
            >
              STATUS: {complaint.status}
            </span>
          </div>
        </div>

        {/* STATUS NOTICES */}
        {statusMessage.text && (
          <div
            style={{
              padding: "1rem",
              borderRadius: "var(--radius-md)",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              background: statusMessage.type === "error" ? "var(--color-danger-subtle)" : "var(--color-success-subtle)",
              border: `1px solid ${statusMessage.type === "error" ? "var(--color-danger-border)" : "var(--color-success-border)"}`,
              color: statusMessage.type === "error" ? "var(--color-danger)" : "var(--color-success)",
            }}
          >
            {statusMessage.type === "error" ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span style={{ fontSize: "0.875rem" }}>{statusMessage.text}</span>
          </div>
        )}

        {/* WORKFLOW PIPELINE PROGRESSION */}
        <div className="card" style={{ padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-text)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Enforcement Lifecycle Progression
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>FSSAI Regulatory Protocol</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", gap: "0.5rem" }}>
            {[
              { step: "1", title: "Admin Verified", desc: "Triage check passed", active: true },
              { step: "2", title: "Assigned", desc: "Authority jurisdiction", active: true },
              { step: "3", title: "In Audit", desc: "Inspection / Lab test", active: Boolean(complaint.investigation_status) },
              { step: "4", title: "Enforcement", desc: "Statutory order", active: Boolean(complaint.action_type) },
              { step: "5", title: "Resolved", desc: "Full compliance verified", active: complaint.status === "RESOLVED" },
            ].map((st, idx) => (
              <div key={st.step} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", position: "relative" }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.8125rem",
                    fontWeight: 700,
                    background: st.active ? "var(--color-primary)" : "var(--color-bg-secondary)",
                    color: st.active ? "#ffffff" : "var(--color-text-muted)",
                    border: `2px solid ${st.active ? "var(--color-primary)" : "var(--color-border)"}`,
                    zIndex: 2,
                    marginBottom: "0.35rem",
                  }}
                >
                  {st.step}
                </div>
                <span style={{ fontSize: "0.8125rem", fontWeight: st.active ? 600 : 500, color: st.active ? "var(--color-text)" : "var(--color-text-muted)" }}>
                  {st.title}
                </span>
                <span style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)" }}>{st.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* TWO-COLUMN DETAILS GRID */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "1.5rem", marginBottom: "1.5rem" }}>
          {/* DOSSIER SUMMARY */}
          <div className="card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
              <FileText size={18} style={{ color: "var(--color-primary)" }} />
              <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--color-text)", margin: 0 }}>
                Allegation Dossier
              </h3>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: "0.5rem", fontSize: "0.875rem" }}>
                <span style={{ color: "var(--color-text-muted)" }}>Category:</span>
                <span style={{ fontWeight: 600, color: "var(--color-text)" }}>{complaint.category || "General Food Safety"}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: "0.5rem", fontSize: "0.875rem" }}>
                <span style={{ color: "var(--color-text-muted)" }}>Product Tested:</span>
                <span style={{ fontWeight: 600, color: "var(--color-text)" }}>{complaint.product_name || complaint.food_product || "Food Sample"}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: "0.5rem", fontSize: "0.875rem" }}>
                <span style={{ color: "var(--color-text-muted)" }}>Listing Status:</span>
                <span style={{ fontWeight: 600 }}>
                  {complaint.seller_listing_type === "UNLISTED" || !complaint.shop_id ? (
                    <span style={{ padding: "0.2rem 0.5rem", borderRadius: 4, fontSize: "0.75rem", background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}>
                      Unlisted Food Seller
                    </span>
                  ) : (
                    <span style={{ padding: "0.2rem 0.5rem", borderRadius: 4, fontSize: "0.75rem", background: "#e0f2fe", color: "#0369a1", border: "1px solid #bae6fd" }}>
                      Listed Shop / Restaurant
                    </span>
                  )}
                </span>
              </div>

              {complaint.seller_listing_type === "UNLISTED" || !complaint.shop_id ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: "0.5rem", fontSize: "0.875rem" }}>
                    <span style={{ color: "var(--color-text-muted)" }}>Seller Type:</span>
                    <span style={{ fontWeight: 600, color: "var(--color-text)" }}>{complaint.seller_type || "Roadside Vendor / Cart"}</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: "0.5rem", fontSize: "0.875rem" }}>
                    <span style={{ color: "var(--color-text-muted)" }}>Reported Name:</span>
                    <span style={{ fontWeight: 600, color: "var(--color-text)" }}>{complaint.reported_shop_name || "Unknown Seller"}</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: "0.5rem", fontSize: "0.875rem" }}>
                    <span style={{ color: "var(--color-text-muted)" }}>Reported Landmark:</span>
                    <span style={{ fontWeight: 500, color: "var(--color-text)" }}>{complaint.reported_landmark || complaint.location || "Location on Record"}</span>
                  </div>

                  {complaint.reported_address && (
                    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: "0.5rem", fontSize: "0.875rem" }}>
                      <span style={{ color: "var(--color-text-muted)" }}>Reported Address:</span>
                      <span style={{ fontWeight: 500, color: "var(--color-text)" }}>{complaint.reported_address}</span>
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: "0.5rem", fontSize: "0.875rem" }}>
                    <span style={{ color: "var(--color-text-muted)" }}>FSSAI Registration:</span>
                    <span style={{ fontWeight: 500, color: "var(--color-text-muted)" }}>{complaint.reported_registration_number || "None / Not Provided (Unlisted Vendor)"}</span>
                  </div>

                  {complaint.latitude !== null && complaint.latitude !== undefined && complaint.longitude !== null && complaint.longitude !== undefined && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-border)", paddingBottom: "0.5rem", fontSize: "0.875rem", flexWrap: "wrap", gap: "6px" }}>
                      <span style={{ color: "var(--color-text-muted)" }}>Seller GPS Location:</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#166534" }}>
                          📍 {Number(complaint.latitude).toFixed(6)}°, {Number(complaint.longitude).toFixed(6)}°
                        </span>
                        {complaint.location_accuracy && (
                          <span style={{ fontSize: "11px", background: "#e0f2fe", color: "#0369a1", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>
                            ±{Math.round(complaint.location_accuracy)}m
                          </span>
                        )}
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${complaint.latitude}&mlon=${complaint.longitude}#map=17/${complaint.latitude}/${complaint.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "12px", color: "#2563eb", fontWeight: 600, textDecoration: "underline" }}
                        >
                          <ExternalLink size={12} />
                          <span>Map</span>
                        </a>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: "0.5rem", fontSize: "0.875rem" }}>
                    <span style={{ color: "var(--color-text-muted)" }}>Vendor / Establishment:</span>
                    <span style={{ fontWeight: 600, color: "var(--color-primary)" }}>
                      {complaint.shop?.shop_name || complaint.shop_name || "Registered Vendor"}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: "0.5rem", fontSize: "0.875rem" }}>
                    <span style={{ color: "var(--color-text-muted)" }}>FSSAI / Location:</span>
                    <span style={{ fontWeight: 500, color: "var(--color-text)" }}>{complaint.location || "On Record"}</span>
                  </div>
                </>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", paddingBottom: "0.5rem", fontSize: "0.875rem" }}>
                <span style={{ color: "var(--color-text-muted)" }}>Filing Date:</span>
                <span style={{ fontWeight: 500, color: "var(--color-text)" }}>
                  {complaint.created_at ? new Date(complaint.created_at).toLocaleString("en-IN") : "Recorded"}
                </span>
              </div>

              <div>
                <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", marginBottom: "0.35rem" }}>
                  Consumer Statement
                </span>
                <p style={{ margin: 0, padding: "0.875rem", background: "var(--color-bg-secondary)", borderRadius: "var(--radius-md)", fontSize: "0.84375rem", color: "var(--color-text)", lineHeight: 1.5 }}>
                  {complaint.description || "No narrative statement submitted."}
                </p>
              </div>
            </div>
          </div>

          {/* EVIDENCE VIEWER & RISK AUDIT */}
          <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Camera size={18} style={{ color: "var(--color-primary)" }} />
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--color-text)", margin: 0 }}>
                  Submitted Evidence Media
                </h3>
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                {imageUrl ? "1 Image Attached" : "No Media"}
              </span>
            </div>

            {imageUrl ? (
              <div style={{ borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--color-border)", background: "#000000" }}>
                <ProtectedImage
                  src={imageUrl}
                  alt="Food Evidence"
                  style={{ width: "100%", maxHeight: "240px", objectFit: "contain", display: "block" }}
                  fallbackText="Secure evidence file restricted or unavailable"
                />
              </div>
            ) : (
              <div style={{ padding: "2.5rem 1rem", textAlign: "center", background: "var(--color-bg-secondary)", borderRadius: "var(--radius-md)", border: "1px dashed var(--color-border)" }}>
                <Camera size={32} style={{ margin: "0 auto 0.5rem auto", opacity: 0.35 }} />
                <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>No photographic evidence uploaded</span>
              </div>
            )}

            <div style={{ padding: "0.875rem", background: "var(--color-bg-secondary)", borderRadius: "var(--radius-md)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", display: "block" }}>Risk Severity Score</span>
                <strong style={{ fontSize: "1.25rem", color: isCritical ? "#DC2626" : isHigh ? "#EA580C" : "var(--color-text)" }}>
                  {riskScore} / 100
                </strong>
              </div>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  padding: "0.25rem 0.65rem",
                  borderRadius: "var(--radius-sm)",
                  background: isCritical ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)",
                  color: isCritical ? "#DC2626" : "#D97706",
                }}
              >
                {complaint.priority || "PRIORITY ACTION"}
              </span>
            </div>
          </div>
        </div>

        {/* FORMS SECTION: 1. UPDATE INVESTIGATION, 2. RECORD OFFICIAL ACTION */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem", marginBottom: "1.5rem" }}>
          {/* UPDATE INVESTIGATION FINDINGS */}
          <div className="card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
              <Clock size={18} style={{ color: "var(--color-primary)" }} />
              <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--color-text)", margin: 0 }}>
                1. Update Investigation Status
              </h3>
            </div>

            <form onSubmit={handleInvestigationUpdate} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label className="field-label" style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                  Designated Officer Name / Title
                </label>
                <input
                  type="text"
                  value={authorityName}
                  onChange={(e) => setAuthorityName(e.target.value)}
                  className="input-field"
                  placeholder="e.g. Officer R. Sharma, FSSAI Squad"
                  required
                />
              </div>

              <div>
                <label className="field-label" style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                  Investigation Status Stage
                </label>
                <select
                  value={investigationStatus}
                  onChange={(e) => setInvestigationStatus(e.target.value)}
                  className="input-field"
                >
                  <option value="ASSIGNED">Assigned for Field Audit</option>
                  <option value="UNDER_INVESTIGATION">Under Active Investigation</option>
                  <option value="ACTION_REQUIRED">Action Required</option>
                  <option value="ACTION_TAKEN">Action Taken</option>
                  <option value="RESOLVED">Resolved / Compliance Satisfied</option>
                </select>
              </div>

              <div>
                <label className="field-label" style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                  Inspection Findings & Lab Observations
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="input-field"
                  rows={4}
                  placeholder="Record food safety observations, hygiene audit results, temperature compliance..."
                  required
                />
              </div>

              <button
                type="submit"
                disabled={savingInvestigation}
                className="btn btn-primary"
                style={{ justifyContent: "center", padding: "0.625rem" }}
              >
                <Save size={16} />
                {savingInvestigation ? "Logging Findings..." : "Commit Investigation Status"}
              </button>
            </form>
          </div>

          {/* RECORD STATUTORY ENFORCEMENT ACTION */}
          <div className="card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
              <Gavel size={18} style={{ color: "#DC2626" }} />
              <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--color-text)", margin: 0 }}>
                2. Record Official Statutory Action
              </h3>
            </div>

            <form onSubmit={handleAuthorityAction} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label className="field-label" style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                  Statutory Enforcement Directive
                </label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="">-- Select Authority Directive --</option>
                  <option value="WARNING_ISSUED">Statutory Warning Notice Issued</option>
                  <option value="INSPECTION_ORDERED">Surprise In-Person Inspection Ordered</option>
                  <option value="SAMPLE_COLLECTED">Sample Seized for Forensic Analysis</option>
                  <option value="LAB_TEST_REQUESTED">Referral to Certified FSSAI DART Lab</option>
                  <option value="PENALTY_RECOMMENDED">Financial Penalty Adjudicated</option>
                  <option value="LICENSE_REVIEW">Food Safety License Under Formal Review</option>
                  <option value="SHOP_CLOSED">Temporary Establishment Closure Ordered</option>
                  <option value="NO_ACTION_REQUIRED">Dismissed - No Violation Substantiated</option>
                </select>
              </div>

              <div>
                <label className="field-label" style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                  Legal Order Reference & Directive Details
                </label>
                <textarea
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                  className="input-field"
                  rows={4}
                  placeholder="Specify statutory clause, compliance timeline (e.g. 7 days), sealing notice details..."
                  required
                />
              </div>

              <div style={{ marginTop: "auto" }}>
                <button
                  type="submit"
                  disabled={savingAction}
                  className="btn btn-danger"
                  style={{ width: "100%", justifyContent: "center", padding: "0.625rem" }}
                >
                  <Scale size={16} />
                  {savingAction ? "Transmitting Directive..." : "Issue & Record Statutory Order"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* AUDIT HISTORY TIMELINE */}
        <div className="card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <h3 style={{ fontSize: "1.0625rem", fontWeight: 600, color: "var(--color-text)", margin: 0 }}>
                Regulatory Audit History
              </h3>
              <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                Chronological chain of custody and action logs
              </span>
            </div>
            <button
              onClick={() => setHistoryRefreshTrigger((p) => p + 1)}
              className="btn btn-secondary"
              style={{ padding: "0.4rem 0.75rem", fontSize: "0.75rem" }}
            >
              <RefreshCw size={13} className={historyLoading ? "spin-icon" : ""} />
              Refresh Logs
            </button>
          </div>

          {historyLoading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
              Loading audit logs...
            </div>
          ) : history.length === 0 ? (
            <div style={{ padding: "2.5rem 1rem", textAlign: "center", color: "var(--color-text-muted)" }}>
              <Clock size={36} style={{ margin: "0 auto 0.5rem auto", opacity: 0.35 }} />
              <p style={{ margin: 0, fontSize: "0.875rem" }}>No previous authority activity recorded for this complaint yet.</p>
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
                        {item.investigation_status || item.action_type || item.action_status || "Authority Action"}
                      </strong>
                      <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                        {item.created_at ? new Date(item.created_at).toLocaleString("en-IN") : "Date on file"}
                      </span>
                    </div>
                    <p style={{ margin: "0 0 0.35rem 0", fontSize: "0.84375rem", color: "var(--color-text)", lineHeight: 1.5 }}>
                      {item.remarks || "No supplementary remarks filed."}
                    </p>
                    <span style={{ fontSize: "0.75rem", color: "var(--color-primary)", fontWeight: 600 }}>
                      Officer: {item.authority_name || "Authorized Authority"}
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

export default AuthorityComplaintDetails;