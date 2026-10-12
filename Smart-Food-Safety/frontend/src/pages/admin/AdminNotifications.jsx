import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileText,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import AdminSidebar from "../../components/AdminSidebar";
import { authFetch, getApiUrl } from "../../services/authService";

function AdminNotifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL"); // ALL, UNREAD, HIGH_RISK
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = async () => {
    try {
      setRefreshing(true);
      const response = await authFetch(`${getApiUrl()}/notifications/admin`);
      if (!response) return;

      if (!response.ok) {
        throw new Error(`Failed to load notifications (Status: ${response.status})`);
      }

      const data = await response.json();
      if (data.success) {
        setNotifications(
          (data.notifications || []).map((n) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            type: n.notification_type || "SYSTEM",
            complaintId: n.complaint_id,
            time: n.created_at ? new Date(n.created_at).toLocaleString() : "Recent",
            unread: !n.is_read,
          }))
        );
      }
    } catch (err) {
      console.error("ADMIN NOTIFICATIONS ERROR:", err);
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

      if (!response) return;
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
      );
    } catch (err) {
      console.error("MARK AS READ ERROR:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await authFetch(`${getApiUrl()}/notifications/admin/read-all`, {
        method: "PUT",
      });

      if (!response) return;
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    } catch (err) {
      console.error("MARK ALL AS READ ERROR:", err);
    }
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  const filtered = notifications.filter((n) => {
    if (filter === "UNREAD") return n.unread;
    if (filter === "HIGH_RISK")
      return (
        n.type === "HIGH_RISK" ||
        n.type === "CRITICAL" ||
        (n.title && n.title.toLowerCase().includes("risk"))
      );
    return true;
  });

  const getIconMeta = (item) => {
    const type = (item.type || "").toUpperCase();
    if (type === "CRITICAL" || type === "HIGH_RISK") {
      return {
        icon: AlertTriangle,
        bg: "var(--color-error-bg)",
        color: "var(--color-error)",
      };
    }
    if (type === "VERIFIED") {
      return {
        icon: CheckCircle2,
        bg: "var(--color-success-bg)",
        color: "var(--color-success)",
      };
    }
    return {
      icon: Bell,
      bg: "var(--color-primary-light)",
      color: "var(--color-primary)",
    };
  };

  return (
    <div className="admin-layout">
      <AdminSidebar notificationCount={unreadCount} />

      <main className="admin-main">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Administrative Alert Feed</h1>
            <p className="page-subtitle">
              System notifications, urgent citizen grievance alerts, and regulatory verification triggers.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              className="btn btn-secondary"
              onClick={loadNotifications}
              disabled={refreshing}
            >
              <RefreshCw size={16} className={refreshing ? "spin-animation" : ""} />
              <span>Refresh Feed</span>
            </button>
            {unreadCount > 0 && (
              <button className="btn btn-outline" onClick={markAllAsRead}>
                <CheckCheck size={16} />
                <span>Mark All Read</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "var(--space-5)",
            background: "var(--color-surface)",
            padding: "var(--space-3) var(--space-4)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--color-border)",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setFilter("ALL")}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-md)",
                border: "none",
                background:
                  filter === "ALL" ? "var(--color-primary)" : "var(--color-surface-2)",
                color: filter === "ALL" ? "#fff" : "var(--color-body)",
                fontWeight: "600",
                fontSize: "var(--font-size-sm)",
                cursor: "pointer",
              }}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter("UNREAD")}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-md)",
                border: "none",
                background:
                  filter === "UNREAD" ? "var(--color-primary)" : "var(--color-surface-2)",
                color: filter === "UNREAD" ? "#fff" : "var(--color-body)",
                fontWeight: "600",
                fontSize: "var(--font-size-sm)",
                cursor: "pointer",
              }}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter("HIGH_RISK")}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-md)",
                border: "none",
                background:
                  filter === "HIGH_RISK" ? "var(--color-primary)" : "var(--color-surface-2)",
                color: filter === "HIGH_RISK" ? "#fff" : "var(--color-body)",
                fontWeight: "600",
                fontSize: "var(--font-size-sm)",
                cursor: "pointer",
              }}
            >
              High-Risk / Urgent
            </button>
          </div>

          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-muted)" }}>
            Showing {filtered.length} alerts
          </span>
        </div>

        {/* Content */}
        {loading ? (
          <div className="card" style={{ padding: "var(--space-10)", textAlign: "center" }}>
            <div className="spinner" style={{ margin: "0 auto 16px" }} />
            <p style={{ color: "var(--color-secondary)", margin: 0 }}>
              Retrieving administrator alerts...
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Bell size={32} />
            </div>
            <h3>No Alerts Found</h3>
            <p>
              {filter === "UNREAD"
                ? "You have marked all active administrative notifications as read."
                : "No notifications matching your filter criteria are logged."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {filtered.map((item) => {
              const meta = getIconMeta(item);
              const IconComp = meta.icon;

              return (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "var(--space-4)",
                    background: "var(--color-surface)",
                    padding: "var(--space-4) var(--space-5)",
                    borderRadius: "var(--radius-lg)",
                    border: `1px solid ${
                      item.unread ? "var(--color-primary-light)" : "var(--color-border)"
                    }`,
                    boxShadow: item.unread ? "var(--shadow-sm)" : "var(--shadow-xs)",
                  }}
                >
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "var(--radius-md)",
                      background: meta.bg,
                      color: meta.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <IconComp size={20} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "4px",
                      }}
                    >
                      <h4
                        style={{
                          margin: 0,
                          fontSize: "var(--font-size-base)",
                          fontWeight: item.unread ? "700" : "600",
                          color: "var(--color-heading)",
                        }}
                      >
                        {item.title}
                      </h4>
                      {item.unread && (
                        <span
                          style={{
                            background: "var(--color-primary-light)",
                            color: "var(--color-primary)",
                            fontSize: "11px",
                            fontWeight: "700",
                            padding: "2px 8px",
                            borderRadius: "var(--radius-full)",
                          }}
                        >
                          NEW
                        </span>
                      )}
                    </div>

                    <p
                      style={{
                        margin: "0 0 10px",
                        color: "var(--color-body)",
                        fontSize: "var(--font-size-sm)",
                        lineHeight: "1.5",
                      }}
                    >
                      {item.message}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        fontSize: "var(--font-size-xs)",
                        color: "var(--color-muted)",
                      }}
                    >
                      <span>{item.time}</span>
                      {item.complaintId && (
                        <button
                          onClick={() => navigate(`/admin/complaints/${item.complaintId}`)}
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            color: "var(--color-primary)",
                            cursor: "pointer",
                            fontWeight: "600",
                            display: "flex",
                            alignItems: "center",
                            gap: "3px",
                          }}
                        >
                          <span>Review Case #{item.complaintId}</span>
                          <ExternalLink size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {item.unread && (
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => markAsRead(item.id)}
                      title="Mark as read"
                    >
                      <CheckCheck size={16} />
                      <span className="hide-on-mobile">Read</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminNotifications;