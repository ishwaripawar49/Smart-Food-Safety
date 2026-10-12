import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  RefreshCw,
  ClipboardList,
  AlertTriangle,
  CheckCircle,
  Eye,
  X,
  Compass,
  Store,
} from "lucide-react";
import { getApiUrl, authFetch } from "../../services/authService";
import AdminSidebar from "../../components/AdminSidebar";

// ===================================================
// HELPERS
// ===================================================

function getStatusClass(status) {
  const s = String(status || "").toLowerCase();
  if (s === "submitted")   return "badge-submitted";
  if (s.includes("review")) return "badge-review";
  if (s === "verified")    return "badge-verified";
  if (s.includes("investigation")) return "badge-investigation";
  if (s === "resolved")    return "badge-resolved";
  if (s === "rejected")    return "badge-rejected";
  return "badge-submitted";
}

function StatusBadge({ status }) {
  return (
    <span className={`badge ${getStatusClass(status)}`}>
      {String(status || "UNKNOWN").replace(/_/g, " ")}
    </span>
  );
}

function getPriorityClass(priority) {
  const p = String(priority || "").toLowerCase();
  if (p === "critical") return "badge-priority-critical";
  if (p === "high")     return "badge-priority-high";
  if (p === "medium")   return "badge-priority-medium";
  return "badge-priority-low";
}

function PriorityBadge({ priority }) {
  return (
    <span className={`badge ${getPriorityClass(priority)}`}>
      {priority || "LOW"}
    </span>
  );
}

// ===================================================
// MANAGE COMPLAINTS
// ===================================================

