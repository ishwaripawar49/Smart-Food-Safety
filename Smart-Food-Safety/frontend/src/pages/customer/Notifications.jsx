import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  FileText,
  RefreshCw,
  Search,
  ExternalLink,
} from "lucide-react";
import CustomerSidebar from "../../components/CustomerSidebar";
import { authFetch, getApiUrl } from "../../services/authService";

function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL"); // ALL, UNREAD
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = async () => {
    try {
      setRefreshing(true);
      const response = await authFetch(`${getApiUrl()}/notifications/customer`);
      if (!response) return;

      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Failed to load notifications.");
        return;
      }

      if (data.success) {
        setNotifications(data.notifications || []);
        setError("");
      }
    } catch (err) {
      console.error("CUSTOMER NOTIFICATIONS ERROR:", err);
      setError("Cannot connect to notification server.");
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
      const response = await authFetch(
        `${getApiUrl()}/notifications/${id}/read`,
        { method: "PUT" }
      );
      if (!response) return;

      const data = await response.json();
      if (data.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
      }
    } catch (error) {
      console.error("ERROR MARKING NOTIFICATION AS READ:", error);
    }
  };

  const markAllAsRead = async () => {
    const unreadList = notifications.filter((n) => !n.is_read);
    for (const item of unreadList) {
      await markAsRead(item.id);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "UNREAD") return !n.is_read;
    return true;
  });

  const getNotificationIcon = (n) => {
    const type = (n.notification_type || "").toUpperCase();
    const title = (n.title || "").toLowerCase();

    if (type === "VERIFIED" || title.includes("verified")) {
      return {
        icon: CheckCircle2,
        bg: "var(--color-success-bg)",
        color: "var(--color-success)",
      };
    }
    if (type === "STATUS_UPDATE" || title.includes("status")) {
      return {
        icon: Info,
        bg: "var(--color-info-bg)",
        color: "var(--color-info)",
      };
    }
    if (type === "HIGH_RISK" || type === "CRITICAL" || title.includes("action") || title.includes("warning")) {
      return {
        icon: AlertTriangle,
        bg: "var(--color-warning-bg)",
        color: "var(--color-warning)",
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
      <CustomerSidebar notificationCount={unreadCount} />

      <main className="admin-main">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Citizen Notification Feed</h1>
            <p className="page-subtitle">
              Live updates regarding your filed food safety complaints, official verifications, and regulatory actions.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              className="btn btn-secondary"
              onClick={loadNotifications}
              disabled={refreshing}
            >
              <RefreshCw
                size={16}
                className={refreshing ? "spin-animation" : ""}
              />
              <span>Refresh</span>
            </button>

            {unreadCount > 0 && (
              <button className="btn btn-outline" onClick={markAllAsRead}>
                <CheckCheck size={16} />
                <span>Mark All Read</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter bar */}
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
                  filter === "ALL"
                    ? "var(--color-primary)"
                    : "var(--color-surface-2)",
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
                  filter === "UNREAD"
                    ? "var(--color-primary)"
                    : "var(--color-surface-2)",
                color: filter === "UNREAD" ? "#fff" : "var(--color-body)",
                fontWeight: "600",
                fontSize: "var(--font-size-sm)",
                cursor: "pointer",
              }}
            >
              Unread ({unreadCount})
            </button>
          </div>

          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-muted)" }}>
            Showing {filteredNotifications.length} items
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div
            style={{
              padding: "var(--space-4)",
              background: "var(--color-error-bg)",
              border: "1px solid var(--color-error-border)",
              color: "var(--color-error)",
              borderRadius: "var(--radius-md)",
              marginBottom: "var(--space-4)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="card" style={{ padding: "var(--space-10)", textAlign: "center" }}>
            <div className="spinner" style={{ margin: "0 auto 16px" }} />
            <p style={{ color: "var(--color-secondary)", margin: 0 }}>
              Retrieving citizen notifications...
            </p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Bell size={32} />
            </div>
            <h3>No Notifications Found</h3>
            <p>
              {filter === "UNREAD"
                ? "You have caught up with all your food safety alerts!"
                : "You will receive updates whenever authorities review or take action on your reports."}
            </p>
            <Link to="/customer-dashboard" className="btn btn-outline">
              Back to Dashboard
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {filteredNotifications.map((item) => {
              const iconMeta = getNotificationIcon(item);
              const IconComp = iconMeta.icon;
              const formattedDate = item.created_at
                ? new Date(item.created_at).toLocaleString()
                : "Recent";

              return (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "var(--space-4)",
                    background: item.is_read
                      ? "var(--color-surface)"
                      : "var(--color-surface)",
                    padding: "var(--space-4) var(--space-5)",
                    borderRadius: "var(--radius-lg)",
                    border: `1px solid ${
                      item.is_read
                        ? "var(--color-border)"
                        : "var(--color-primary-light)"
                    }`,
                    boxShadow: item.is_read ? "var(--shadow-xs)" : "var(--shadow-sm)",
                    position: "relative",
                  }}
                >
                  {/* Left Icon */}
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "var(--radius-md)",
                      background: iconMeta.bg,
                      color: iconMeta.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <IconComp size={20} />
                  </div>

                  {/* Body */}
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
                          fontWeight: item.is_read ? "600" : "700",
                          color: "var(--color-heading)",
                        }}
                      >
                        {item.title || "Food Safety Notification"}
                      </h4>
                      {!item.is_read && (
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
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: "16px",
                        fontSize: "var(--font-size-xs)",
                        color: "var(--color-muted)",
                      }}
                    >
                      <span>{formattedDate}</span>

                      {item.complaint_id && (
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <FileText size={12} />
                          Case #{item.complaint_id}
                        </span>
                      )}

                      {item.complaint_id && (
                        <button
                          onClick={() =>
                            navigate("/track-complaint", {
                              state: { complaintId: item.complaint_id },
                            })
                          }
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
                          <span>Track Record</span>
                          <ExternalLink size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Mark as read button */}
                  {!item.is_read && (
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

export default Notifications;