import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  Store,
  AlertTriangle,
  CheckCircle,
  Bell,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  Users,
  BarChart2,
  ShieldAlert,
} from "lucide-react";
import { getApiUrl, authFetch } from "../../services/authService";
import AdminSidebar from "../../components/AdminSidebar";

// ===================================================
// HELPERS
// ===================================================

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

function StatusBadge({ status }) {
  return (
    <span className={`badge ${getStatusClass(status)}`}>
      {String(status || "UNKNOWN").replace(/_/g, " ")}
    </span>
  );
}

// ===================================================
// ADMIN DASHBOARD
// ===================================================

function AdminDashboard() {
  const navigate = useNavigate();

  const [statistics, setStatistics] = useState({
    totalComplaints: 0,
    pendingComplaints: 0,
    resolvedComplaints: 0,
    totalShops: 0,
    totalUsers: 0,
  });

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // -- Auth guard --
  useEffect(() => {
    const token    = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (!token || !userData) { navigate("/login"); return; }
    try {
      const user = JSON.parse(userData);
      if (user.role !== "ADMIN") { navigate("/"); }
    } catch {
      localStorage.clear();
      navigate("/login");
    }
  }, [navigate]);

  // -- Fetch stats --
  const fetchStatistics = async () => {
    try {
      const res  = await authFetch(`${getApiUrl()}/admin/statistics`);
      const data = await res.json();
      if (data.success) setStatistics(data.statistics);
    } catch (err) {
      setError("Cannot connect to backend. Please ensure the server is running.");
    }
  };

  // -- Fetch recent complaints --
  const fetchComplaints = async () => {
    try {
      const res  = await authFetch(`${getApiUrl()}/admin/complaints`);
      const data = await res.json();
      if (data.success) {
        setComplaints(Array.isArray(data.complaints) ? data.complaints.slice(0, 6) : []);
      }
    } catch {}
  };

  const loadDashboard = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    await Promise.all([fetchStatistics(), fetchComplaints()]);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { loadDashboard(); }, []);

  const highRiskCases = complaints.filter(c => Number(c.risk_score || 0) >= 61).length;

  // Stat card definitions
  const statCards = [
    {
      label: "Total Complaints",
      value: statistics.totalComplaints,
      icon: ClipboardList,
      color: "#EFF6FF",
      iconColor: "#2563EB",
      trend: "All submitted complaints",
    },
    {
      label: "Pending Review",
      value: statistics.pendingComplaints,
      icon: AlertTriangle,
      color: "#FFFBEB",
      iconColor: "#D97706",
      trend: "Requires attention",
    },
    {
      label: "High Risk Cases",
      value: highRiskCases,
      icon: ShieldAlert,
      color: "#FEF2F2",
      iconColor: "#DC2626",
      trend: "Risk score ≥ 61",
    },
    {
      label: "Resolved Cases",
      value: statistics.resolvedComplaints,
      icon: CheckCircle,
      color: "#F0FDF4",
      iconColor: "#16A34A",
      trend: "Successfully closed",
    },
    {
      label: "Registered Shops",
      value: statistics.totalShops,
      icon: Store,
      color: "#FAF5FF",
      iconColor: "#7C3AED",
      trend: "Active food establishments",
    },
    {
      label: "Registered Users",
      value: statistics.totalUsers,
      icon: Users,
      color: "#F0FDF4",
      iconColor: "#059669",
      trend: "Customer accounts",
    },
  ];

  // -- Loading state --
  if (loading) {
    return (
      <div className="page-loading">
        <div className="page-loading-card animate-fade-in">
          <div className="spinner" style={{ margin: "0 auto 20px" }} />
          <h3>Loading Dashboard</h3>
          <p>Fetching your data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-layout">

      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <div className="admin-dashboard-main">

        {/* Topbar */}
        <header className="admin-dashboard-topbar">
          <div className="admin-topbar-left">
            <h1>Admin Dashboard</h1>
            <p>Food Safety Complaint &amp; Monitoring Platform</p>
          </div>

          <div className="admin-topbar-right">
            <button
              className="topbar-icon-btn"
              onClick={() => loadDashboard(true)}
              title="Refresh dashboard"
            >
              <RefreshCw size={16} className={refreshing ? "spin" : ""} />
            </button>

            <button
              className="topbar-icon-btn"
              onClick={() => navigate("/admin-notifications")}
              title="View notifications"
            >
              <Bell size={16} />
              <span className="topbar-badge">3</span>
            </button>

            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate("/")}
            >
              ← Home
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="admin-dashboard-content">

          {/* Error */}
          {error && (
            <div className="alert alert-error" style={{ marginBottom: "var(--space-6)" }}>
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          {/* Page Header */}
          <div className="page-header">
            <div className="page-header-eyebrow">Overview</div>
            <h1>Good morning, Admin 👋</h1>
            <p>Here's what's happening with food safety complaints today.</p>
          </div>

          {/* KPI Cards */}
          <div className="stat-cards-grid animate-fade-in-up">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="stat-card">
                  <div
                    className="stat-card-icon"
                    style={{ background: card.color }}
                  >
                    <Icon size={20} color={card.iconColor} />
                  </div>
                  <div className="stat-card-value">{card.value}</div>
                  <div className="stat-card-label">{card.label}</div>
                  <div className="stat-card-trend up">
                    <TrendingUp size={11} />
                    {card.trend}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Main content grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "var(--space-6)" }}>

            {/* Recent Complaints Table */}
            <div className="table-container animate-fade-in-up">
              <div className="table-header">
                <div>
                  <h3>Recent Complaints</h3>
                  <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-secondary)", marginTop: "2px" }}>
                    Latest food safety submissions
                  </p>
                </div>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => navigate("/manage-complaints")}
                >
                  View All <ArrowRight size={13} />
                </button>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complaints.length === 0 ? (
                      <tr>
                        <td colSpan={5}>
                          <div className="empty-state" style={{ padding: "48px 20px" }}>
                            <div className="empty-state-icon">
                              <ClipboardList size={28} color="var(--color-muted)" />
                            </div>
                            <h3>No complaints yet</h3>
                            <p>Complaints will appear here once submitted.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      complaints.map((c) => {
                        const risk = Number(c.risk_score || 0);
                        let riskClass = "badge-risk-low";
                        if (risk >= 75) riskClass = "badge-risk-critical";
                        else if (risk >= 50) riskClass = "badge-risk-high";
                        else if (risk >= 25) riskClass = "badge-risk-medium";

                        return (
                          <tr
                            key={c.id || c.complaint_id}
                            style={{ cursor: "pointer" }}
                            onClick={() => navigate(`/admin/complaints/${c.id || c.complaint_id}`)}
                          >
                            <td className="col-id">{c.complaint_id}</td>
                            <td className="col-primary">{c.product_name || "N/A"}</td>
                            <td className="col-muted">{c.category || "N/A"}</td>
                            <td><StatusBadge status={c.status} /></td>
                            <td>
                              <span className={`badge ${riskClass}`}>{risk}</span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>

              <div className="table-container animate-fade-in-up">
                <div className="table-header">
                  <h3>Quick Actions</h3>
                </div>
                <div style={{ padding: "var(--space-4)" }}>
                  {[
                    { label: "Manage Complaints", desc: "Review & update status", path: "/manage-complaints", icon: ClipboardList, color: "#EFF6FF", ic: "#2563EB" },
                    { label: "Manage Food Shops", desc: "Add or update shops", path: "/manage-shops", icon: Store, color: "#FAF5FF", ic: "#7C3AED" },
                    { label: "View Reports", desc: "Analytics & insights", path: "/reports", icon: BarChart2, color: "#F0FDF4", ic: "#16A34A" },
                    { label: "Notifications", desc: "Admin alerts", path: "/admin-notifications", icon: Bell, color: "#FEF2F2", ic: "#DC2626" },
                  ].map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.path}
                        onClick={() => navigate(action.path)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--space-3)",
                          width: "100%",
                          padding: "12px var(--space-4)",
                          background: "transparent",
                          border: "none",
                          borderRadius: "var(--radius-md)",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "background 0.15s",
                          marginBottom: "4px",
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = "var(--color-bg)"}
                        onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        <div style={{
                          width: 38, height: 38,
                          background: action.color,
                          borderRadius: "var(--radius-md)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          <Icon size={17} color={action.ic} />
                        </div>
                        <div>
                          <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-heading)" }}>
                            {action.label}
                          </div>
                          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-secondary)" }}>
                            {action.desc}
                          </div>
                        </div>
                        <ArrowRight size={14} color="var(--color-muted)" style={{ marginLeft: "auto" }} />
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>

      <style>{`
        .spin { animation: spin 0.75s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 1024px) {
          .admin-dashboard-main { margin-left: 0 !important; }
          .admin-dashboard-content > div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

    </div>
  );
}

export default AdminDashboard;