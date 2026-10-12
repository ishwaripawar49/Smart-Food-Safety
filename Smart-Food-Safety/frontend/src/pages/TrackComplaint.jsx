import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search, ArrowLeft, ShieldCheck, CheckCircle2, Clock, AlertCircle, ImageIcon } from "lucide-react";
import { authFetch, getApiUrl } from "../services/authService";
import ProtectedImage from "../components/ProtectedImage";

// Status → timeline step mapping
function getStatusStep(status) {
  const s = String(status || "").toUpperCase();
  if (s === "SUBMITTED")         return 1;
  if (s === "UNDER_REVIEW")      return 2;
  if (s === "VERIFIED")          return 3;
  if (s === "INVESTIGATION")     return 4;
  if (s === "RESOLVED")          return 5;
  if (s === "REJECTED")          return -1;
  return 1;
}

const STATUS_STEPS = [
  { label: "Submitted",    desc: "Your complaint has been received and logged." },
  { label: "Under Review", desc: "Admin is reviewing your submission." },
  { label: "Verified",     desc: "Complaint has been verified and is being processed." },
  { label: "Investigation",desc: "Authorities are investigating the issue on-site." },
  { label: "Resolved",     desc: "Action taken and complaint has been closed." },
];

function getStatusBadgeClass(status) {
  const s = String(status || "").toLowerCase();
  if (s === "submitted")         return "badge-submitted";
  if (s.includes("review"))      return "badge-review";
  if (s === "verified")          return "badge-verified";
  if (s.includes("investigation")) return "badge-investigation";
  if (s === "resolved")          return "badge-resolved";
  if (s === "rejected")          return "badge-rejected";
  return "badge-submitted";
}

