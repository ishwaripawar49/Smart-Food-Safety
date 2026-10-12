import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  Search,
  Filter,
  RefreshCw,
  Eye,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Building2,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import AuthoritySidebar from "../../components/AuthoritySidebar";
import { getApiUrl, authFetch } from "../../services/authService";

function AuthorityCases() {
  const navigate = useNavigate();

  const [cases, setCases] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadCases = async () => {
    try {
      setRefreshing(true);
      const response = await authFetch(`${getApiUrl()}/authority/cases`);
      if (!response) return;

      if (response.status === 401 || response.status === 403) {
        navigate("/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Unable to load authority cases.");
      }

      const data = await response.json();
      const list = data.cases || data.complaints || data.data || [];
      setCases(Array.isArray(list) ? list : []);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Authority cases could not be loaded. Please ensure the backend is running.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, []);

  const getStatus = (item) => {
    return (item.investigation_status || item.status || "VERIFIED").toString().toUpperCase();
  };

  const getRiskLevel = (item) => {
    if (item.risk_level) return item.risk_level.toString().toUpperCase();
    const score = Number(item.risk_score || 0);
    if (score >= 75) return "CRITICAL";
    if (score >= 50) return "HIGH";
    if (score >= 30) return "MEDIUM";
    return "LOW";
  };

  const filteredCases = useMemo(() => {
    return cases.filter((item) => {
      const complaintId = (item.complaint_id || item.id || "").toString().toLowerCase();
      const category = (item.category || "").toString().toLowerCase();
      const product = (item.product_name || item.product || "").toString().toLowerCase();
      const q = search.toLowerCase();
      const shop = (
        item.seller_listing_type === "UNLISTED" || !item.shop_id
          ? `${item.reported_shop_name || "Unknown Seller"} ${item.seller_type || ""} ${item.reported_landmark || ""}`
          : (item.shop?.shop_name || item.shop_name || "")
      ).toString().toLowerCase();

      const matchesSearch =
        !q ||
        complaintId.includes(q) ||
        category.includes(q) ||
        product.includes(q) ||
        shop.includes(q);

      const status = getStatus(item);
      const risk = getRiskLevel(item);

      const matchesStatus = statusFilter === "ALL" || status === statusFilter;
      const matchesRisk = riskFilter === "ALL" || risk === riskFilter;

      return matchesSearch && matchesStatus && matchesRisk;
    });
  }, [cases, search, statusFilter, riskFilter]);

  const totalCases = cases.length;
  const criticalCases = cases.filter((c) => getRiskLevel(c) === "CRITICAL").length;
  const inProgressCases = cases.filter((c) => {
    const s = getStatus(c);
    return s === "UNDER_INVESTIGATION" || s === "INVESTIGATION" || s === "ASSIGNED" || s === "ACTION_REQUIRED";
  }).length;
  const resolvedCases = cases.filter((c) => getStatus(c) === "RESOLVED").length;

  const handleViewCase = (item) => {
    const cid = item.complaint_id || item.id;
    if (cid) navigate(`/authority/investigation/${cid}`);
  };

  return (
    <div className="admin-layout">
      <AuthoritySidebar />

      <main className="admin-main">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Officer Case Docket</h1>
            <p className="page-subtitle">
              Comprehensive registry of verified complaints assigned for statutory investigation and enforcement.
            </p>
          </div>

          <button
            className="btn btn-secondary"
            onClick={loadCases}
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? "spin-animation" : ""} />
            <span>Refresh</span>
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "var(--space-3) var(--space-4)",
              background: "var(--color-error-bg)",
              border: "1px solid var(--color-error-border)",
              color: "var(--color-error)",
              borderRadius: "var(--radius-md)",
              marginBottom: "var(--space-5)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            {error}
          </div>
        )}

        {/* KPI Strip */}
        <div className="kpi-grid" style={{ marginBottom: "var(--space-6)" }}>
          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-title">Assigned Cases</span>
              <div className="kpi-icon primary">
                <Briefcase size={20} />
              </div>
            </div>
            <div className="kpi-value">{totalCases}</div>
            <div className="kpi-footer">Total officer docket records</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-title">Critical Risk</span>
              <div className="kpi-icon error">
                <AlertTriangle size={20} />
              </div>
            </div>
            <div className="kpi-value">{criticalCases}</div>
            <div className="kpi-footer" style={{ color: "var(--color-error)" }}>
              High hazard inspection required
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-title">Active In-Progress</span>
              <div className="kpi-icon warning">
                <Clock size={20} />
              </div>
            </div>
            <div className="kpi-value">{inProgressCases}</div>
            <div className="kpi-footer">Under active regulatory review</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-title">Concluded & Enforced</span>
              <div className="kpi-icon success">
                <CheckCircle2 size={20} />
              </div>
            </div>
            <div className="kpi-value">{resolvedCases}</div>
            <div className="kpi-footer">Compliance verified and closed</div>
          </div>
        </div>

        {/* Filters */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "var(--space-4)",
            marginBottom: "var(--space-5)",
            background: "var(--color-surface)",
            padding: "var(--space-4)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--color-border)",
            flexWrap: "wrap",
          }}
        >
          <div style={{ position: "relative", flex: 1, minWidth: "260px" }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--color-muted)",
              }}
            />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: "36px" }}
              placeholder="Search by case number, product, or establishment..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <select
              className="form-control"
              style={{ width: "auto" }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Phases</option>
              <option value="VERIFIED">Verified</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="UNDER_INVESTIGATION">Under Investigation</option>
              <option value="ACTION_REQUIRED">Action Required</option>
              <option value="ACTION_TAKEN">Action Taken</option>
              <option value="RESOLVED">Resolved</option>
            </select>

            <select
              className="form-control"
              style={{ width: "auto" }}
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
            >
              <option value="ALL">All Risk Tiers</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        {/* Table Card */}
        <div className="table-card">
          <div className="table-card-header">
            <div>
              <h2 className="table-card-title">Case Docket</h2>
              <span className="table-card-sub">
                Showing {filteredCases.length} of {totalCases} assigned cases
              </span>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: "var(--space-10)", textAlign: "center" }}>
              <div className="spinner" style={{ margin: "0 auto 16px" }} />
              <p style={{ color: "var(--color-secondary)", margin: 0 }}>
                Loading assigned case files...
              </p>
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Briefcase size={32} />
              </div>
              <h3>No Cases Found</h3>
              <p>No verified complaint cases match your selected filter criteria.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Docket ID</th>
                    <th>Commodity / Allegation</th>
                    <th>Establishment</th>
                    <th>Risk Tier</th>
                    <th>Regulatory Phase</th>
                    <th>Intake Date</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCases.map((item, index) => {
                    const cid = item.complaint_id || item.id || `CASE-${index + 1}`;
                    const risk = getRiskLevel(item);
                    const status = getStatus(item);

                    return (
                      <tr key={cid}>
                        <td>
                          <strong
                            style={{
                              fontFamily: "monospace",
                              color: "var(--color-primary-dark)",
                              display: "block",
                            }}
                          >
                            #{cid}
                          </strong>
                        </td>
                        <td>
                          <div>
                            <strong style={{ color: "var(--color-heading)", display: "block" }}>
                              {item.product_name || item.product || "Food Product"}
                            </strong>
                            <span style={{ fontSize: "12px", color: "var(--color-muted)" }}>
                              {item.category || "Violation"}
                            </span>
                          </div>
                        </td>
                        <td style={{ color: "var(--color-secondary)", fontSize: "var(--font-size-sm)" }}>
                          {item.seller_listing_type === "UNLISTED" || !item.shop_id ? (
                            <div>
                              <strong style={{ color: "var(--color-heading)", display: "block" }}>
                                {item.reported_shop_name || "Unknown Seller"}
                              </strong>
                              <span style={{ fontSize: "11px", color: "#2563EB" }}>
                                {item.seller_type || "Unlisted Vendor"}
                              </span>
                            </div>
                          ) : (
                            item.shop?.shop_name || item.shop_name || "Registered Vendor"
                          )}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              risk === "CRITICAL" || risk === "HIGH"
                                ? "badge-rejected"
                                : risk === "MEDIUM"
                                ? "badge-review"
                                : "badge-resolved"
                            }`}
                          >
                            {risk}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              status === "RESOLVED"
                                ? "badge-resolved"
                                : status.includes("ACTION")
                                ? "badge-review"
                                : "badge-investigation"
                            }`}
                          >
                            {status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td style={{ color: "var(--color-secondary)", fontSize: "var(--font-size-sm)" }}>
                          {item.created_at ? new Date(item.created_at).toLocaleDateString() : "—"}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleViewCase(item)}
                          >
                            <Eye size={14} />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default AuthorityCases;