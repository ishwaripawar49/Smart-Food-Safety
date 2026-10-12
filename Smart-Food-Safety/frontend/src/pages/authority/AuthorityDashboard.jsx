import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileCheck,
  Search,
  ClipboardCheck,
  BarChart3,
  ShieldAlert,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Bell,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { getApiUrl, authFetch } from "../../services/authService";
import AuthoritySidebar from "../../components/AuthoritySidebar";

// ===================================================
// STATUS BADGE HELPER
// ===================================================

function getStatusClass(status) {
  const s = String(status || "").toLowerCase();
  if (s === "verified")           return "badge-verified";
  if (s.includes("investigation")) return "badge-investigation";
  if (s === "resolved")           return "badge-resolved";
  if (s === "rejected")           return "badge-rejected";
  return "badge-submitted";
}

function StatusBadge({ status }) {
  return (
    <span className={`badge ${getStatusClass(status)}`}>
      {String(status || "UNKNOWN").replace(/_/g, " ")}
    </span>
  );
}

function getRiskClass(risk) {
  if (risk === "CRITICAL") return "badge-risk-critical";
  if (risk === "HIGH")     return "badge-risk-high";
  if (risk === "MEDIUM")   return "badge-risk-medium";
  return "badge-risk-low";
}

// ===================================================
// AUTHORITY DASHBOARD
// ===================================================