function TrackComplaint() {
  const navigate = useNavigate();

  const [complaintId, setComplaintId] = useState("");
  const [complaint, setComplaint]     = useState(null);
  const [images, setImages]           = useState([]);
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);

  const handleTrack = async (e) => {
    e.preventDefault();
    setError("");
    setComplaint(null);
    setImages([]);

    const cleanId = complaintId.trim();
    if (!cleanId) {
      setError("Please enter your Complaint ID.");
      return;
    }

    setLoading(true);
    try {
      const res = await authFetch(`${getApiUrl()}/complaints/${encodeURIComponent(cleanId)}`);
      if (!res) return;

      const data = await res.json();

      if (res.status === 403) { setError(data.message || "Access denied. You can only view complaints submitted by your account."); return; }
      if (res.status === 404) { setError(data.message || "Complaint not found. Please verify the Complaint ID."); return; }
      if (!res.ok) { setError(data.message || `Error (${res.status}): Failed to retrieve complaint.`); return; }

      if (data.success && data.complaint) {
        setComplaint(data.complaint);
        setImages(data.complaint.images || data.images || []);
      } else {
        setError(data.message || "Complaint not found.");
      }
    } catch (err) {
      setError(err.message || "Cannot connect to backend. Please ensure the server is running.");
    } finally {
      setLoading(false);
    }
  };

  const step = complaint ? getStatusStep(complaint.status) : 0;
  const rejected = complaint?.status === "REJECTED";

  return (
    <div className="track-page">

      {/* Topbar */}
      <div className="track-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <div className="navbar-logo-icon">
            <ShieldCheck size={18} color="#fff" />
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: "var(--font-size-base)", color: "var(--color-heading)" }}>
              FoodSafe AI
            </span>
          </div>
        </div>
        <Link
          to="/customer-dashboard"
          className="btn btn-ghost btn-sm"
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
        >
          <ArrowLeft size={14} /> Dashboard
        </Link>
      </div>

      <div className="track-content">

        {/* Header */}
        <div className="track-header animate-fade-in-up">
          <div className="page-header-eyebrow">Status Tracking</div>
          <h1>Track Your Complaint</h1>
          <p>Enter your Complaint ID to see real-time status, details, and investigation updates.</p>
        </div>

        {/* Search Card */}
        <div className="track-search-card animate-fade-in-up">
          <h2>Find Your Complaint</h2>
          <p>
            Your Complaint ID was provided when you submitted your report.
            It looks like <strong>FSA-2026-123456</strong>.
          </p>

          <form onSubmit={handleTrack}>
            <div className="track-search-row">
              <input
                type="text"
                placeholder="Enter Complaint ID — e.g. FSA-2026-123456"
                value={complaintId}
                onChange={(e) => setComplaintId(e.target.value)}
                id="complaint-id-input"
                aria-label="Complaint ID"
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ whiteSpace: "nowrap", minWidth: 150 }}
              >
                {loading ? (
                  <>
                    <span className="spinner" style={{ width: 14, height: 14 }} />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search size={16} />
                    Track Complaint
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-error animate-fade-in" style={{ marginBottom: "var(--space-6)" }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Result */}
        {complaint && (
          <div className="complaint-result-card animate-fade-in-up">

            {/* Result Header */}
            <div className="complaint-result-header">
              <div>
                <div className="complaint-result-id">{complaint.complaint_id}</div>
                <div className="complaint-result-title">
                  {complaint.product_name || complaint.category || "Food Safety Complaint"}
                </div>
              </div>
              <span className={`badge ${getStatusBadgeClass(complaint.status)}`} style={{ fontSize: "var(--font-size-sm)", padding: "6px 14px" }}>
                {String(complaint.status || "").replace(/_/g, " ")}
              </span>
            </div>

            <div className="complaint-result-body">

              {/* Info Grid */}
              <div className="complaint-detail-grid" style={{ marginBottom: "var(--space-8)" }}>
                {[
                  { label: "Category",            value: complaint.category        || "N/A" },
                  { label: "Product / Food",       value: complaint.product_name   || "Not specified" },
                  {
                    label: "Seller / Vendor",
                    value: complaint.seller_listing_type === "UNLISTED" || !complaint.shop_id
                      ? `${complaint.reported_shop_name || "Unknown Seller"} (${complaint.seller_type || "Unlisted Vendor"})`
                      : (complaint.shop?.shop_name || complaint.shop_name || "Registered Establishment")
                  },
                  {
                    label: "Landmark / Location",
                    value: complaint.reported_landmark || complaint.location || "Not provided"
                  },
                  { label: "Priority",            value: complaint.priority        || "MEDIUM" },
                  { label: "Risk Score",          value: `${complaint.risk_score ?? 0} / 100` },
                  { label: "Incident Date",       value: complaint.incident_date ? new Date(complaint.incident_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "N/A" },
                  {
                    label: "Registry Status",
                    value: complaint.seller_listing_type === "UNLISTED" || !complaint.shop_id
                      ? "Unlisted Food Seller (Reported by Citizen)"
                      : "Verified Listed Establishment"
                  },
                  ...(complaint.latitude !== null && complaint.latitude !== undefined && complaint.longitude !== null && complaint.longitude !== undefined
                    ? [{
                        label: "Seller GPS Location",
                        value: `📍 ${Number(complaint.latitude).toFixed(6)}°, ${Number(complaint.longitude).toFixed(6)}°${complaint.location_accuracy ? ` (±${Math.round(complaint.location_accuracy)}m)` : ""}`
                      }]
                    : []),
                ].map((item) => (
                  <div key={item.label} className="complaint-detail-item">
                    <label>{item.label}</label>
                    <span>{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Internal Tracking Notice */}
              <div
                style={{
                  background: "var(--color-surface-2)",
                  padding: "var(--space-3) var(--space-4)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                  fontSize: "12px",
                  color: "var(--color-muted)",
                  marginBottom: "var(--space-6)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <ShieldCheck size={16} color="var(--color-primary)" />
                <span>
                  <strong>Internal Tracking Notice:</strong> #{complaint.complaint_id} is a FoodSafe AI platform tracking identifier used for automated case triage and officer workflow. It is not an official government FSSAI grievance number.
                </span>
              </div>

              {/* Description */}
              {complaint.description && (
                <div style={{ marginBottom: "var(--space-8)" }}>
                  <div style={{ fontSize: "var(--font-size-xs)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-secondary)", marginBottom: "var(--space-3)" }}>
                    Complaint Description
                  </div>
                  <p style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "var(--space-4)", fontSize: "var(--font-size-sm)", color: "var(--color-body)", lineHeight: 1.7 }}>
                    {complaint.description}
                  </p>
                </div>
              )}

              {/* Evidence Images */}
              {images.length > 0 && (
                <div style={{ marginBottom: "var(--space-8)" }}>
                  <div style={{ fontSize: "var(--font-size-xs)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-secondary)", marginBottom: "var(--space-4)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <ImageIcon size={13} /> Evidence Photos
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
                    {images.map((img) => {
                      const src = img.authenticated_url
                        ? `${getApiUrl().replace(/\/api\/?$/, "")}${img.authenticated_url}`
                        : `${getApiUrl()}/complaints/${complaint?.id || complaintId}/images/${img.id}`;
                      return (
                        <ProtectedImage
                          key={img.id}
                          src={src}
                          alt="Food evidence"
                          style={{ width: 200, height: 150, objectFit: "cover", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)" }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Timeline */}
              {!rejected ? (
                <div className="complaint-timeline">
                  <div className="timeline-title">Complaint Progress</div>
                  <div className="timeline-steps">
                    {STATUS_STEPS.map((s, idx) => {
                      const stepNum   = idx + 1;
                      const isDone    = step > stepNum;
                      const isCurrent = step === stepNum;

                      return (
                        <div
                          key={s.label}
                          className={`timeline-step ${isDone || isCurrent ? "done" : ""} ${isCurrent ? "current" : ""}`}
                        >
                          <div className="timeline-dot">
                            {isDone ? <CheckCircle2 size={14} color="#fff" /> : (
                              isCurrent ? <Clock size={12} color="var(--color-primary)" /> : null
                            )}
                          </div>
                          <div className="timeline-content">
                            <div className="timeline-step-name">{s.label}</div>
                            <div className="timeline-step-desc">{s.desc}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="alert alert-error">
                  <AlertCircle size={16} />
                  <div>
                    <strong>Complaint Rejected</strong>
                    <p style={{ margin: "4px 0 0", fontSize: "var(--font-size-sm)" }}>
                      This complaint was reviewed and could not be accepted. Please contact support if you believe this is an error.
                    </p>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default TrackComplaint;