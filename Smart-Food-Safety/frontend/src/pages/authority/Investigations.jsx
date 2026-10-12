import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building2,
  CheckCircle2,
  FileText,
} from "lucide-react";
import AuthoritySidebar from "../../components/AuthoritySidebar";
import ErrorBoundary from "../../components/ErrorBoundary";
import { getApiUrl, authFetch } from "../../services/authService";

function InvestigationsContent() {
  const navigate = useNavigate();

  const [investigations, setInvestigations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [refreshing, setRefreshing] = useState(false);

  const fetchInvestigations = async () => {
    try {
      setRefreshing(true);
      const userString = localStorage.getItem("user");
      if (!userString) {
        navigate("/login");
        return;
      }
      const user = JSON.parse(userString);
      if (user.role !== "AUTHORIZED_AUTHORITY") {
        navigate("/login");
        return;
      }

      const response = await authFetch(`${getApiUrl()}/authority/investigations`);
      if (!response) return;

      if (response.status === 401 || response.status === 403) {
        navigate("/login");
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to load investigations.");
      }

      const list = data.investigations || data.complaints || data.data || [];
      setInvestigations(Array.isArray(list) ? list : []);
      setError("");
    } catch (err) {
      console.error("INVESTIGATIONS ERROR:", err);
      setError(err.message || "Cannot connect to investigations server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInvestigations();
  }, []);

  const normalizedInvestigations = useMemo(() => {
    if (!Array.isArray(investigations)) return [];
    return investigations
      .map((item) => {
        if (!item) return null;
        const displayId = item.complaint_id || (item.id ? `INV-${item.id}` : "INV-UNKNOWN");
        const food = item.product_name || item.product || "Food Commodity";
        const category = item.category || "General Food Safety";
        const isUnlisted = item.seller_listing_type === "UNLISTED" || !item.shop_id;
        const shop = isUnlisted
          ? (item.reported_shop_name || item.seller_type || "Unlisted Food Seller")
          : (item.shop?.shop_name || item.shop_name || (item.shop_id ? `Shop #${item.shop_id}` : "Registered Establishment"));

        let risk = "MEDIUM";
        const rawRisk = String(item.risk_level || "").toUpperCase();
        if (rawRisk.includes("CRITICAL")) risk = "CRITICAL";
        else if (rawRisk.includes("HIGH")) risk = "HIGH";
        else if (rawRisk.includes("LOW")) risk = "LOW";
        else if (typeof item.risk_score === "number") {
          if (item.risk_score >= 75) risk = "CRITICAL";
          else if (item.risk_score >= 50) risk = "HIGH";
          else if (item.risk_score < 30) risk = "LOW";
        }

        let status = "UNDER INVESTIGATION";
        const rawStatus = String(item.status || "").toUpperCase();
        if (rawStatus.includes("ACTION_TAKEN") || rawStatus.includes("ACTION TAKEN")) status = "ACTION TAKEN";
        else if (rawStatus.includes("ACTION_REQUIRED") || rawStatus.includes("ACTION REQUIRED")) status = "ACTION REQUIRED";
        else if (rawStatus.includes("RESOLVED")) status = "RESOLVED";

        let progress = 50;
        if (status === "RESOLVED") progress = 100;
        else if (status === "ACTION TAKEN") progress = 85;
        else if (status === "ACTION REQUIRED") progress = 70;

        return {
          ...item,
          displayId,
          food,
          category,
          shop,
          isUnlisted,
          risk,
          status,
          progress,
        };
      })
      .filter(Boolean);
  }, [investigations]);

  const filtered = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    return normalizedInvestigations.filter((item) => {
      const matchesSearch =
        !q ||
        (item.displayId && item.displayId.toLowerCase().includes(q)) ||
        (item.food && item.food.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.shop && item.shop.toLowerCase().includes(q));

      const matchesRisk = riskFilter === "ALL" || item.risk === riskFilter;
      const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;

      return matchesSearch && matchesRisk && matchesStatus;
    });
  }, [normalizedInvestigations, search, riskFilter, statusFilter]);

  const totalActive = normalizedInvestigations.length;
  const criticalCases = normalizedInvestigations.filter((c) => c.risk === "CRITICAL").length;
  const actionRequired = normalizedInvestigations.filter((c) => c.status === "ACTION REQUIRED").length;
  const resolvedCount = normalizedInvestigations.filter((c) => c.status === "RESOLVED").length;

  return (
    <div className="admin-layout">
      <AuthoritySidebar />

      <main className="admin-main">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Active Investigations Registry</h1>
            <p className="page-subtitle">
              On-site inspections, laboratory testing logs, evidence audits, and official regulatory directives.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              className="btn btn-secondary"
              onClick={fetchInvestigations}
              disabled={refreshing}
            >
              <RefreshCw size={16} className={refreshing ? "spin-animation" : ""} />
              <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
          </div>
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
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
            <button
              className="btn btn-sm btn-outline"
              onClick={fetchInvestigations}
              disabled={refreshing}
              style={{ borderColor: "currentColor", color: "inherit", padding: "4px 10px" }}
            >
              <RefreshCw size={14} className={refreshing ? "spin-animation" : ""} />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* KPI Strip */}
        <div className="kpi-grid" style={{ marginBottom: "var(--space-6)" }}>
          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-title">Active Field Audits</span>
              <div className="kpi-icon primary">
                <Search size={20} />
              </div>
            </div>
            <div className="kpi-value">{totalActive}</div>
            <div className="kpi-footer">Ongoing regulatory investigations</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-title">Critical Hazards</span>
              <div className="kpi-icon error">
                <AlertTriangle size={20} />
              </div>
            </div>
            <div className="kpi-value">{criticalCases}</div>
            <div className="kpi-footer" style={{ color: "var(--color-error)" }}>
              High-priority public health alerts
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-title">Statutory Directives Needed</span>
              <div className="kpi-icon warning">
                <Clock size={20} />
              </div>
            </div>
            <div className="kpi-value">{actionRequired}</div>
            <div className="kpi-footer">Awaiting penalty or improvement order</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-title">Resolved Audits</span>
              <div className="kpi-icon success">
                <CheckCircle2 size={20} />
              </div>
            </div>
            <div className="kpi-value">{resolvedCount}</div>
            <div className="kpi-footer">Successfully enforced & closed</div>
          </div>
        </div>

        {/* Search & Filter Bar */}
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
              placeholder="Search by case identifier, commodity, or establishment..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <select
              className="form-control"
              style={{ width: "auto" }}
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
            >
              <option value="ALL">All Risk Ratings</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select
              className="form-control"
              style={{ width: "auto" }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Phases</option>
              <option value="UNDER INVESTIGATION">Under Investigation</option>
              <option value="ACTION REQUIRED">Action Required</option>
              <option value="ACTION TAKEN">Action Taken</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
        </div>

        {/* Table Card */}
        <div className="table-card">
          <div className="table-card-header">
            <div>
              <h2 className="table-card-title">Investigation Records</h2>
              <span className="table-card-sub">
                Showing {filtered.length} of {totalActive} active cases
              </span>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: "var(--space-10)", textAlign: "center" }}>
              <div className="spinner" style={{ margin: "0 auto 16px" }} />
              <p style={{ color: "var(--color-secondary)", margin: 0 }}>
                Retrieving active investigation records...
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Search size={32} />
              </div>
              {totalActive === 0 ? (
                <>
                  <h3>No Active Investigations</h3>
                  <p>No active investigations currently found in your jurisdiction.</p>
                </>
              ) : (
                <>
                  <h3>No Matching Investigations</h3>
                  <p>No investigation records match your current search and filter criteria.</p>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: "12px" }}
                    onClick={() => {
                      setSearch("");
                      setRiskFilter("ALL");
                      setStatusFilter("ALL");
                    }}
                  >
                    Clear Filters
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Case Identifier</th>
                    <th>Commodity / Allegation</th>
                    <th>Establishment</th>
                    <th>Audit Progress</th>
                    <th>Risk Tier</th>
                    <th>Current Phase</th>
                    <th style={{ textAlign: "right" }}>Audit Workspace</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id || item.displayId}>
                      <td>
                        <strong
                          style={{
                            fontFamily: "monospace",
                            color: "var(--color-primary-dark)",
                            display: "block",
                          }}
                        >
                          {item.displayId}
                        </strong>
                      </td>
                      <td>
                        <div>
                          <strong style={{ color: "var(--color-heading)", display: "block" }}>
                            {item.food}
                          </strong>
                          <span style={{ fontSize: "12px", color: "var(--color-muted)" }}>
                            {item.category}
                          </span>
                        </div>
                      </td>
                      <td style={{ color: "var(--color-secondary)", fontSize: "var(--font-size-sm)" }}>
                        {item.isUnlisted && (
                          <span style={{ display: "inline-block", background: "#fef3c7", color: "#92400e", fontSize: "10px", fontWeight: 700, padding: "1px 5px", borderRadius: 3, marginRight: 6 }}>
                            UNLISTED
                          </span>
                        )}
                        {item.shop}
                      </td>
                      <td style={{ minWidth: "120px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div
                            style={{
                              flex: 1,
                              height: "6px",
                              background: "var(--color-surface-2)",
                              borderRadius: "var(--radius-full)",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${item.progress}%`,
                                background: "var(--color-primary)",
                                borderRadius: "var(--radius-full)",
                              }}
                            />
                          </div>
                          <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--color-secondary)" }}>
                            {item.progress}%
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            item.risk === "CRITICAL" || item.risk === "HIGH"
                              ? "badge-rejected"
                              : item.risk === "MEDIUM"
                              ? "badge-review"
                              : "badge-resolved"
                          }`}
                        >
                          {item.risk}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            item.status === "RESOLVED"
                              ? "badge-resolved"
                              : item.status === "ACTION REQUIRED"
                              ? "badge-rejected"
                              : "badge-investigation"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => navigate(`/authority/investigation/${item.id}`)}
                        >
                          <span>Conduct Audit</span>
                          <ArrowRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Investigations() {
  return (
    <ErrorBoundary>
      <InvestigationsContent />
    </ErrorBoundary>
  );
}

export default Investigations;