function AuthorityDashboard() {
  const navigate = useNavigate();

  const [priorityCases, setPriorityCases] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    const token    = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) { navigate("/login"); return; }

    try {
      const user = JSON.parse(userData);
      if (user.role !== "AUTHORIZED_AUTHORITY") {
        alert("Access denied. Authorized Authority access required.");
        navigate("/");
        return;
      }

      // Fetch cases
      authFetch(`${getApiUrl()}/authority/complaints`)
        .then((r) => {
          if (!r.ok) throw new Error("Failed to fetch authority complaints.");
          return r.json();
        })
        .then((data) => {
          const complaints = Array.isArray(data) ? data : (data.complaints || data.data || []);
          const formatted  = complaints.map((c) => ({
            id:       c.complaint_id,
            category: c.category,
            product:  c.product_name || "N/A",
            risk:     Number(c.risk_score) >= 75 ? "CRITICAL" :
                      Number(c.risk_score) >= 50 ? "HIGH" :
                      Number(c.risk_score) >= 30 ? "MEDIUM" : "LOW",
            riskScore: Number(c.risk_score || 0),
            status:   c.status,
            rawId:    c.id,
          }));
          setPriorityCases(formatted);
          setLoading(false);
        })
        .catch(() => setLoading(false));

      // Fetch notifications
      authFetch(`${getApiUrl()}/notifications/authority`)
        .then((r) => r.json())
        .then((data) => {
          const notifs = data.notifications || data.data || [];
          setUnreadNotifications(notifs.filter(n => !n.is_read).length);
        })
        .catch(() => {});

    } catch {
      localStorage.clear();
      navigate("/login");
    }
  }, [navigate]);

  // Stats
  const verifiedCount     = priorityCases.filter(c => c.status === "VERIFIED").length;
  const investigationCount = priorityCases.filter(c => c.status === "UNDER_INVESTIGATION" || c.status === "INVESTIGATION").length;
  const highRiskCount     = priorityCases.filter(c => c.risk === "HIGH" || c.risk === "CRITICAL").length;
  const resolvedCount     = priorityCases.filter(c => c.status === "RESOLVED").length;

  const statCards = [
    { label: "Verified Complaints", value: verifiedCount,     icon: FileCheck,     color: "#F0FDF4", iconColor: "var(--color-primary)" },
    { label: "Under Investigation",  value: investigationCount, icon: Search,        color: "#EFF6FF", iconColor: "#2563EB" },
    { label: "High Risk Cases",      value: highRiskCount,    icon: ShieldAlert,   color: "#FEF2F2", iconColor: "#DC2626" },
    { label: "Resolved",            value: resolvedCount,    icon: CheckCircle,   color: "#DCFCE7", iconColor: "#16A34A" },
  ];

  if (loading) {
    return (
      <div className="page-loading">
        <div className="page-loading-card animate-fade-in">
          <div className="spinner" style={{ margin: "0 auto 20px" }} />
          <h3>Loading Dashboard</h3>
          <p>Fetching your assigned cases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-layout">

      <AuthoritySidebar notificationCount={unreadNotifications} />

      <div className="admin-dashboard-main">

        {/* Topbar */}
        <header className="admin-dashboard-topbar">
          <div className="admin-topbar-left">
            <h1>Authority Dashboard</h1>
            <p>FSSAI Authorized Officer Portal</p>
          </div>
          <div className="admin-topbar-right">
            <button
              className="topbar-icon-btn"
              onClick={() => navigate("/authority/notifications")}
              title="Notifications"
            >
              <Bell size={16} />
              {unreadNotifications > 0 && (
                <span className="topbar-badge">
                  {unreadNotifications > 99 ? "99+" : unreadNotifications}
                </span>
              )}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate("/")}>
              ← Home
            </button>
          </div>
        </header>

        <div className="admin-dashboard-content">

          {/* Page Header */}
          <div className="page-header animate-fade-in-up">
            <div className="page-header-eyebrow">Authority Portal</div>
            <h1>Welcome back, Officer 👋</h1>
            <p>Review verified complaints, manage investigations, and take regulatory actions.</p>
          </div>

          {/* KPI Cards */}
          <div className="stat-cards-grid animate-fade-in-up">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="stat-card">
                  <div className="stat-card-icon" style={{ background: card.color }}>
                    <Icon size={20} color={card.iconColor} />
                  </div>
                  <div className="stat-card-value">{card.value}</div>
                  <div className="stat-card-label">{card.label}</div>
                  <div className="stat-card-trend up">
                    <TrendingUp size={11} />
                    From all assigned cases
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cases Table + Quick Actions Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "var(--space-6)" }}>

            {/* Priority Cases */}
            <div className="table-container animate-fade-in-up">
              <div className="table-header">
                <div>
                  <h3>Priority Cases</h3>
                  <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-secondary)", marginTop: "2px" }}>
                    Verified complaints assigned to your jurisdiction
                  </p>
                </div>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => navigate("/authority/verified-complaints")}
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
                      <th>Risk</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priorityCases.length === 0 ? (
                      <tr>
                        <td colSpan={6}>
                          <div className="empty-state" style={{ padding: "48px 20px" }}>
                            <div className="empty-state-icon">
                              <FileCheck size={28} color="var(--color-muted)" />
                            </div>
                            <h3>No assigned cases</h3>
                            <p>Verified complaints will appear here once assigned.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      priorityCases.slice(0, 8).map((c) => (
                        <tr key={c.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/authority/complaint/${c.rawId || c.id}`)}>
                          <td className="col-id">{c.id}</td>
                          <td className="col-primary">{c.product}</td>
                          <td className="col-muted">{c.category}</td>
                          <td><span className={`badge ${getRiskClass(c.risk)}`}>{c.risk}</span></td>
                          <td><StatusBadge status={c.status} /></td>
                          <td>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={(e) => { e.stopPropagation(); navigate(`/authority/complaint/${c.rawId || c.id}`); }}
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Navigation */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              <div className="table-container animate-fade-in-up">
                <div className="table-header">
                  <h3>Quick Access</h3>
                </div>
                <div style={{ padding: "var(--space-4)" }}>
                  {[
                    { label: "Verified Complaints", desc: "Review assigned cases", path: "/authority/verified-complaints", icon: FileCheck, color: "#F0FDF4", ic: "var(--color-primary)" },
                    { label: "Investigations",       desc: "Active investigations",  path: "/authority/investigations",       icon: Search,     color: "#EFF6FF", ic: "#2563EB" },
                    { label: "Authority Actions",    desc: "Take regulatory action", path: "/authority/actions",              icon: ClipboardCheck, color: "#FEF2F2", ic: "#DC2626" },
                    { label: "Reports",             desc: "Analytics & insights",   path: "/authority/reports",              icon: BarChart3,  color: "#FAF5FF", ic: "#7C3AED" },
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
                          padding: "10px var(--space-3)",
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
                        <div style={{ width: 36, height: 36, background: action.color, borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Icon size={16} color={action.ic} />
                        </div>
                        <div>
                          <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-heading)" }}>{action.label}</div>
                          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-secondary)" }}>{action.desc}</div>
                        </div>
                        <ArrowRight size={13} color="var(--color-muted)" style={{ marginLeft: "auto" }} />
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

export default AuthorityDashboard;