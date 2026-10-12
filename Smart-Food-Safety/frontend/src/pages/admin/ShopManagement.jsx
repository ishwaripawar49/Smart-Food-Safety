import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Store,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Phone,
  Mail,
  FileText,
  ShieldCheck,
} from "lucide-react";
import AdminSidebar from "../../components/AdminSidebar";
import { authFetch, getApiUrl } from "../../services/authService";

function ShopManagement() {
  const navigate = useNavigate();

  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedShop, setSelectedShop] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    shop_name: "",
    owner_name: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    phone: "",
    email: "",
    license_number: "",
    status: "ACTIVE",
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // ==========================================
  // FETCH SHOPS
  // ==========================================
  useEffect(() => {
    let mounted = true;

    const loadShops = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (activeSearch.trim()) params.append("search", activeSearch.trim());
        if (statusFilter !== "All") params.append("status", statusFilter);

        const response = await authFetch(
          `${getApiUrl()}/shops?${params.toString()}`
        );

        if (!response || !mounted) return;
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || `Status: ${response.status}`);
        }

        if (data.success) {
          setShops(data.shops || []);
          setError("");
        } else {
          setError(data.message || "Failed to load food businesses.");
        }
      } catch (err) {
        if (!mounted) return;
        console.error("FETCH SHOPS ERROR:", err);
        setError(err.message || "Cannot connect to server.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadShops();
    return () => {
      mounted = false;
    };
  }, [activeSearch, statusFilter, refreshTrigger]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setActiveSearch(search);
  };

  const handleOpenAdd = () => {
    setFormData({
      shop_name: "",
      owner_name: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      phone: "",
      email: "",
      license_number: "",
      status: "ACTIVE",
    });
    setFormError("");
    setShowAddModal(true);
  };

  const handleOpenEdit = (shop) => {
    setSelectedShop(shop);
    setFormData({
      shop_name: shop.shop_name || "",
      owner_name: shop.owner_name || "",
      address: shop.address || "",
      city: shop.city || "",
      state: shop.state || "",
      pincode: shop.pincode || "",
      phone: shop.phone || "",
      email: shop.email || "",
      license_number: shop.license_number || "",
      status: shop.status || "ACTIVE",
    });
    setFormError("");
    setShowEditModal(true);
  };

  const handleViewShop = (shop) => {
    setSelectedShop(shop);
    setShowViewModal(true);
  };

  const handleCreateShop = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.shop_name.trim() || !formData.license_number.trim()) {
      setFormError("Business Name and FSSAI License Number are required.");
      return;
    }

    try {
      setFormSubmitting(true);
      const response = await authFetch(`${getApiUrl()}/shops`, {
        method: "POST",
        body: JSON.stringify(formData),
      });

      if (!response) return;
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to register shop.");
      }

      setSuccessMsg("Food business registered successfully!");
      setShowAddModal(false);
      setRefreshTrigger((prev) => prev + 1);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      console.error("CREATE SHOP ERROR:", err);
      setFormError(err.message || "Failed to register business.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleUpdateShop = async (e) => {
    e.preventDefault();
    if (!selectedShop) return;
    setFormError("");

    try {
      setFormSubmitting(true);
      const response = await authFetch(
        `${getApiUrl()}/shops/${selectedShop.id}`,
        {
          method: "PUT",
          body: JSON.stringify(formData),
        }
      );

      if (!response) return;
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update shop.");
      }

      setSuccessMsg("Business updated successfully!");
      setShowEditModal(false);
      setRefreshTrigger((prev) => prev + 1);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      console.error("UPDATE SHOP ERROR:", err);
      setFormError(err.message || "Failed to update business.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteShop = async (shop) => {
    if (
      !window.confirm(
        `Are you sure you want to remove or suspend "${shop.shop_name}"?`
      )
    ) {
      return;
    }

    try {
      const response = await authFetch(`${getApiUrl()}/shops/${shop.id}`, {
        method: "DELETE",
      });

      if (!response) return;
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete shop.");
      }

      setSuccessMsg(data.message || "Shop removed successfully.");
      setRefreshTrigger((prev) => prev + 1);
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err) {
      console.error("DELETE SHOP ERROR:", err);
      alert(err.message || "Error occurred while deleting shop.");
    }
  };

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-main">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Food Business & Shop Registry</h1>
            <p className="page-subtitle">
              Manage certified Food Business Operators (FBOs), licensed restaurants, and retail vendors.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              className="btn btn-secondary"
              onClick={() => setRefreshTrigger((prev) => prev + 1)}
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? "spin-animation" : ""} />
              <span>Refresh</span>
            </button>
            <button className="btn btn-primary" onClick={handleOpenAdd}>
              <Plus size={16} />
              <span>Register Business</span>
            </button>
          </div>
        </div>

        {/* Feedback Banners */}
        {successMsg && (
          <div
            style={{
              padding: "var(--space-3) var(--space-4)",
              background: "var(--color-success-bg)",
              border: "1px solid var(--color-success-border)",
              color: "var(--color-success)",
              borderRadius: "var(--radius-md)",
              marginBottom: "var(--space-4)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "var(--font-size-sm)",
            }}
          >
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "var(--space-3) var(--space-4)",
              background: "var(--color-error-bg)",
              border: "1px solid var(--color-error-border)",
              color: "var(--color-error)",
              borderRadius: "var(--radius-md)",
              marginBottom: "var(--space-4)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "var(--font-size-sm)",
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Filter & Search Bar */}
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
          <form
            onSubmit={handleSearchSubmit}
            style={{ display: "flex", gap: "8px", flex: 1, minWidth: "260px" }}
          >
            <div style={{ position: "relative", flex: 1 }}>
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
                placeholder="Search by business name, city, owner, or FSSAI license..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-secondary">
              Search
            </button>
            {activeSearch && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setSearch("");
                  setActiveSearch("");
                }}
              >
                Clear
              </button>
            )}
          </form>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-secondary)" }}>
              Filter Status:
            </span>
            <select
              className="form-control"
              style={{ width: "auto" }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>

        {/* Shops Data Table */}
        <div className="table-card">
          <div className="table-card-header">
            <div>
              <h2 className="table-card-title">Registered Establishments</h2>
              <span className="table-card-sub">
                Total {shops.length} establishments listed in registry
              </span>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: "var(--space-10)", textAlign: "center" }}>
              <div className="spinner" style={{ margin: "0 auto 16px" }} />
              <p style={{ color: "var(--color-secondary)", margin: 0 }}>
                Loading food business directory...
              </p>
            </div>
          ) : shops.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Store size={32} />
              </div>
              <h3>No Food Businesses Found</h3>
              <p>No records match your search criteria. Try a different query or register a new business.</p>
              <button className="btn btn-primary" onClick={handleOpenAdd}>
                <Plus size={16} />
                <span>Register First Business</span>
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Establishment Name</th>
                    <th>FSSAI License</th>
                    <th>City / State</th>
                    <th>Owner / Contact</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shops.map((shop) => {
                    const isActive = shop.status === "ACTIVE";
                    return (
                      <tr key={shop.id}>
                        <td>
                          <div>
                            <strong style={{ color: "var(--color-heading)", display: "block" }}>
                              {shop.shop_name}
                            </strong>
                            <span style={{ fontSize: "12px", color: "var(--color-muted)" }}>
                              {shop.address || "Address on file"}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontWeight: "700",
                              background: "var(--color-surface-2)",
                              padding: "2px 8px",
                              borderRadius: "var(--radius-sm)",
                              border: "1px solid var(--color-border)",
                              fontSize: "12px",
                              color: "var(--color-primary-dark)",
                            }}
                          >
                            {shop.license_number}
                          </span>
                        </td>
                        <td style={{ color: "var(--color-secondary)", fontSize: "var(--font-size-sm)" }}>
                          {shop.city || "—"}{shop.state ? `, ${shop.state}` : ""}
                        </td>
                        <td>
                          <div style={{ fontSize: "var(--font-size-sm)" }}>
                            <div style={{ fontWeight: "500" }}>{shop.owner_name || "—"}</div>
                            <div style={{ fontSize: "12px", color: "var(--color-muted)" }}>
                              {shop.phone || shop.email || "No contact"}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${isActive ? "badge-resolved" : "badge-rejected"}`}>
                            {shop.status || "ACTIVE"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "6px" }}>
                            <button
                              className="btn btn-sm btn-ghost"
                              onClick={() => handleViewShop(shop)}
                              title="View details"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              className="btn btn-sm btn-ghost"
                              onClick={() => handleOpenEdit(shop)}
                              title="Edit business"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              className="btn btn-sm btn-ghost"
                              style={{ color: "var(--color-error)" }}
                              onClick={() => handleDeleteShop(shop)}
                              title="Remove/Suspend"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal: Add Business */}
        {showAddModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 200,
              padding: "var(--space-4)",
            }}
          >
            <div
              className="card animate-fade-in"
              style={{
                maxWidth: "600px",
                width: "100%",
                maxHeight: "90vh",
                overflowY: "auto",
                padding: "var(--space-6)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "var(--space-4)",
                  borderBottom: "1px solid var(--color-border)",
                  paddingBottom: "var(--space-3)",
                }}
              >
                <h3 style={{ margin: 0, fontSize: "var(--font-size-xl)" }}>
                  Register Food Business
                </h3>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => setShowAddModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              {formError && (
                <div
                  style={{
                    padding: "var(--space-3)",
                    background: "var(--color-error-bg)",
                    color: "var(--color-error)",
                    borderRadius: "var(--radius-md)",
                    marginBottom: "var(--space-4)",
                    fontSize: "var(--font-size-sm)",
                  }}
                >
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreateShop}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                  <div className="form-group">
                    <label className="form-label">
                      Business Name <span style={{ color: "var(--color-error)" }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={formData.shop_name}
                      onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                      placeholder="e.g., Royal Sweets & Bakery"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      FSSAI License # <span style={{ color: "var(--color-error)" }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={formData.license_number}
                      onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                      placeholder="14-digit FSSAI license"
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                  <div className="form-group">
                    <label className="form-label">Proprietor / Owner Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.owner_name}
                      onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                      placeholder="e.g., Vikram Singhal"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Contact Phone</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@business.com"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Street Address</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Shop #, Street, Commercial Area"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-3)" }}>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="e.g., Pune"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="Maharashtra"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pincode</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      placeholder="411001"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-control"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="ACTIVE">Active (Licensed)</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="SUSPENDED">Suspended (Regulatory Hold)</option>
                  </select>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "var(--space-5)" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={formSubmitting}>
                    {formSubmitting ? "Registering..." : "Save Business"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Business */}
        {showEditModal && selectedShop && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 200,
              padding: "var(--space-4)",
            }}
          >
            <div
              className="card animate-fade-in"
              style={{
                maxWidth: "600px",
                width: "100%",
                maxHeight: "90vh",
                overflowY: "auto",
                padding: "var(--space-6)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "var(--space-4)",
                  borderBottom: "1px solid var(--color-border)",
                  paddingBottom: "var(--space-3)",
                }}
              >
                <h3 style={{ margin: 0, fontSize: "var(--font-size-xl)" }}>
                  Edit Establishment: {selectedShop.shop_name}
                </h3>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => setShowEditModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              {formError && (
                <div
                  style={{
                    padding: "var(--space-3)",
                    background: "var(--color-error-bg)",
                    color: "var(--color-error)",
                    borderRadius: "var(--radius-md)",
                    marginBottom: "var(--space-4)",
                    fontSize: "var(--font-size-sm)",
                  }}
                >
                  {formError}
                </div>
              )}

              <form onSubmit={handleUpdateShop}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                  <div className="form-group">
                    <label className="form-label">Business Name</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={formData.shop_name}
                      onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">FSSAI License #</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={formData.license_number}
                      onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                  <div className="form-group">
                    <label className="form-label">Owner Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.owner_name}
                      onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-3)" }}>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pincode</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-control"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="ACTIVE">Active (Licensed)</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="SUSPENDED">Suspended (Regulatory Hold)</option>
                  </select>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "var(--space-5)" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={formSubmitting}>
                    {formSubmitting ? "Updating..." : "Update Business"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: View Details */}
        {showViewModal && selectedShop && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 200,
              padding: "var(--space-4)",
            }}
          >
            <div
              className="card animate-fade-in"
              style={{
                maxWidth: "500px",
                width: "100%",
                padding: "var(--space-6)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "var(--space-4)",
                  borderBottom: "1px solid var(--color-border)",
                  paddingBottom: "var(--space-3)",
                }}
              >
                <h3 style={{ margin: 0, fontSize: "var(--font-size-xl)" }}>
                  Establishment Dossier
                </h3>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => setShowViewModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "var(--font-size-sm)" }}>
                <div>
                  <span style={{ color: "var(--color-muted)", fontSize: "12px" }}>BUSINESS NAME</span>
                  <div style={{ fontWeight: "700", fontSize: "16px", color: "var(--color-heading)" }}>
                    {selectedShop.shop_name}
                  </div>
                </div>

                <div>
                  <span style={{ color: "var(--color-muted)", fontSize: "12px" }}>FSSAI LICENSE #</span>
                  <div style={{ fontFamily: "monospace", fontWeight: "700", color: "var(--color-primary-dark)" }}>
                    {selectedShop.license_number}
                  </div>
                </div>

                <div>
                  <span style={{ color: "var(--color-muted)", fontSize: "12px" }}>OPERATOR / PROPRIETOR</span>
                  <div>{selectedShop.owner_name || "Not listed"}</div>
                </div>

                <div>
                  <span style={{ color: "var(--color-muted)", fontSize: "12px" }}>PHYSICAL ADDRESS</span>
                  <div>
                    {selectedShop.address || "No street address"}, {selectedShop.city || ""}, {selectedShop.state || ""} {selectedShop.pincode || ""}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <span style={{ color: "var(--color-muted)", fontSize: "12px" }}>PHONE</span>
                    <div>{selectedShop.phone || "—"}</div>
                  </div>
                  <div>
                    <span style={{ color: "var(--color-muted)", fontSize: "12px" }}>EMAIL</span>
                    <div>{selectedShop.email || "—"}</div>
                  </div>
                </div>

                <div>
                  <span style={{ color: "var(--color-muted)", fontSize: "12px" }}>REGULATORY STATUS</span>
                  <div style={{ marginTop: "4px" }}>
                    <span
                      className={`badge ${
                        selectedShop.status === "ACTIVE" ? "badge-resolved" : "badge-rejected"
                      }`}
                    >
                      {selectedShop.status || "ACTIVE"}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "var(--space-6)", textAlign: "right" }}>
                <button className="btn btn-secondary" onClick={() => setShowViewModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default ShopManagement;