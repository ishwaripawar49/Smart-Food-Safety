import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FileText,
  Clock,
  CheckCircle2,
  Bell,
  ArrowRight,
  ShieldCheck,
  Search,
  Microscope,
  FilePlus2,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import CustomerSidebar from "../../components/CustomerSidebar";
import {
  getToken,
  getCurrentUser,
  logout,
  authFetch,
  getApiUrl,
} from "../../services/authService";

function getStatusBadge(status) {
  const s = String(status || "").toLowerCase().replace(/_/g, "-");
  if (s.includes("submitted") || s.includes("pending")) {
    return { class: "badge-submitted", label: "Submitted" };
  }
  if (s.includes("review")) {
    return { class: "badge-review", label: "Under Review" };
  }
  if (s.includes("verified")) {
    return { class: "badge-verified", label: "Verified" };
  }
  if (s.includes("investigation")) {
    return { class: "badge-investigation", label: "Under Investigation" };
  }
  if (s.includes("resolved")) {
    return { class: "badge-resolved", label: "Resolved" };
  }
  if (s.includes("rejected")) {
    return { class: "badge-rejected", label: "Rejected" };
  }
  return { class: "badge-submitted", label: status || "Submitted" };
}

function CustomerDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);

  const fetchComplaints = async () => {
    try {
      const response = await authFetch(`${getApiUrl()}/complaints/my`);
      if (!response || !response.ok) return;

      const data = await response.json();
      const list = data.complaints || data.data || [];
      setComplaints(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error("CUSTOMER COMPLAINT FETCH ERROR:", error);
    }
  };

  const fetchNotificationCount = async () => {
    try {
      const response = await authFetch(`${getApiUrl()}/notifications/customer`);
      if (!response || !response.ok) return;

      const data = await response.json();
      const notifications = data.notifications || data.data || [];
      if (Array.isArray(notifications)) {
        const unread = notifications.filter(
          (n) => n.is_read === false || n.is_read === 0
        ).length;
        setNotificationCount(unread);
      }
    } catch (error) {
      console.error("CUSTOMER NOTIFICATION FETCH ERROR:", error);
    }
  };

  const loadData = async () => {
    setRefreshing(true);
    await Promise.all([fetchComplaints(), fetchNotificationCount()]);
    setRefreshing(false);
  };

  useEffect(() => {
    let mounted = true;

    const verify = async () => {
      const token = getToken();
      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        const currentUser = await getCurrentUser();
        if (!mounted) return;

        if (!currentUser) {
          logout();
          navigate("/login", { replace: true });
          return;
        }

        if (currentUser.role !== "CUSTOMER") {
          navigate("/unauthorized", { replace: true });
          return;
        }

        setUser(currentUser);
        await Promise.all([fetchComplaints(), fetchNotificationCount()]);
      } catch (err) {
        console.error("CUSTOMER SESSION ERROR:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    verify();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  // Periodic notification polling
  useEffect(() => {
    const interval = setInterval(fetchNotificationCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Stats
  const totalComplaints = complaints.length;
  const underReviewCount = complaints.filter((c) => {
    const s = String(c.status || "").toUpperCase();
    return (
      s === "SUBMITTED" ||
      s === "UNDER_REVIEW" ||
      s === "VERIFIED" ||
      s === "INVESTIGATION"
    );
  }).length;
  const resolvedCount = complaints.filter(
    (c) => String(c.status || "").toUpperCase() === "RESOLVED"
  ).length;

  const displayName = user?.name || user?.email?.split("@")[0] || "Citizen";

  if (loading) {
    return (
      <div className="page-loading">
        <div className="page-loading-card animate-fade-in">
          <div className="spinner" style={{ margin: "0 auto 20px" }} />
          <h3>Citizen Workspace</h3>
          <p>Loading your food safety dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <CustomerSidebar notificationCount={notificationCount} />

      <main className="admin-main">
        {/* Top Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Citizen Safety Dashboard</h1>
            <p className="page-subtitle">
              Welcome back, <strong>{displayName}</strong>. Track your submitted complaints and access official food safety testing.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              className="btn btn-secondary"
              onClick={loadData}
              disabled={refreshing}
            >
              <RefreshCw
                size={16}
                className={refreshing ? "spin-animation" : ""}
              />
              <span>Refresh</span>
            </button>

            <Link to="/submit-complaint" className="btn btn-primary">
              <FilePlus2 size={16} />
              <span>File New Complaint</span>
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-title">Total Grievances</span>
              <div className="kpi-icon primary">
                <FileText size={20} />
              </div>
            </div>
            <div className="kpi-value">{totalComplaints}</div>
            <div className="kpi-footer">Submitted by your account</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-title">Active / In Progress</span>
              <div className="kpi-icon warning">
                <Clock size={20} />
              </div>
            </div>
            <div className="kpi-value">{underReviewCount}</div>
            <div className="kpi-footer">Under official evaluation</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-title">Resolved Cases</span>
              <div className="kpi-icon success">
                <CheckCircle2 size={20} />
              </div>
            </div>
            <div className="kpi-value">{resolvedCount}</div>
            <div className="kpi-footer">Successfully closed</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-title">Unread Alerts</span>
              <div className="kpi-icon info">
                <Bell size={20} />
              </div>
            </div>
            <div className="kpi-value">{notificationCount}</div>
            <div className="kpi-footer">
              <Link
                to="/notifications"
                style={{
                  color: "var(--color-primary)",
                  fontWeight: "600",
                  textDecoration: "none",
                }}
              >
                View Notifications &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Citizen Services Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "var(--space-4)",
            marginBottom: "var(--space-6)",
          }}
        >
          <div className="card" style={{ padding: "var(--space-5)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
                marginBottom: "var(--space-3)",
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-primary-light)",
                  color: "var(--color-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FilePlus2 size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "var(--font-size-lg)" }}>
                  File Food Complaint
                </h3>
                <span style={{ fontSize: "12px", color: "var(--color-secondary)" }}>
                  Official Grievance Registry
                </span>
              </div>
            </div>
            <p
              style={{
                color: "var(--color-secondary)",
                fontSize: "var(--font-size-sm)",
                lineHeight: "1.5",
                marginBottom: "var(--space-4)",
              }}
            >
              Report contamination, expired packaged items, adulterated goods, or unsanitary restaurant hygiene directly to food safety regulators.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <Link
                to="/easy-complaint"
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center", background: "#16a34a", borderColor: "#15803d" }}
              >
                <span>FoodSafe Easy (सोपी पद्धत / आसान तरीका)</span>
                <ArrowRight size={15} />
              </Link>
              <Link
                to="/submit-complaint"
                className="btn btn-outline"
                style={{ width: "100%", justifyContent: "center" }}
              >
                <span>Standard Detailed Form</span>
              </Link>
            </div>
          </div>

          <div className="card" style={{ padding: "var(--space-5)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
                marginBottom: "var(--space-3)",
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-info-bg)",
                  color: "var(--color-info)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Search size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "var(--font-size-lg)" }}>
                  Track Grievance Status
                </h3>
                <span style={{ fontSize: "12px", color: "var(--color-secondary)" }}>
                  Real-time Lifecycle Timeline
                </span>
              </div>
            </div>
            <p
              style={{
                color: "var(--color-secondary)",
                fontSize: "var(--font-size-sm)",
                lineHeight: "1.5",
                marginBottom: "var(--space-4)",
              }}
            >
              Enter your tracking identifier to inspect the live audit log, officer assignment, verified findings, and regulatory decisions.
            </p>
            <Link
              to="/track-complaint"
              className="btn btn-outline"
              style={{ width: "100%", justifyContent: "center" }}
            >
              <span>Live Status Tracker</span>
              <ArrowRight size={15} />
            </Link>
          </div>

          <div className="card" style={{ padding: "var(--space-5)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
                marginBottom: "var(--space-3)",
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "var(--radius-md)",
                  background: "#FEF3C7",
                  color: "#B45309",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Microscope size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "var(--font-size-lg)" }}>
                  FSSAI DART Rapid Screening
                </h3>
                <span style={{ fontSize: "12px", color: "var(--color-secondary)" }}>
                  200+ Food Commodity Tests
                </span>
              </div>
            </div>
            <p
              style={{
                color: "var(--color-secondary)",
                fontSize: "var(--font-size-sm)",
                lineHeight: "1.5",
                marginBottom: "var(--space-4)",
              }}
            >
              Conduct immediate home screening tests for milk, edible oils, spices, grains, and sweets using statutory FSSAI test guidelines.
            </p>
            <Link
              to="/adulteration-detection"
              className="btn btn-outline"
              style={{ width: "100%", justifyContent: "center" }}
            >
              <span>Launch AI Screening Desk</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        {/* Complaints Table Section */}
        <div className="table-card">
          <div className="table-card-header">
            <div>
              <h2 className="table-card-title">My Submitted Grievances</h2>
              <span className="table-card-sub">
                Official records associated with your citizen account
              </span>
            </div>

            {complaints.length > 0 && (
              <Link to="/track-complaint" className="btn btn-sm btn-ghost">
                <span>Detailed Tracker</span>
                <ExternalLink size={14} />
              </Link>
            )}
          </div>

          {complaints.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <FileText size={32} />
              </div>
              <h3>No Complaints Submitted Yet</h3>
              <p>
                Have you experienced food adulteration, stale ingredients, or substandard restaurant hygiene? Report it to help maintain food safety standards.
              </p>
              <Link to="/submit-complaint" className="btn btn-primary">
                <FilePlus2 size={16} />
                <span>File Your First Report</span>
              </Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tracking ID</th>
                    <th>Category</th>
                    <th>Product / Shop</th>
                    <th>Date Filed</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map((item) => {
                    const trackingId =
                      item.complaint_id || `CMP-${item.id}`;
                    const badgeInfo = getStatusBadge(item.status);
                    const productName =
                      item.food_product || item.product_name || "Food Product";
                    const isUnlisted = item.seller_listing_type === "UNLISTED" || !item.shop_id;
                    const sellerName = isUnlisted
                      ? (item.reported_shop_name || "Unknown Seller")
                      : (item.shop?.shop_name || item.shop_name || "Registered Establishment");
                    const sellerSubtitle = isUnlisted
                      ? `${item.seller_type || "Roadside Seller"}${item.reported_landmark ? ` • ${item.reported_landmark}` : ""}`
                      : (item.shop?.city || item.location || "Listed");
                    const dateFormatted = item.incident_date
                      ? new Date(item.incident_date).toLocaleDateString()
                      : item.created_at
                      ? new Date(item.created_at).toLocaleDateString()
                      : "Recent";

                    return (
                      <tr key={item.id || trackingId}>
                        <td>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontWeight: "700",
                              color: "var(--color-primary-dark)",
                            }}
                          >
                            {trackingId}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: "500" }}>
                            {item.category || "Food Safety"}
                          </span>
                        </td>
                        <td>
                          <div>
                            <div style={{ fontWeight: "600", color: "var(--color-heading)" }}>
                              {productName}
                            </div>
                            <div style={{ fontSize: "12px", color: isUnlisted ? "#2563EB" : "var(--color-muted)" }}>
                              {sellerName} <span style={{ color: "var(--color-muted)" }}>({sellerSubtitle})</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ color: "var(--color-secondary)", fontSize: "var(--font-size-sm)" }}>
                          {dateFormatted}
                        </td>
                        <td>
                          <span className={`badge ${badgeInfo.class}`}>
                            {badgeInfo.label}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() =>
                              navigate("/track-complaint", {
                                state: { complaintId: trackingId },
                              })
                            }
                          >
                            <span>Inspect</span>
                            <ArrowRight size={14} />
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

        {/* Regulatory Protection Notice */}
        <div
          style={{
            marginTop: "var(--space-6)",
            padding: "var(--space-5)",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-4)",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "var(--radius-md)",
              background: "var(--color-primary-light)",
              color: "var(--color-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={28} />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: "0 0 4px", color: "var(--color-heading)" }}>
              Statutory Consumer Grievance Protection
            </h4>
            <p
              style={{
                margin: 0,
                color: "var(--color-secondary)",
                fontSize: "var(--font-size-sm)",
                lineHeight: "1.5",
              }}
            >
              Every grievance filed on FoodSafe AI is immutably timestamped and routed to the designated administrative authority under Food Safety and Standards Regulations. Whistleblower details remain strictly protected.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default CustomerDashboard;