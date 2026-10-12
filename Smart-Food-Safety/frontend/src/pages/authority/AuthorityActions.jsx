import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Gavel,
  Scale,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  FileText,
  AlertCircle,
  RefreshCw,
  Search,
} from "lucide-react";
import AuthoritySidebar from "../../components/AuthoritySidebar";
import { getApiUrl, authFetch } from "../../services/authService";

function AuthorityActions() {
  const navigate = useNavigate();

  const [complaints, setComplaints] = useState([]);
  const [complaintId, setComplaintId] = useState("");
  const [actionType, setActionType] = useState("");
  const [inspectionRequired, setInspectionRequired] = useState("YES");
  const [remarks, setRemarks] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let mounted = true;

    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    if (!token || !user) {
      navigate("/login");
      return;
    }

    if (user.role !== "AUTHORIZED_AUTHORITY") {
      navigate("/login");
      return;
    }

    const loadComplaints = async () => {
      try {
        setLoading(true);
        const response = await authFetch(`${getApiUrl()}/authority/complaints`);
        if (!response || !mounted) return;

        if (response.status === 401 || response.status === 403) {
          navigate("/login");
          return;
        }

        const data = await response.json();
        if (!mounted) return;

        const complaintList = data.complaints || data.data || [];
        setComplaints(complaintList);

        if (complaintList.length > 0 && !complaintId) {
          setComplaintId(complaintList[0].id || complaintList[0].complaint_id || "");
        }
      } catch (err) {
        if (!mounted) return;
        console.error("COMPLAINTS FETCH ERROR:", err);
        setError("Failed to load active verified cases.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadComplaints();
    return () => {
      mounted = false;
    };
  }, [navigate, refreshTrigger]);

  const selectedComplaint = complaints.find(
    (c) => String(c.id) === String(complaintId) || String(c.complaint_id) === String(complaintId)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!complaintId) {
      setError("Please select a target case from the docket.");
      return;
    }

    if (!actionType) {
      setError("Please select a statutory enforcement action.");
      return;
    }

    if (!remarks.trim()) {
      setError("Please provide official rationale and directives.");
      return;
    }

    const user = JSON.parse(localStorage.getItem("user") || "{}");

    try {
      setSubmitting(true);
      setSubmitted(false);
      setError("");

      const response = await authFetch(
        `${getApiUrl()}/authority/complaints/${complaintId}/action`,
        {
          method: "POST",
          body: JSON.stringify({
            authority_name: user.name || "Authorized Food Safety Officer",
            action_type: actionType,
            remarks: remarks.trim(),
            inspection_required: inspectionRequired,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to record statutory action.");
      }

      setSubmitted(true);
      setActionType("");
      setRemarks("");
      setRefreshTrigger((p) => p + 1);
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to transmit enforcement directive.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-layout">
      <AuthoritySidebar />

      <main className="admin-main">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Statutory Enforcement Directives</h1>
            <p className="page-subtitle">
              Issue binding statutory orders, schedule mandatory facility audits, and levy penalties under the Food Safety Act.
            </p>
          </div>

          <button
            className="btn btn-secondary"
            onClick={() => setRefreshTrigger((p) => p + 1)}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? "spin-animation" : ""} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Feedback Banners */}
        {submitted && (
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
            <span>Official enforcement order successfully recorded and served into regulatory database.</span>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "var(--space-3) var(--space-4)",
              background: "var(--color-error-bg)",
              border: "1px solid var(--color-error-border)",
              color: "var(--color-error)",
              borderRadius: "var(--radius-md)",
              marginBottom: "var(--space-5)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "var(--font-size-sm)",
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* 2-Column Action Desk */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr)",
            gap: "var(--space-6)",
            alignItems: "start",
          }}
        >
          {/* Left Column: Action Form */}
          <div className="card" style={{ padding: "var(--space-6)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "var(--space-4)" }}>
              <Gavel size={20} color="var(--color-primary)" />
              <h3 style={{ margin: 0, fontSize: "var(--font-size-lg)" }}>
                Issue Enforcement Directive
              </h3>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">
                  Target Docket Case <span style={{ color: "var(--color-error)" }}>*</span>
                </label>
                <select
                  className="form-control"
                  value={complaintId}
                  onChange={(e) => setComplaintId(e.target.value)}
                  disabled={loading || submitting}
                  required
                >
                  <option value="">Select Verified Grievance</option>
                  {complaints.map((c) => {
                    const vendorLabel = c.seller_listing_type === 'UNLISTED' || !c.shop_id
                      ? `[Unlisted] ${c.reported_shop_name || c.seller_type || 'Unknown Seller'}`
                      : (c.shop?.shop_name || c.shop_name || "Vendor");
                    return (
                      <option key={c.id} value={c.id}>
                        #{c.complaint_id || c.id} — {c.product_name || c.food_product || "Product"} ({vendorLabel})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Statutory Order Classification <span style={{ color: "var(--color-error)" }}>*</span>
                </label>
                <select
                  className="form-control"
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  disabled={submitting}
                  required
                >
                  <option value="">Select Action Order</option>
                  <option value="INSPECTION_SCHEDULED">On-Site Food Safety Inspection Scheduled</option>
                  <option value="SAMPLE_COLLECTED">Formal Seizure of Legal Samples for Lab Verification</option>
                  <option value="NOTICE_ISSUED">Section 32 Statutory Improvement Notice Issued</option>
                  <option value="FINE_IMPOSED">Compounding Fine / Financial Penalty Levied</option>
                  <option value="SHOP_SEALED">Emergency Prohibition Order / Establishment Sealed</option>
                  <option value="CASE_CLOSED">Compliance Certified / Grievance Concluded</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Mandatory Physical Site Audit</label>
                <select
                  className="form-control"
                  value={inspectionRequired}
                  onChange={(e) => setInspectionRequired(e.target.value)}
                  disabled={submitting}
                >
                  <option value="YES">Yes — Field inspection team dispatch required</option>
                  <option value="NO">No — Administrative review only</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Regulatory Directives & Legal Grounds <span style={{ color: "var(--color-error)" }}>*</span>
                </label>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="Detail statutory sections cited, compliance deadlines, penalty sums, or sample batch identifiers..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center", padding: "12px" }}
                disabled={submitting || loading || complaints.length === 0}
              >
                {submitting ? (
                  <>
                    <div className="spinner" style={{ width: "16px", height: "16px" }} />
                    <span>Transmitting Official Order...</span>
                  </>
                ) : (
                  <>
                    <Scale size={16} />
                    <span>Serve & Enforce Statutory Directive</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Selected Case Preview */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div className="card" style={{ padding: "var(--space-6)" }}>
              <h3 style={{ margin: "0 0 14px", fontSize: "var(--font-size-md)" }}>
                Selected Case Dossier
              </h3>

              {selectedComplaint ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "var(--font-size-sm)" }}>
                  <div>
                    <span style={{ color: "var(--color-muted)", fontSize: "11px", display: "block" }}>
                      CASE NUMBER
                    </span>
                    <strong style={{ fontFamily: "monospace", color: "var(--color-primary-dark)" }}>
                      #{selectedComplaint.complaint_id || selectedComplaint.id}
                    </strong>
                  </div>

                  <div>
                    <span style={{ color: "var(--color-muted)", fontSize: "11px", display: "block" }}>
                      COMMODITY & CATEGORY
                    </span>
                    <div style={{ fontWeight: "600", color: "var(--color-heading)" }}>
                      {selectedComplaint.product_name || selectedComplaint.food_product || "Food Product"}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--color-secondary)" }}>
                      {selectedComplaint.category || "Violation"}
                    </div>
                  </div>

                  <div>
                    <span style={{ color: "var(--color-muted)", fontSize: "11px", display: "block" }}>
                      ESTABLISHMENT / OPERATOR
                    </span>
                    <div>
                      {selectedComplaint.seller_listing_type === "UNLISTED" || !selectedComplaint.shop_id ? (
                        <div>
                          <span style={{ display: "inline-block", background: "#fef3c7", color: "#92400e", fontSize: "11px", fontWeight: 700, padding: "2px 6px", borderRadius: 4, marginRight: 6 }}>
                            UNLISTED SELLER
                          </span>
                          <strong>{selectedComplaint.reported_shop_name || "Unknown Seller"}</strong>
                          <div style={{ fontSize: "11px", color: "var(--color-muted)", marginTop: 2 }}>
                            {selectedComplaint.seller_type || "Vendor"} • {selectedComplaint.reported_landmark || selectedComplaint.location || "Location on record"}
                          </div>
                        </div>
                      ) : (
                        selectedComplaint.shop?.shop_name || selectedComplaint.shop_name || "Registered Vendor"
                      )}
                    </div>
                  </div>

                  <div>
                    <span style={{ color: "var(--color-muted)", fontSize: "11px", display: "block" }}>
                      INCIDENT NARRATIVE
                    </span>
                    <div
                      style={{
                        padding: "8px 10px",
                        background: "var(--color-surface-2)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "12px",
                        color: "var(--color-body)",
                        lineHeight: "1.5",
                      }}
                    >
                      {selectedComplaint.description || "No narrative supplied."}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: "var(--space-4)", textAlign: "center", color: "var(--color-muted)" }}>
                  <p style={{ margin: 0, fontSize: "var(--font-size-sm)" }}>
                    Select a case from the dropdown to preview grievance parameters.
                  </p>
                </div>
              )}
            </div>

            <div
              className="card"
              style={{
                padding: "var(--space-5)",
                background: "var(--color-surface)",
                borderLeft: "4px solid var(--color-primary)",
              }}
            >
              <h4 style={{ margin: "0 0 6px", fontSize: "var(--font-size-sm)", color: "var(--color-heading)" }}>
                Enforcement Authority
              </h4>
              <p style={{ margin: 0, fontSize: "var(--font-size-xs)", color: "var(--color-secondary)", lineHeight: "1.5" }}>
                Directives issued via this portal are legally binding under the Food Safety and Standards Act. Notices served are simultaneously dispatched to the registered business operator.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AuthorityActions;