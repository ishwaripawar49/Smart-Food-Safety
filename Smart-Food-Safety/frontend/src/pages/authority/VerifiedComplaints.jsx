import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileCheck,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldAlert,
  Building2,
  Eye,
  CheckCircle2,
} from "lucide-react";
import AuthoritySidebar from "../../components/AuthoritySidebar";
import { getApiUrl, authFetch } from "../../services/authService";

function VerifiedComplaints() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchVerifiedComplaints = async () => {
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

      const response = await authFetch(`${getApiUrl()}/authority/complaints`);
      if (!response) return;

      if (response.status === 401 || response.status === 403) {
        navigate("/login");
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to load verified complaints.");
      }

      const list = data.complaints || data.data || [];
      setComplaints(Array.isArray(list) ? list : []);
      setError("");
    } catch (err) {
      console.error("VERIFIED COMPLAINTS ERROR:", err);
      setError(err.message || "Failed to connect to authority server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVerifiedComplaints();
  }, []);

  const normalizedComplaints = useMemo(() => {
    return complaints.map((item) => {
      const displayId = item.complaint_id || `CMP-${item.id}`;
      const displayCategory = item.category || "General Food Safety";
      const displayProduct = item.product_name || item.food_product || "Food Product";
      const displayShop =
        item.seller_listing_type === "UNLISTED" || !item.shop_id
          ? `${item.reported_shop_name || "Unknown Seller"} (${item.seller_type || "Unlisted Vendor"})`
          : (item.shop?.shop_name || item.shop_name || (item.shop_id ? `Shop #${item.shop_id}` : "Registered Vendor"));

      const rawRisk = String(item.risk_level || "").toUpperCase();
      let displayRisk = "LOW";
      if (rawRisk.includes("CRITICAL")) displayRisk = "CRITICAL";
      else if (rawRisk.includes("HIGH")) displayRisk = "HIGH";
      else if (rawRisk.includes("MEDIUM")) displayRisk = "MEDIUM";

      const rawStatus = String(item.status || "").toUpperCase();
      let displayStatus = "VERIFIED";
      if (rawStatus.includes("INVESTIGATION")) displayStatus = "UNDER INVESTIGATION";
      else if (rawStatus.includes("ACTION")) displayStatus = "ACTION REQUIRED";
      else if (rawStatus.includes("RESOLVED")) displayStatus = "RESOLVED";

      return {
        ...item,
        displayId,
        displayCategory,
        displayProduct,
        displayShop,
        displayRisk,
        displayStatus,
      };
    });
  }, [complaints]);

  const filteredComplaints = useMemo(() => {
    const q = search.trim().toLowerCase();
    return normalizedComplaints.filter((item) => {
      const matchesSearch =
        !q ||
        item.displayId.toLowerCase().includes(q) ||
        item.displayCategory.toLowerCase().includes(q) ||
        item.displayProduct.toLowerCase().includes(q) ||
        item.displayShop.toLowerCase().includes(q);

      const matchesRisk = riskFilter === "ALL" || item.displayRisk === riskFilter;
      const matchesStatus = statusFilter === "ALL" || item.displayStatus === statusFilter;

      return matchesSearch && matchesRisk && matchesStatus;
    });
  }, [normalizedComplaints, search, riskFilter, statusFilter]);

  // Counts
  const verifiedCount = normalizedComplaints.length;
  const criticalCount = normalizedComplaints.filter((c) => c.displayRisk === "CRITICAL").length;
  const investigationCount = normalizedComplaints.filter((c) => c.displayStatus === "UNDER INVESTIGATION").length;
  const actionRequiredCount = normalizedComplaints.filter((c) => c.displayStatus === "ACTION REQUIRED").length;

  const getRiskBadge = (risk) => {
    if (risk === "CRITICAL") return "badge-rejected";
    if (risk === "HIGH") return "badge-rejected";
    if (risk === "MEDIUM") return "badge-review";
    return "badge-resolved";
  };

  const getStatusBadge = (status) => {
    if (status === "UNDER INVESTIGATION") return "badge-investigation";
    if (status === "ACTION REQUIRED") return "badge-review";
    if (status === "RESOLVED") return "badge-resolved";
    return "badge-verified";
  };

  return (
    <div className="admin-layout">
      <AuthoritySidebar />

      <main className="admin-main">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Verified Complaints Queue</h1>
            <p className="page-subtitle">
              Complaints verified and escalated by administrators for official regulatory review and statutory action.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              className="btn btn-secondary"
              onClick={fetchVerifiedComplaints}
              disabled={refreshing}
            >
              <RefreshCw size={16} className={refreshing ? "spin-animation" : ""} />
              <span>Refresh</span>
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
            }}
          >
            {error}
          </div>
        )}

        {/* KPI Strip */}
        <div className="kpi-grid" style={{ marginBottom: "var(--space-6)" }}>
          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-title">Verified In Queue</span>
              <div className="kpi-icon primary">
                <FileCheck size={20} />
              </div>
            </div>
            <div className="kpi-value">{verifiedCount}</div>
            <div className="kpi-footer">Referred by administration</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-title">Critical Severity</span>
              <div className="kpi-icon error">
                <AlertTriangle size={20} />
              </div>
            </div>
            <div className="kpi-value">{criticalCount}</div>
            <div className="kpi-footer" style={{ color: "var(--color-error)" }}>
              Requires immediate inspection
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-title">Under Investigation</span>
              <div className="kpi-icon warning">
                <Clock size={20} />
              </div>
            </div>
            <div className="kpi-value">{investigationCount}</div>
            <div className="kpi-footer">Active officer audits</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-title">Action Required</span>
              <div className="kpi-icon info">
                <ShieldAlert size={20} />
              </div>
            </div>
            <div className="kpi-value">{actionRequiredCount}</div>
            <div className="kpi-footer">Awaiting statutory order</div>
          </div>
        </div>

        {/* Filter Controls */}
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
              placeholder="Search by ID, commodity, category, or food business..."
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
              <option value="ALL">All Risk Levels</option>
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
              <option value="ALL">All Statuses</option>
              <option value="VERIFIED">Verified</option>
              <option value="UNDER INVESTIGATION">Under Investigation</option>
              <option value="ACTION REQUIRED">Action Required</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
        </div>

        {/* Table Card */}
        <div className="table-card">
          <div className="table-card-header">
            <div>
              <h2 className="table-card-title">Escalated Docket Cases</h2>
              <span className="table-card-sub">
                Showing {filteredComplaints.length} of {verifiedCount} verified complaints
              </span>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: "var(--space-10)", textAlign: "center" }}>
              <div className="spinner" style={{ margin: "0 auto 16px" }} />
              <p style={{ color: "var(--color-secondary)", margin: 0 }}>
                Retrieving verified case records...
              </p>
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <FileCheck size={32} />
              </div>
              <h3>No Verified Complaints In Queue</h3>
              <p>No cases currently meet your filter criteria or require authority intervention.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Case Docket</th>
                    <th>Commodity / Product</th>
                    <th>Establishment</th>
                    <th>Risk Rating</th>
                    <th>Regulatory Status</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComplaints.map((item) => (
                    <tr key={item.id || item.displayId}>
                      <td>
                        <div>
                          <strong
                            style={{
                              fontFamily: "monospace",
                              color: "var(--color-primary-dark)",
                              display: "block",
                            }}
                          >
                            {item.displayId}
                          </strong>
                          <span style={{ fontSize: "12px", color: "var(--color-muted)" }}>
                            {item.displayCategory}
                          </span>
                        </div>
                      </td>
                      <td>
                        <strong style={{ color: "var(--color-heading)" }}>
                          {item.displayProduct}
                        </strong>
                      </td>
                      <td style={{ color: "var(--color-secondary)", fontSize: "var(--font-size-sm)" }}>
                        {item.displayShop}
                      </td>
                      <td>
                        <span className={`badge ${getRiskBadge(item.displayRisk)}`}>
                          {item.displayRisk}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadge(item.displayStatus)}`}>
                          {item.displayStatus}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => navigate(`/authority/complaint/${item.id}`)}
                        >
                          <span>Review Case</span>
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

export default VerifiedComplaints;