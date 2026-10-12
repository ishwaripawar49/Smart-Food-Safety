import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  FileText,
  ArrowLeft,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Save,
  Building2,
  Calendar,
  MapPin,
  ExternalLink,
  RefreshCw,
  Compass,
  Info,
  Sparkles,
} from "lucide-react";
import AdminSidebar from "../../components/AdminSidebar";
import ProtectedImage from "../../components/ProtectedImage";
import { authFetch, getApiUrl } from "../../services/authService";

function getStatusClass(status) {
  const s = String(status || "").toLowerCase().replace(/_/g, "-");
  if (s.includes("submitted") || s.includes("pending")) return "badge-submitted";
  if (s.includes("review")) return "badge-review";
  if (s.includes("verified")) return "badge-verified";
  if (s.includes("investigation")) return "badge-investigation";
  if (s.includes("resolved")) return "badge-resolved";
  if (s.includes("rejected")) return "badge-rejected";
  return "badge-submitted";
}

function ComplaintDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [complaint, setComplaint] = useState(null);
  const [status, setStatus] = useState("SUBMITTED");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let mounted = true;

    const loadComplaint = async () => {
      try {
        setLoading(true);
        const response = await authFetch(`${getApiUrl()}/complaints/${id}`);
        if (!response || !mounted) return;

        const data = await response.json();
        if (!mounted) return;

        if (data.success && data.complaint) {
          setComplaint(data.complaint);
          setStatus(data.complaint.status || "SUBMITTED");
          setRemarks(data.complaint.admin_remark || "");
          setError("");
        } else {
          setError(data.message || "Grievance file not found.");
        }
      } catch (err) {
        if (!mounted) return;
        console.error("Fetch complaint error:", err);
        setError("Cannot connect to server. Ensure backend service is operational.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (id) loadComplaint();
    return () => {
      mounted = false;
    };
  }, [id, refreshTrigger]);

  const handleUpdate = async () => {
    if (!complaint) return;

    try {
      setUpdating(true);
      setUpdateSuccess(false);

      const statusRes = await authFetch(
        `${getApiUrl()}/admin/complaints/${complaint.id}/status`,
        {
          method: "PUT",
          body: JSON.stringify({ status }),
        }
      );

      if (!statusRes) return;
      const statusData = await statusRes.json();
      if (!statusData.success) {
        alert(statusData.message || "Failed to update grievance status.");
        return;
      }

      const remarkRes = await authFetch(
        `${getApiUrl()}/admin/complaints/${complaint.id}/remark`,
        {
          method: "PUT",
          body: JSON.stringify({ admin_remark: remarks }),
        }
      );

      if (!remarkRes) return;
      const remarkData = await remarkRes.json();
      if (!remarkData.success) {
        alert(remarkData.message || "Status updated but remarks failed to save.");
        setRefreshTrigger((p) => p + 1);
        return;
      }

      setUpdateSuccess(true);
      setRefreshTrigger((p) => p + 1);
      setTimeout(() => setUpdateSuccess(false), 4000);
    } catch (err) {
      console.error("Update complaint error:", err);
      alert(err.message || "Cannot connect to backend.");
    } finally {
      setUpdating(false);
    }
  };

  const images = complaint && Array.isArray(complaint.images) ? complaint.images : [];
  const riskScore = complaint ? Number(complaint.risk_score || 0) : 0;
  const trackingId = complaint ? complaint.complaint_id || `CMP-${complaint.id}` : id;

  if (loading) {
    return (
      <div className="admin-layout">
        <AdminSidebar />
        <main className="admin-main">
          <div className="page-loading">
            <div className="page-loading-card animate-fade-in">
              <div className="spinner" style={{ margin: "0 auto 20px" }} />
              <h3>Retrieving Case File #{id}</h3>
              <p>Loading dossier details...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="admin-layout">
        <AdminSidebar />
        <main className="admin-main">
          <div className="page-header">
            <button className="btn btn-secondary" onClick={() => navigate("/manage-complaints")}>
              <ArrowLeft size={16} />
              <span>Back to Complaints</span>
            </button>
          </div>
          <div className="empty-state">
            <div className="empty-state-icon">
              <ShieldAlert size={32} />
            </div>
            <h3>Grievance Record Not Found</h3>
            <p>{error || "The requested grievance does not exist or has been archived."}</p>
            <Link to="/manage-complaints" className="btn btn-primary">
              Return to Registry
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const timelineSteps = [
    { key: "SUBMITTED", label: "Grievance Filed" },
    { key: "UNDER_REVIEW", label: "Admin Assessment" },
    { key: "VERIFIED", label: "Official Verification" },
    { key: "INVESTIGATION", label: "Field Investigation" },
    { key: "RESOLVED", label: "Enforcement / Closure" },
  ];

  const currentIdx = timelineSteps.findIndex((s) => s.key === status);

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-main">
        {/* Header */}
        <div className="page-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => navigate("/manage-complaints")}
                style={{ padding: "4px 8px" }}
              >
                <ArrowLeft size={16} />
              </button>
              <h1 className="page-title" style={{ margin: 0 }}>
                Case File: {trackingId}
              </h1>
              <span className={`badge ${getStatusClass(complaint.status)}`}>
                {String(complaint.status || "SUBMITTED").replace(/_/g, " ")}
              </span>
            </div>
            <p className="page-subtitle">
              Detailed case review, complainant allegations, uploaded food evidence, and statutory status assignment.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              className="btn btn-secondary"
              onClick={() => setRefreshTrigger((p) => p + 1)}
            >
              <RefreshCw size={16} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {updateSuccess && (
          <div
            className="animate-fade-in"
            style={{
              padding: "var(--space-3) var(--space-4)",
              background: "var(--color-success-bg)",
              border: "1px solid var(--color-success-border)",
              color: "var(--color-success)",
              borderRadius: "var(--radius-md)",
              marginBottom: "var(--space-5)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "var(--font-size-sm)",
            }}
          >
            <CheckCircle2 size={18} />
            <span>Case status and remarks updated successfully.</span>
          </div>
        )}

        {/* 2-Column Investigation Workspace */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
            gap: "var(--space-6)",
            alignItems: "start",
          }}
        >
          {/* Left Column: Complaint Details & Evidence */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            {/* Case Overview Card */}
            <div className="card" style={{ padding: "var(--space-6)" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid var(--color-border)",
                  paddingBottom: "var(--space-3)",
                  marginBottom: "var(--space-4)",
                }}
              >
                <h3 style={{ margin: 0, fontSize: "var(--font-size-lg)" }}>
                  Grievance Dossier
                </h3>
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-muted)" }}>
                  Filed: {complaint.created_at ? new Date(complaint.created_at).toLocaleString() : "Recent"}
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "var(--space-4)",
                  fontSize: "var(--font-size-sm)",
                  marginBottom: "var(--space-5)",
                }}
              >
                <div>
                  <span style={{ color: "var(--color-muted)", fontSize: "12px", display: "block" }}>
                    CATEGORY
                  </span>
                  <strong style={{ color: "var(--color-heading)" }}>
                    {complaint.category || "Food Safety Violation"}
                  </strong>
                </div>

                <div>
                  <span style={{ color: "var(--color-muted)", fontSize: "12px", display: "block" }}>
                    COMMODITY / PRODUCT
                  </span>
                  <strong style={{ color: "var(--color-heading)" }}>
                    {complaint.product_name || complaint.food_product || "Unspecified"}
                  </strong>
                </div>

                <div>
                  <span style={{ color: "var(--color-muted)", fontSize: "12px", display: "block" }}>
                    OCCURRENCE DATE
                  </span>
                  <div>{complaint.incident_date ? new Date(complaint.incident_date).toLocaleDateString() : "—"}</div>
                </div>

                <div>
                  <span style={{ color: "var(--color-muted)", fontSize: "12px", display: "block" }}>
                    LOCATION
                  </span>
                  <div>{complaint.location || "Location not stated"}</div>
                </div>
              </div>

              {/* Establishment / Unlisted Seller Details Card */}
              {complaint.seller_listing_type === "UNLISTED" || !complaint.shop_id ? (
                <div
                  style={{
                    background: "rgba(59, 130, 246, 0.05)",
                    padding: "var(--space-4)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid rgba(59, 130, 246, 0.25)",
                    marginBottom: "var(--space-5)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Compass size={18} color="#2563EB" />
                      <strong style={{ fontSize: "var(--font-size-sm)", color: "#1E40AF" }}>
                        Unlisted Food Seller / Roadside Vendor
                      </strong>
                    </div>
                    <span
                      className="badge"
                      style={{
                        background: "#EFF6FF",
                        color: "#1D4ED8",
                        border: "1px solid #BFDBFE",
                        fontSize: "11px",
                        fontWeight: 700,
                      }}
                    >
                      Unlisted Food Seller
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)", fontSize: "var(--font-size-sm)" }}>
                    <div>
                      <span style={{ color: "var(--color-muted)", fontSize: "11px", display: "block" }}>
                        SELLER CLASSIFICATION
                      </span>
                      <strong style={{ color: "var(--color-heading)" }}>
                        {complaint.seller_type || "Roadside Vendor"}
                      </strong>
                    </div>

                    <div>
                      <span style={{ color: "var(--color-muted)", fontSize: "11px", display: "block" }}>
                        REPORTED STALL / SHOP NAME
                      </span>
                      <strong style={{ color: "var(--color-heading)" }}>
                        {complaint.reported_shop_name || "Unknown Seller (No Name Stated)"}
                      </strong>
                    </div>

                    <div>
                      <span style={{ color: "var(--color-muted)", fontSize: "11px", display: "block" }}>
                        LOCATION LANDMARK
                      </span>
                      <div style={{ color: "var(--color-heading)" }}>
                        {complaint.reported_landmark || complaint.location || "Landmark on record"}
                      </div>
                    </div>

                    <div>
                      <span style={{ color: "var(--color-muted)", fontSize: "11px", display: "block" }}>
                        STREET ADDRESS / AREA
                      </span>
                      <div style={{ color: "var(--color-heading)" }}>
                        {complaint.reported_address || "None provided"}
                      </div>
                    </div>

                    <div>
                      <span style={{ color: "var(--color-muted)", fontSize: "11px", display: "block" }}>
                        REPORTED FSSAI / REGISTRATION
                      </span>
                      <div style={{ color: "var(--color-heading)" }}>
                        {complaint.reported_registration_number || "None reported (Not required)"}
                      </div>
                    </div>

                    <div>
                      <span style={{ color: "var(--color-muted)", fontSize: "11px", display: "block" }}>
                        DIRECTORY STATUS
                      </span>
                      <span className="badge badge-submitted" style={{ fontSize: "11px" }}>
                        {complaint.registration_verification_status || "UNVERIFIED"}
                      </span>
                    </div>

                    {complaint.latitude !== null && complaint.latitude !== undefined && complaint.longitude !== null && complaint.longitude !== undefined && (
                      <div style={{ gridColumn: "span 2", marginTop: "6px" }}>
                        <span style={{ color: "var(--color-muted)", fontSize: "11px", display: "block" }}>
                          SELLER GPS COORDINATES
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px", flexWrap: "wrap" }}>
                          <strong style={{ color: "#166534", fontFamily: "monospace", fontSize: "13px" }}>
                            📍 {Number(complaint.latitude).toFixed(6)}°, {Number(complaint.longitude).toFixed(6)}°
                          </strong>
                          {complaint.location_accuracy && (
                            <span
                              style={{
                                fontSize: "11px",
                                background: "#E0F2FE",
                                color: "#0369A1",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontWeight: 600,
                              }}
                            >
                              ±{Math.round(complaint.location_accuracy)}m accuracy
                            </span>
                          )}
                          <a
                            href={`https://www.openstreetmap.org/?mlat=${complaint.latitude}&mlon=${complaint.longitude}#map=17/${complaint.latitude}/${complaint.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "12px",
                              color: "#2563EB",
                              fontWeight: 600,
                              textDecoration: "underline",
                            }}
                          >
                            <ExternalLink size={13} />
                            <span>Open on Map</span>
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      marginTop: "10px",
                      padding: "8px 10px",
                      background: "rgba(59, 130, 246, 0.08)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "11px",
                      color: "var(--color-secondary)",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Info size={14} color="#2563EB" />
                    <span>
                      Shop Not Found in Directory: Absence from the database does not imply illegal operation. Seller information is retained for investigation without auto-merging into the verified shops database.
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: "var(--color-surface-2)",
                    padding: "var(--space-4)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-border)",
                    marginBottom: "var(--space-5)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Building2 size={16} color="var(--color-primary)" />
                      <strong style={{ fontSize: "var(--font-size-sm)", color: "var(--color-heading)" }}>
                        Registered Food Establishment
                      </strong>
                    </div>
                    <span className="badge badge-resolved" style={{ fontSize: "11px" }}>
                      Listed Shop
                    </span>
                  </div>
                  <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-heading)" }}>
                    {complaint.shop?.shop_name || complaint.shop_name || `Establishment #${complaint.shop_id}`}
                  </div>
                  {complaint.shop?.license_number && (
                    <div style={{ fontSize: "12px", color: "var(--color-muted)", marginTop: "2px" }}>
                      FSSAI License: {complaint.shop.license_number}
                    </div>
                  )}
                  {complaint.shop?.address && (
                    <div style={{ fontSize: "12px", color: "var(--color-secondary)", marginTop: "2px" }}>
                      Address: {complaint.shop.address}, {complaint.shop.city}
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              <div>
                <h4 style={{ margin: "0 0 8px", fontSize: "var(--font-size-sm)", color: "var(--color-heading)" }}>
                  Complainant's Narrative
                </h4>
                <div
                  style={{
                    background: "var(--color-surface)",
                    padding: "var(--space-4)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-border)",
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-body)",
                    lineHeight: "1.6",
                  }}
                >
                  {complaint.description || "No narrative description provided."}
                </div>
              </div>
            </div>

            {/* Photographic Evidence Card */}
            <div className="card" style={{ padding: "var(--space-6)" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  borderBottom: "1px solid var(--color-border)",
                  paddingBottom: "var(--space-3)",
                  marginBottom: "var(--space-4)",
                }}
              >
                <Camera size={18} color="var(--color-primary)" />
                <h3 style={{ margin: 0, fontSize: "var(--font-size-lg)" }}>
                  Photographic Evidence ({images.length})
                </h3>
              </div>

              {images.length === 0 ? (
                <div style={{ padding: "var(--space-6)", textAlign: "center", color: "var(--color-muted)" }}>
                  <Camera size={32} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
                  <p style={{ margin: 0, fontSize: "var(--font-size-sm)" }}>
                    No photographic evidence was uploaded with this complaint.
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                    gap: "var(--space-4)",
                  }}
                >
                  {images.map((img) => {
                    const imgSrc = img.authenticated_url
                      ? `${getApiUrl().replace(/\/api\/?$/, "")}${img.authenticated_url}`
                      : `${getApiUrl()}/complaints/${complaint.id}/images/${img.id}`;

                    return (
                      <div
                        key={img.id}
                        style={{
                          border: "1px solid var(--color-border)",
                          borderRadius: "var(--radius-md)",
                          overflow: "hidden",
                          background: "var(--color-surface-2)",
                        }}
                      >
                        <ProtectedImage
                          src={imgSrc}
                          alt="Grievance Evidence"
                          style={{
                            width: "100%",
                            height: "180px",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                        <div style={{ padding: "8px 12px", fontSize: "11px", color: "var(--color-muted)" }}>
                          Evidence Photo #{img.id}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Timeline Lifecycle Card */}
            <div className="card" style={{ padding: "var(--space-6)" }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "var(--font-size-lg)" }}>
                Lifecycle Milestones
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {timelineSteps.map((step, idx) => {
                  const isDone = currentIdx >= idx;
                  const isCurrent = currentIdx === idx;

                  return (
                    <div
                      key={step.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          background: isDone
                            ? "var(--color-primary)"
                            : "var(--color-surface-2)",
                          color: isDone ? "#fff" : "var(--color-muted)",
                          border: `2px solid ${
                            isDone ? "var(--color-primary)" : "var(--color-border)"
                          }`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          fontWeight: "700",
                          flexShrink: 0,
                        }}
                      >
                        {isDone ? <CheckCircle2 size={16} /> : idx + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: isCurrent ? "700" : "500",
                            color: isDone ? "var(--color-heading)" : "var(--color-muted)",
                            fontSize: "var(--font-size-sm)",
                          }}
                        >
                          {step.label}
                        </div>
                      </div>
                      {isCurrent && (
                        <span
                          style={{
                            fontSize: "11px",
                            color: "var(--color-primary)",
                            fontWeight: "700",
                            background: "var(--color-primary-light)",
                            padding: "2px 8px",
                            borderRadius: "var(--radius-full)",
                          }}
                        >
                          ACTIVE PHASE
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Risk & Action Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            {/* Risk Assessment Box */}
            <div className="card" style={{ padding: "var(--space-6)" }}>
              <h3 style={{ margin: "0 0 12px", fontSize: "var(--font-size-lg)" }}>
                Automated Risk Scoring
              </h3>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  background:
                    riskScore >= 70
                      ? "var(--color-error-bg)"
                      : riskScore >= 40
                      ? "var(--color-warning-bg)"
                      : "var(--color-success-bg)",
                  border: `1px solid ${
                    riskScore >= 70
                      ? "var(--color-error-border)"
                      : riskScore >= 40
                      ? "var(--color-warning-border)"
                      : "var(--color-success-border)"
                  }`,
                  padding: "var(--space-4)",
                  borderRadius: "var(--radius-md)",
                  marginBottom: "var(--space-4)",
                }}
              >
                <div
                  style={{
                    fontSize: "var(--font-size-4xl)",
                    fontWeight: "900",
                    color:
                      riskScore >= 70
                        ? "var(--color-error)"
                        : riskScore >= 40
                        ? "var(--color-warning)"
                        : "var(--color-success)",
                  }}
                >
                  {riskScore}
                  <span style={{ fontSize: "14px", fontWeight: "500" }}>/100</span>
                </div>
                <div>
                  <strong style={{ display: "block", color: "var(--color-heading)" }}>
                    {riskScore >= 70
                      ? "Critical Risk Profile"
                      : riskScore >= 40
                      ? "Elevated Risk Profile"
                      : "Standard Risk Profile"}
                  </strong>
                  <span style={{ fontSize: "12px", color: "var(--color-body)" }}>
                    {riskScore >= 70
                      ? "Mandates priority enforcement dispatch within 24 hours."
                      : riskScore >= 40
                      ? "Requires verification and sample procurement."
                      : "Handled through routine administrative inquiry."}
                  </span>
                </div>
              </div>

              <Link
                to="/admin-intelligence"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#16a34a",
                  textDecoration: "none",
                }}
              >
                <Sparkles size={14} />
                <span>Open in FoodSafe Intelligence Hub</span>
              </Link>
            </div>

            {/* Status & Remarks Action Form */}
            <div className="card" style={{ padding: "var(--space-6)" }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "var(--font-size-lg)" }}>
                Administrative Decision Desk
              </h3>

              <div className="form-group">
                <label className="form-label">Update Grievance Status</label>
                <select
                  className="form-control"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={updating}
                >
                  <option value="SUBMITTED">Submitted (Intake)</option>
                  <option value="UNDER_REVIEW">Under Review (Administrative)</option>
                  <option value="VERIFIED">Verified (Refer to Authority)</option>
                  <option value="INVESTIGATION">Investigation (Field Audit)</option>
                  <option value="RESOLVED">Resolved (Action Taken)</option>
                  <option value="REJECTED">Rejected (Non-actionable)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Administrative Remarks & Directives</label>
                <textarea
                  className="form-control"
                  rows={5}
                  placeholder="Record verification notes, referral orders, or official reasoning..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  disabled={updating}
                />
              </div>

              <button
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center", padding: "12px" }}
                onClick={handleUpdate}
                disabled={updating}
              >
                {updating ? (
                  <>
                    <div className="spinner" style={{ width: "16px", height: "16px" }} />
                    <span>Transmitting Record...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Commit Case Updates</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ComplaintDetails;