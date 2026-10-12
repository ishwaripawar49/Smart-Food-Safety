import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Check,
  RefreshCw,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Inbox,
  Flame,
} from "lucide-react";
import AuthoritySidebar from "../../components/AuthoritySidebar";
import { getApiUrl, authFetch } from "../../services/authService";

function AuthorityNotifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [filterTab, setFilterTab] = useState("ALL"); // ALL | UNREAD | HIGH_PRIORITY | ACTION_REQUIRED

  const loadNotifications = async () => {
    try {
      setRefreshing(true);
      setError("");

      const token = localStorage.getItem("token");
      const userString = localStorage.getItem("user");

      if (!token || !userString) {
        navigate("/login");
        return;
      }

      let user;
      try {
        user = JSON.parse(userString);
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }

      if (user.role !== "AUTHORIZED_AUTHORITY") {
        navigate("/");
        return;
      }

      const response = await authFetch(`${getApiUrl()}/notifications/authority`);
      if (!response) return;

      if (response.status === 401 || response.status === 403) {
        navigate("/login");
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch authority notifications.");
      }

      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
    } catch (err) {
      console.error("NOTIFICATION ERROR:", err);
      setError(err.message || "Unable to load alerts.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markAsRead = async (id) => {
    try {
      const response = await authFetch(`${getApiUrl()}/notifications/${id}/read`, {
        method: "PUT",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to mark alert as read.");
      }

      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_read: true } : item))
      );
    } catch (err) {
      console.error("MARK READ ERROR:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await authFetch(`${getApiUrl()}/notifications/authority/read-all`, {
        method: "PUT",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to mark all notifications as read.");
      }

      setNotifications((prev) =>
        prev.map((item) => ({ ...item, is_read: true }))
      );
    } catch (err) {
      console.error("MARK ALL READ ERROR:", err);
    }
  };

  const formatTime = (dateValue) => {
    if (!dateValue) return "Recently";
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "Recently";
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getAlertDesign = (item) => {
    const text = `${item.title || ""} ${item.notification_type || ""} ${item.message || ""}`.toUpperCase();

    if (text.includes("CRITICAL") || text.includes("HIGH") || text.includes("RISK")) {
      return {
        icon: Flame,
        color: "#EF4444",
        bg: "rgba(239, 68, 68, 0.12)",
        border: "rgba(239, 68, 68, 0.25)",
        badge: "CRITICAL ALERT",
      };
    }
    if (text.includes("ACTION") || text.includes("REQUIRE")) {
      return {
        icon: Clock,
        color: "#F59E0B",
        bg: "rgba(245, 158, 11, 0.12)",
        border: "rgba(245, 158, 11, 0.25)",
        badge: "ACTION REQUIRED",
      };
    }
    if (text.includes("VERIFIED") || text.includes("RESOLVED")) {
      return {
        icon: CheckCircle2,
        color: "#10B981",
        bg: "rgba(16, 185, 129, 0.12)",
        border: "rgba(16, 185, 129, 0.25)",
        badge: "COMPLIANCE UPDATE",
      };
    }
    return {
      icon: Bell,
      color: "var(--color-primary)",
      bg: "var(--color-primary-subtle)",
      border: "var(--color-primary-border)",
      badge: "DISPATCH NOTICE",
    };
  };

  // Counts
  const totalCount = notifications.length;
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const highPriorityCount = notifications.filter((item) => {
    const t = `${item.title || ""} ${item.notification_type || ""}`.toUpperCase();
    return t.includes("HIGH") || t.includes("CRITICAL") || t.includes("RISK");
  }).length;

  const actionRequiredCount = notifications.filter((item) => {
    const t = `${item.title || ""} ${item.notification_type || ""}`.toUpperCase();
    return t.includes("ACTION");
  }).length;

  const filteredList = useMemo(() => {
    return notifications.filter((item) => {
      if (filterTab === "UNREAD") return !item.is_read;
      if (filterTab === "HIGH_PRIORITY") {
        const t = `${item.title || ""} ${item.notification_type || ""}`.toUpperCase();
        return t.includes("HIGH") || t.includes("CRITICAL") || t.includes("RISK");
      }
      if (filterTab === "ACTION_REQUIRED") {
        const t = `${item.title || ""} ${item.notification_type || ""}`.toUpperCase();
        return t.includes("ACTION");
      }
      return true;
    });
  }, [notifications, filterTab]);

  return (
    <div className="admin-layout">
      <AuthoritySidebar />

      <main className="admin-main">
        {/* HEADER */}
        <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", color: "var(--color-text-muted)", marginBottom: "0.25rem" }}>
              <span>FSSAI Authority Portal</span>
              <span>/</span>
              <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>Official Alerts</span>
            </div>
            <h1 style={{ fontSize: "1.625rem", fontWeight: 700, color: "var(--color-text)", margin: 0, display: "flex", alignItems: "center", gap: "0.625rem" }}>
              <Bell style={{ color: "var(--color-primary)" }} size={26} />
              Authority Dispatch & Alerts
            </h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              onClick={loadNotifications}
              disabled={refreshing}
              className="btn btn-secondary"
              style={{ padding: "0.5rem 0.875rem", fontSize: "0.875rem" }}
            >
              <RefreshCw size={15} className={refreshing ? "spin-icon" : ""} />
              {refreshing ? "Checking..." : "Refresh"}
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="btn btn-primary"
                style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
              >
                <Check size={15} />
                Mark All as Read ({unreadCount})
              </button>
            )}
          </div>
        </div>

        {/* METRICS STRIP */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          <div className="card" style={{ padding: "1.125rem", display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: 42, height: 42, borderRadius: "var(--radius-md)", background: "rgba(239, 68, 68, 0.12)", color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Flame size={20} />
            </div>
            <div>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Critical Risks</span>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#EF4444" }}>{highPriorityCount}</div>
            </div>
          </div>

          <div className="card" style={{ padding: "1.125rem", display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: 42, height: 42, borderRadius: "var(--radius-md)", background: "rgba(245, 158, 11, 0.12)", color: "#F59E0B", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Clock size={20} />
            </div>
            <div>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Action Required</span>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-text)" }}>{actionRequiredCount}</div>
            </div>
          </div>

          <div className="card" style={{ padding: "1.125rem", display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: 42, height: 42, borderRadius: "var(--radius-md)", background: "rgba(16, 185, 129, 0.12)", color: "#10B981", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bell size={20} />
            </div>
            <div>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Unread Alerts</span>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-text)" }}>{unreadCount}</div>
            </div>
          </div>

          <div className="card" style={{ padding: "1.125rem", display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: 42, height: 42, borderRadius: "var(--radius-md)", background: "var(--color-bg-secondary)", color: "var(--color-text-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Inbox size={20} />
            </div>
            <div>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Total In Registry</span>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-text)" }}>{totalCount}</div>
            </div>
          </div>
        </div>

        {/* FILTER TABS */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
          {[
            { id: "ALL", label: `All Alerts (${totalCount})` },
            { id: "UNREAD", label: `Unread (${unreadCount})` },
            { id: "HIGH_PRIORITY", label: `High Risk (${highPriorityCount})` },
            { id: "ACTION_REQUIRED", label: `Action Required (${actionRequiredCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "var(--radius-full)",
                fontSize: "0.8125rem",
                fontWeight: 600,
                border: filterTab === tab.id ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
                background: filterTab === tab.id ? "var(--color-primary)" : "var(--color-card)",
                color: filterTab === tab.id ? "#ffffff" : "var(--color-text-muted)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* NOTIFICATIONS LIST */}
        <div className="card" style={{ padding: "0.5rem", overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-muted)" }}>
              <RefreshCw size={24} className="spin-icon" style={{ margin: "0 auto 0.75rem auto" }} />
              <p style={{ margin: 0, fontSize: "0.875rem" }}>Loading dispatch notifications...</p>
            </div>
          ) : error ? (
            <div style={{ padding: "2.5rem", textAlign: "center", color: "var(--color-danger)" }}>
              <AlertTriangle size={32} style={{ margin: "0 auto 0.75rem auto" }} />
              <p style={{ margin: 0 }}>{error}</p>
            </div>
          ) : filteredList.length === 0 ? (
            <div style={{ padding: "3.5rem 1.5rem", textAlign: "center", color: "var(--color-text-muted)" }}>
              <Inbox size={40} style={{ margin: "0 auto 1rem auto", opacity: 0.35 }} />
              <h4 style={{ margin: "0 0 0.35rem 0", color: "var(--color-text)" }}>No notifications found</h4>
              <p style={{ fontSize: "0.875rem", margin: 0 }}>There are no alerts matching your current filter selection.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {filteredList.map((item) => {
                const design = getAlertDesign(item);
                const IconComponent = design.icon;

                return (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "1rem",
                      padding: "1.125rem 1.25rem",
                      borderRadius: "var(--radius-md)",
                      background: item.is_read ? "var(--color-card)" : "rgba(21, 128, 61, 0.04)",
                      border: item.is_read ? "1px solid var(--color-border)" : "1px solid rgba(21, 128, 61, 0.25)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: "var(--radius-md)",
                        background: design.bg,
                        color: design.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: "2px",
                      }}
                    >
                      <IconComponent size={20} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                          <span
                            style={{
                              fontSize: "0.6875rem",
                              fontWeight: 700,
                              padding: "0.15rem 0.5rem",
                              borderRadius: "var(--radius-sm)",
                              background: design.bg,
                              color: design.color,
                              border: `1px solid ${design.border}`,
                              letterSpacing: "0.03em",
                            }}
                          >
                            {design.badge}
                          </span>
                          <h4 style={{ margin: 0, fontSize: "0.9375rem", fontWeight: 600, color: "var(--color-text)" }}>
                            {item.title || "Authority Notification"}
                          </h4>
                          {item.complaint_id && (
                            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-primary)" }}>
                              (Case #{item.complaint_id})
                            </span>
                          )}
                        </div>

                        <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                          {formatTime(item.created_at)}
                        </span>
                      </div>

                      <p style={{ margin: "0 0 0.75rem 0", fontSize: "0.84375rem", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
                        {item.message}
                      </p>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                        {item.complaint_id && (
                          <button
                            onClick={() => {
                              if (!item.is_read) markAsRead(item.id);
                              navigate(`/authority/complaint/${item.complaint_id}`);
                            }}
                            className="btn btn-secondary"
                            style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem", gap: "0.3rem" }}
                          >
                            View Case File
                            <ArrowRight size={13} />
                          </button>
                        )}

                        {!item.is_read ? (
                          <button
                            onClick={() => markAsRead(item.id)}
                            className="btn btn-ghost"
                            style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem", gap: "0.3rem" }}
                          >
                            <Check size={13} />
                            Mark as Read
                          </button>
                        ) : (
                          <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                            <Check size={12} />
                            Acknowledged
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default AuthorityNotifications;