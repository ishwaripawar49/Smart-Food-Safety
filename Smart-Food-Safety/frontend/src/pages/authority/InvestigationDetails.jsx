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
} from "lucide-react";
import AuthoritySidebar from "../../components/AuthoritySidebar";
import ProtectedImage from "../../components/ProtectedImage";
import { getApiUrl, authFetch } from "../../services/authService";

function InvestigationDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [investigationStatus, setInvestigationStatus] = useState("ASSIGNED");
  const [investigationRemarks, setInvestigationRemarks] = useState("");
  const [actionType, setActionType] = useState("");
  const [actionRemarks, setActionRemarks] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchComplaint = async () => {
      try {
        setLoading(true);
        setMessage("");

        const response = await authFetch(`${getApiUrl()}/complaints/${id}`);
        if (!response) return;

        const data = await response.json();
        if (response.ok && data.success && data.complaint) {
          const c = data.complaint;
          setComplaint(c);
          if (c.investigation_status) setInvestigationStatus(c.investigation_status);
          if (c.investigation_remarks) setInvestigationRemarks(c.investigation_remarks);
          if (c.action_type) setActionType(c.action_type);
          if (c.action_remarks) setActionRemarks(c.action_remarks);
        } else {
          setComplaint(null);
          setMessage(data.message || "Failed to load case investigation file.");
          setMessageType("error");
        }
      } catch (err) {
        console.error("Investigation fetch error:", err);
        setComplaint(null);
        setMessage("Unable to connect to authority backend.");
        setMessageType("error");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchComplaint();
  }, [id]);

  const handleSaveInvestigation = async () => {
    try {
      setSubmitting(true);
      setMessage("");

      const response = await authFetch(
        `${getApiUrl()}/authority/complaints/${id}/investigation`,
        {
          method: "PUT",
          body: JSON.stringify({
            authority_name: "Authorized Food Safety Officer",
            investigation_status: investigationStatus,
            remarks: investigationRemarks,
          }),
        }
      );

      const data = await response.json();
      if (response.ok && data.success) {
        setMessage("Investigation findings and status recorded successfully.");
        setMessageType("success");
      } else {
        setMessage(data.message || "Failed to save investigation.");
        setMessageType("error");
      }
    } catch (err) {
      console.error(err);
      setMessage("Failed to transmit investigation update.");
      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordAction = async () => {
    if (!actionType) {
      setMessage("Please select a statutory enforcement action.");
      setMessageType("error");
      return;
    }

    try {
      setSubmitting(true);
      setMessage("");

      const response = await authFetch(
        `${getApiUrl()}/authority/complaints/${id}/action`,
        {
          method: "POST",
          body: JSON.stringify({
            authority_name: "Authorized Food Safety Officer",
            action_type: actionType,
            remarks: actionRemarks,
          }),
        }
      );

      const data = await response.json();
      if (response.ok && data.success) {
        setMessage("Official regulatory enforcement action recorded and filed in public registry.");
        setMessageType("success");
      } else {
        setMessage(data.message || "Failed to record enforcement action.");
        setMessageType("error");
      }
    } catch (err) {
      console.error(err);
      setMessage("Network error recording enforcement action.");
      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-layout">
        <AuthoritySidebar />
        <main className="admin-main">
          <div className="page-loading">
            <div className="page-loading-card animate-fade-in">
              <div className="spinner" style={{ margin: "0 auto 20px" }} />
              <h3>Retrieving Audit Docket #{id}</h3>
              <p>Loading officer case details...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="admin-layout">
        <AuthoritySidebar />
        <main className="admin-main">
          <div className="empty-state">
            <div className="empty-state-icon">
              <AlertTriangle size={32} />
            </div>
            <h3>Case File Not Found</h3>
            <p>{message || "The requested investigation record does not exist."}</p>
            <button className="btn btn-primary" onClick={() => navigate("/authority/investigations")}>
              Return to Investigations
            </button>
          </div>
        </main>
      </div>
    );
  }

  const images = complaint.images || [];
  const trackingId = complaint.complaint_id || `INV-${complaint.id}`;
  const riskScore = complaint.risk_score ?? 0;
  const riskLevel = complaint.risk_level || (riskScore >= 75 ? "CRITICAL" : riskScore >= 50 ? "HIGH" : "MEDIUM");

  return (
    <div className="admin-layout">
      <AuthoritySidebar />

      <main className="admin-main">
        {/* Header */}
        <div className="page-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => navigate("/authority/investigations")}
                style={{ padding: "4px 8px" }}
              >
                <ArrowLeft size={16} />
              </button>
              <h1 className="page-title" style={{ margin: 0 }}>
                Inspection Docket: {trackingId}
              </h1>
              <span
                className={`badge ${
                  riskLevel === "CRITICAL" || riskLevel === "HIGH" ? "badge-rejected" : "badge-review"
                }`}
              >
                {riskLevel} RISK
              </span>
            </div>
            <p className="page-subtitle">
              Conduct official statutory audits, review citizen evidence, record field test findings, and issue statutory directives.
            </p>
          </div>

          <button className="btn btn-secondary" onClick={() => navigate("/authority/investigations")}>
            <ArrowLeft size={16} />
            <span>Investigations List</span>
          </button>
        </div>

        {/* Feedback Message */}
        {message && (
          <div
            className="animate-fade-in"
            style={{
              padding: "var(--space-3) var(--space-4)",
              background:
                messageType === "success" ? "var(--color-success-bg)" : "var(--color-error-bg)",
              border: `1px solid ${
                messageType === "success"
                  ? "var(--color-success-border)"
                  : "var(--color-error-border)"
              }`,
              color: messageType === "success" ? "var(--color-success)" : "var(--color-error)",
              borderRadius: "var(--radius-md)",
              marginBottom: "var(--space-5)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "var(--font-size-sm)",
            }}
          >
            {messageType === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{message}</span>
          </div>
        )}

        {/* 2-Column Investigation Desk */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
            gap: "var(--space-6)",
            alignItems: "start",
          }}
        >
          {/* Left Column: Complaint Narrative & Evidence */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            {/* Overview Card */}
            <div className="card" style={{ padding: "var(--space-6)" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px solid var(--color-border)",
                  paddingBottom: "var(--space-3)",
                  marginBottom: "var(--space-4)",
                }}
              >
                <h3 style={{ margin: 0, fontSize: "var(--font-size-lg)" }}>
                  Allegation Dossier
                </h3>
                <span style={{ fontSize: "12px", color: "var(--color-muted)" }}>
                  Priority: <strong>{complaint.priority || "MEDIUM"}</strong>
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
                    COMMODITY UNDER AUDIT
                  </span>
                  <strong style={{ color: "var(--color-heading)" }}>
                    {complaint.product_name || complaint.food_product || "Food Sample"}
                  </strong>
                </div>

                <div>
                  <span style={{ color: "var(--color-muted)", fontSize: "12px", display: "block" }}>
                    VIOLATION CLASSIFICATION
                  </span>
                  <strong style={{ color: "var(--color-heading)" }}>
                    {complaint.category || "Safety Violation"}
                  </strong>
                </div>

                <div>
                  <span style={{ color: "var(--color-muted)", fontSize: "12px", display: "block" }}>
                    INCIDENT DATE
                  </span>
                  <div>
                    {complaint.incident_date
                      ? new Date(complaint.incident_date).toLocaleDateString()
                      : "Not specified"}
                  </div>
                </div>

                <div>
                  <span style={{ color: "var(--color-muted)", fontSize: "12px", display: "block" }}>
                    PURCHASE LOCATION
                  </span>
                  <div>{complaint.location || "Area not specified"}</div>
                </div>
              </div>

              {/* Establishment / Seller Info */}
              <div
                style={{
                  background: "var(--color-surface-2)",
                  padding: "var(--space-4)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                  marginBottom: "var(--space-4)",
                }}
              >
                {complaint.seller_listing_type === "UNLISTED" || !complaint.shop_id ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Building2 size={16} color="#d97706" />
                        <strong style={{ fontSize: "var(--font-size-sm)", color: "var(--color-heading)" }}>
                          Unlisted Food Seller / Street Vendor
                        </strong>
                      </div>
                      <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "#fef3c7", color: "#92400e" }}>
                        UNLISTED SELLER
                      </span>
                    </div>
                    <div style={{ fontWeight: 600, color: "var(--color-heading)" }}>
                      {complaint.reported_shop_name || "Unknown Seller / Food Stall"}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--color-muted)", marginTop: "2px" }}>
                      <strong>Seller Type:</strong> {complaint.seller_type || "Roadside Vendor / Cart"}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--color-muted)", marginTop: "2px" }}>
                      <strong>Landmark:</strong> {complaint.reported_landmark || complaint.location || "Not specified"}
                    </div>
                    {complaint.reported_address && (
                      <div style={{ fontSize: "12px", color: "var(--color-muted)", marginTop: "2px" }}>
                        <strong>Address:</strong> {complaint.reported_address}
                      </div>
                    )}
                    <div style={{ fontSize: "12px", color: "var(--color-muted)", marginTop: "2px" }}>
                      <strong>FSSAI Registration:</strong> {complaint.reported_registration_number || "None / Not Provided (Unlisted Vendor)"}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <Building2 size={16} color="var(--color-primary)" />
                      <strong style={{ fontSize: "var(--font-size-sm)", color: "var(--color-heading)" }}>
                        Food Business Operator (FBO) Under Notice
                      </strong>
                    </div>
                    <div>{complaint.shop?.shop_name || complaint.shop_name || "Registered Establishment"}</div>
                    {complaint.shop?.license_number && (
                      <div style={{ fontSize: "12px", color: "var(--color-muted)", marginTop: "2px" }}>
                        FSSAI Registration: {complaint.shop.license_number}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Narrative */}
              <div>
                <h4 style={{ margin: "0 0 6px", fontSize: "var(--font-size-sm)" }}>
                  Complainant's Witness Narrative
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
                  {complaint.description || "No narrative supplied."}
                </div>
              </div>
            </div>

            {/* Evidence Card */}
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
                  Submitted Evidence ({images.length})
                </h3>
              </div>

              {images.length === 0 ? (
                <div style={{ padding: "var(--space-6)", textAlign: "center", color: "var(--color-muted)" }}>
                  <Camera size={28} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
                  <p style={{ margin: 0, fontSize: "var(--font-size-sm)" }}>
                    No photographic evidence uploaded with this case.
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
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
                          alt="Audit Evidence"
                          style={{
                            width: "100%",
                            height: "160px",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                        <div style={{ padding: "6px 10px", fontSize: "11px", color: "var(--color-muted)" }}>
                          Evidence Item #{img.id}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Audit Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            {/* Investigation Progress Update */}
            <div className="card" style={{ padding: "var(--space-6)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "var(--space-4)" }}>
                <Clock size={18} color="var(--color-primary)" />
                <h3 style={{ margin: 0, fontSize: "var(--font-size-lg)" }}>
                  Officer Audit Findings
                </h3>
              </div>

              <div className="form-group">
                <label className="form-label">Investigation Phase</label>
                <select
                  className="form-control"
                  value={investigationStatus}
                  onChange={(e) => setInvestigationStatus(e.target.value)}
                  disabled={submitting}
                >
                  <option value="ASSIGNED">Officer Assigned</option>
                  <option value="IN_PROGRESS">On-site Audit In Progress</option>
                  <option value="SAMPLE_COLLECTED">Physical Sample Collected</option>
                  <option value="LAB_TESTING">Sent for Certified Lab Testing</option>
                  <option value="VERIFIED">Inspection Findings Confirmed</option>
                  <option value="CLOSED">Investigation Concluded</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Inspection Notes & Test Observations</label>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="Record on-site findings, batch seizure numbers, storage temperature, lab referral ref..."
                  value={investigationRemarks}
                  onChange={(e) => setInvestigationRemarks(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <button
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={handleSaveInvestigation}
                disabled={submitting}
              >
                <Save size={16} />
                <span>Save Investigation Findings</span>
              </button>
            </div>

            {/* Official Enforcement Directives Form */}
            <div className="card" style={{ padding: "var(--space-6)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "var(--space-4)" }}>
                <Gavel size={18} color="var(--color-error)" />
                <h3 style={{ margin: 0, fontSize: "var(--font-size-lg)" }}>
                  Statutory Enforcement Order
                </h3>
              </div>

              <div className="form-group">
                <label className="form-label">Legal Directive / Action Order</label>
                <select
                  className="form-control"
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  disabled={submitting}
                >
                  <option value="">Select Enforcement Action</option>
                  <option value="INSPECTION_SCHEDULED">Formal Notice of Inspection Scheduled</option>
                  <option value="SAMPLE_COLLECTED">Official Statutory Sample Seized for Analysis</option>
                  <option value="NOTICE_ISSUED">Section 32 Improvement Notice Issued</option>
                  <option value="FINE_IMPOSED">Monetary Penalty / Compounding Fine Levied</option>
                  <option value="SHOP_SEALED">Emergency Prohibition Order / Premises Sealed</option>
                  <option value="CASE_CLOSED">Statutory Compliance Met / Case Concluded</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Order Reference & Legal Remarks</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Specify statutory section, penalty amount, or deadline for merchant compliance..."
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <button
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center", background: "#DC2626" }}
                onClick={handleRecordAction}
                disabled={submitting}
              >
                <Scale size={16} />
                <span>Issue & File Statutory Order</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default InvestigationDetails;