function ManageComplaints() {
  const navigate = useNavigate();

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");

  const [search, setSearch]                 = useState("");
  const [statusFilter, setStatusFilter]     = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [listingFilter, setListingFilter]   = useState("ALL");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // -- Update status --
  const updateStatus = async (id, newStatus) => {
    try {
      const res  = await authFetch(`${getApiUrl()}/admin/complaints/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) setRefreshTrigger((p) => p + 1);
      else alert(data.message || "Failed to update status.");
    } catch {
      alert("Cannot connect to backend.");
    }
  };

  // -- Load complaints --
  useEffect(() => {
    let mounted = true;
    const loadComplaints = async () => {
      setLoading(true);
      try {
        const res  = await authFetch(`${getApiUrl()}/admin/complaints`);
        if (!res || !mounted) return;
        const data = await res.json();
        if (!mounted) return;
        if (data.success) setComplaints(data.complaints || []);
        else setError(data.message || "Unable to load complaints.");
      } catch {
        if (mounted) setError("Cannot connect to backend.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadComplaints();
    return () => { mounted = false; };
  }, [navigate, refreshTrigger]);

  // -- Filtering --
  const filtered = complaints.filter((c) => {
    const q = search.toLowerCase().trim();
    const matchSearch =
      !q ||
      c.complaint_id?.toLowerCase().includes(q) ||
      c.product_name?.toLowerCase().includes(q) ||
      c.category?.toLowerCase().includes(q) ||
      c.location?.toLowerCase().includes(q) ||
      c.reported_shop_name?.toLowerCase().includes(q) ||
      c.reported_landmark?.toLowerCase().includes(q) ||
      c.seller_type?.toLowerCase().includes(q) ||
      c.shop?.shop_name?.toLowerCase().includes(q);

    const matchStatus   = statusFilter   === "ALL" || c.status   === statusFilter;
    const matchPriority = priorityFilter === "ALL" || c.priority === priorityFilter;

    const isUnlisted = c.seller_listing_type === "UNLISTED" || !c.shop_id;
    const matchListing =
      listingFilter === "ALL" ||
      (listingFilter === "UNLISTED" && isUnlisted) ||
      (listingFilter === "LISTED" && !isUnlisted);

    return matchSearch && matchStatus && matchPriority && matchListing;
  });

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setListingFilter("ALL");
  };

  // Quick stats
  const unlistedCount = complaints.filter((c) => c.seller_listing_type === "UNLISTED" || !c.shop_id).length;
  const stats = [
    { label: "Total Complaints", value: complaints.length, color: "var(--color-info)", bg: "#EFF6FF" },
    { label: "Unlisted Sellers", value: unlistedCount, color: "#2563EB", bg: "#EFF6FF" },
    { label: "High / Critical", value: complaints.filter(c => c.priority === "HIGH" || c.priority === "CRITICAL").length, color: "var(--color-error)", bg: "#FEF2F2" },
    { label: "Resolved", value: complaints.filter(c => c.status === "RESOLVED").length, color: "var(--color-success)", bg: "#F0FDF4" },
  ];

  if (loading) {
    return (
      <div className="admin-dashboard-layout">
        <AdminSidebar />
        <div className="admin-dashboard-main">
          <div className="page-loading" style={{ minHeight: "100vh" }}>
            <div className="page-loading-card animate-fade-in">
              <div className="spinner" style={{ margin: "0 auto 20px" }} />
              <h3>Loading Complaints</h3>
              <p>Fetching data from the database...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-layout">
      <AdminSidebar />

      <div className="admin-dashboard-main">

        {/* Topbar */}
        <header className="admin-dashboard-topbar">
          <div className="admin-topbar-left">
            <h1>Manage Complaints</h1>
            <p>Review, verify, and monitor all listed and unlisted vendor grievances</p>
          </div>
          <div className="admin-topbar-right">
            <button
              className="topbar-icon-btn"
              onClick={() => setRefreshTrigger(p => p + 1)}
              title="Refresh"
            >
              <RefreshCw size={16} />
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate("/admin-dashboard")}>
              ← Dashboard
            </button>
          </div>
        </header>

        <div className="admin-dashboard-content">

          {/* Error */}
          {error && (
            <div className="alert alert-error" style={{ marginBottom: "var(--space-6)" }}>
              <AlertTriangle size={16} />
              {error}
              <button
                style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit" }}
                onClick={() => setRefreshTrigger(p => p + 1)}
              >
                <RefreshCw size={14} />
              </button>
            </div>
          )}

          {/* Page Header */}
          <div className="page-header">
            <div className="page-header-eyebrow">Complaint Management</div>
            <h1>All Grievance Records</h1>
            <p>Search, filter, and triage complaints from registered establishments and roadside food vendors.</p>
          </div>

          {/* Summary Row */}
          <div className="stat-cards-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: "var(--space-6)" }}>
            {stats.map(s => (
              <div key={s.label} className="stat-card" style={{ padding: "var(--space-5)" }}>
                <div className="stat-card-value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-card-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filter Bar */}
          <div className="filter-bar">
            <div className="search-input-wrap" style={{ flex: 2 }}>
              <Search size={15} />
              <input
                type="text"
                placeholder="Search by ID, product, vendor, landmark, or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="filter-select"
              value={listingFilter}
              onChange={(e) => setListingFilter(e.target.value)}
            >
              <option value="ALL">All Seller Types</option>
              <option value="LISTED">Listed Shops Only</option>
              <option value="UNLISTED">Unlisted Sellers Only</option>
            </select>

            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Status</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="VERIFIED">Verified</option>
              <option value="INVESTIGATION">Investigation</option>
              <option value="RESOLVED">Resolved</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <select
              className="filter-select"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="ALL">All Priority</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            {(search || statusFilter !== "ALL" || priorityFilter !== "ALL" || listingFilter !== "ALL") && (
              <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
                <X size={14} /> Clear
              </button>
            )}
          </div>

          {/* Table */}
          <div className="table-container animate-fade-in-up">
            <div className="table-header">
              <h3>{filtered.length} Complaint{filtered.length !== 1 ? "s" : ""}</h3>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setRefreshTrigger(p => p + 1)}
              >
                <RefreshCw size={13} /> Refresh
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Complaint ID</th>
                    <th>Seller / Establishment</th>
                    <th>Product / Food</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Risk</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={10}>
                        <div className="empty-state">
                          <div className="empty-state-icon">
                            <ClipboardList size={28} color="var(--color-muted)" />
                          </div>
                          <h3>No complaints found</h3>
                          <p>
                            {search || statusFilter !== "ALL" || priorityFilter !== "ALL" || listingFilter !== "ALL"
                              ? "Try adjusting your search or filters."
                              : "No complaints have been submitted yet."}
                          </p>
                          {(search || statusFilter !== "ALL" || priorityFilter !== "ALL" || listingFilter !== "ALL") && (
                            <button className="btn btn-outline btn-sm" style={{ marginTop: "var(--space-4)" }} onClick={clearFilters}>
                              Clear Filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((c) => {
                      const isUnlisted = c.seller_listing_type === "UNLISTED" || !c.shop_id;
                      const risk = Number(c.risk_score || 0);
                      let riskBadge = "badge-risk-low";
                      if (risk >= 75) riskBadge = "badge-risk-critical";
                      else if (risk >= 50) riskBadge = "badge-risk-high";
                      else if (risk >= 25) riskBadge = "badge-risk-medium";

                      const dateStr = c.incident_date || c.created_at || c.createdAt
                        ? new Date(c.incident_date || c.created_at || c.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                        : "N/A";

                      const sellerName = isUnlisted
                        ? (c.reported_shop_name || "Unknown Seller")
                        : (c.shop?.shop_name || c.shop_name || "Registered Business");

                      const landmarkOrLocation = isUnlisted
                        ? (c.reported_landmark || c.location || "Landmark on record")
                        : (c.location || c.shop?.city || "Registered Location");

                      const sellerTypeLabel = isUnlisted
                        ? (c.seller_type || "Roadside Vendor")
                        : (c.shop?.license_number ? `FSSAI: ${c.shop.license_number}` : "Listed Business");

                      return (
                        <tr key={c.id || c.complaint_id}>
                          <td className="col-id" style={{ whiteSpace: "nowrap" }}>
                            <strong>{c.complaint_id}</strong>
                          </td>

                          {/* Seller / Establishment details */}
                          <td style={{ minWidth: 200 }}>
                            <div style={{ marginBottom: "3px" }}>
                              {isUnlisted ? (
                                <span
                                  className="badge"
                                  style={{
                                    background: "#EFF6FF",
                                    color: "#1D4ED8",
                                    border: "1px solid #BFDBFE",
                                    fontSize: "10px",
                                    fontWeight: 700,
                                    padding: "2px 6px",
                                    letterSpacing: "0.03em"
                                  }}
                                >
                                  Unlisted Seller
                                </span>
                              ) : (
                                <span
                                  className="badge"
                                  style={{
                                    background: "#F0FDF4",
                                    color: "#15803D",
                                    border: "1px solid #BBF7D0",
                                    fontSize: "10px",
                                    fontWeight: 700,
                                    padding: "2px 6px",
                                    letterSpacing: "0.03em"
                                  }}
                                >
                                  Listed Shop
                                </span>
                              )}
                            </div>
                            <div className="col-primary" style={{ fontWeight: 600, fontSize: "var(--font-size-sm)" }}>
                              {sellerName}
                            </div>
                            <div style={{ fontSize: "11px", color: "var(--color-secondary)", marginTop: "2px" }}>
                              {sellerTypeLabel} • {landmarkOrLocation}
                            </div>
                          </td>

                          <td>
                            <div className="col-primary" style={{ fontWeight: 600 }}>
                              {c.product_name || "Food Sample"}
                            </div>
                          </td>

                          <td className="col-muted" style={{ fontSize: "var(--font-size-xs)" }}>
                            {c.category || "N/A"}
                          </td>

                          <td>
                            <div className="col-truncate" style={{ maxWidth: 180, color: "var(--color-secondary)", fontSize: "var(--font-size-xs)" }}>
                              {c.description || "—"}
                            </div>
                          </td>

                          <td><StatusBadge status={c.status} /></td>
                          <td><PriorityBadge priority={c.priority} /></td>
                          <td><span className={`badge ${riskBadge}`}>{risk}</span></td>
                          <td className="col-muted" style={{ whiteSpace: "nowrap", fontSize: "var(--font-size-xs)" }}>{dateStr}</td>

                          <td>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => navigate(`/admin/complaints/${c.id || c.complaint_id}`)}
                                title="View details"
                              >
                                <Eye size={13} />
                              </button>
                              <select
                                value={c.status}
                                onChange={(e) => updateStatus(c.id || c.complaint_id, e.target.value)}
                                style={{
                                  fontSize: "var(--font-size-xs)",
                                  padding: "5px 8px",
                                  border: "1.5px solid var(--color-border)",
                                  borderRadius: "var(--radius-sm)",
                                  background: "var(--color-surface)",
                                  color: "var(--color-heading)",
                                  cursor: "pointer",
                                }}
                              >
                                <option value="SUBMITTED">Submitted</option>
                                <option value="UNDER_REVIEW">Under Review</option>
                                <option value="VERIFIED">Verified</option>
                                <option value="INVESTIGATION">Investigation</option>
                                <option value="RESOLVED">Resolved</option>
                                <option value="REJECTED">Rejected</option>
                              </select>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .admin-dashboard-main { margin-left: 0 !important; }
        }
      `}</style>
    </div>
  );
}

export default ManageComplaints;