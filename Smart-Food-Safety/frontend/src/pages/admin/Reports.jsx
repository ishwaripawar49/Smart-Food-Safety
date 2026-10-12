import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart2,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Store,
  Users,
  RefreshCw,
  FileText,
  ShieldCheck,
  Percent,
} from "lucide-react";
import AdminSidebar from "../../components/AdminSidebar";
import { authFetch, getApiUrl } from "../../services/authService";

function Reports() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportData, setReportData] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let mounted = true;

    const loadReports = async () => {
      try {
        setLoading(true);
        const response = await authFetch(`${getApiUrl()}/admin/reports`);
        if (!response || !mounted) return;

        if (!response.ok) {
          throw new Error(`Failed to load reports (Status: ${response.status})`);
        }

        const data = await response.json();
        if (!mounted) return;

        if (data.success && data.report) {
          setReportData(data.report);
          setError("");
        } else {
          setError(data.message || "Failed to load report analytics.");
        }
      } catch (err) {
        if (!mounted) return;
        console.error("ADMIN REPORTS ERROR:", err);
        setError("Cannot connect to server. Verify backend is running.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadReports();
    return () => {
      mounted = false;
    };
  }, [refreshTrigger]);

  const statusCategories = [
    { key: "SUBMITTED", label: "Submitted (Intake)", color: "var(--color-info)" },
    { key: "UNDER_REVIEW", label: "Under Review", color: "var(--color-warning)" },
    { key: "VERIFIED", label: "Verified by Admin", color: "#06B6D4" },
    { key: "INVESTIGATION", label: "Field Investigation", color: "#8B5CF6" },
    { key: "RESOLVED", label: "Resolved", color: "var(--color-success)" },
    { key: "REJECTED", label: "Rejected", color: "var(--color-error)" },
  ];

  return (
    <div className="admin-layout">
      <AdminSidebar />

      <main className="admin-main">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Food Safety Intelligence & Reports</h1>
            <p className="page-subtitle">
              Comprehensive analytics, complaint resolution metrics, risk breakdown, and regulatory audit summaries.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              className="btn btn-secondary"
              onClick={() => setRefreshTrigger((p) => p + 1)}
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? "spin-animation" : ""} />
              <span>Refresh Metrics</span>
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

        {loading ? (
          <div className="card" style={{ padding: "var(--space-10)", textAlign: "center" }}>
            <div className="spinner" style={{ margin: "0 auto 16px" }} />
            <p style={{ color: "var(--color-secondary)", margin: 0 }}>
              Compiling food safety registry statistics...
            </p>
          </div>
        ) : reportData ? (
          <div>
            {/* KPI Metrics Strip */}
            <div className="kpi-grid" style={{ marginBottom: "var(--space-6)" }}>
              <div className="kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-title">Total Logged Incidents</span>
                  <div className="kpi-icon primary">
                    <FileText size={20} />
                  </div>
                </div>
                <div className="kpi-value">{reportData.totalComplaints || 0}</div>
                <div className="kpi-footer">All-time grievance intake</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-title">Resolution Rate</span>
                  <div className="kpi-icon success">
                    <Percent size={20} />
                  </div>
                </div>
                <div className="kpi-value">{reportData.resolutionRate || 0}%</div>
                <div className="kpi-footer">
                  {reportData.resolvedComplaints || 0} Cases Successfully Resolved
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-title">Active Investigations</span>
                  <div className="kpi-icon warning">
                    <Clock size={20} />
                  </div>
                </div>
                <div className="kpi-value">{reportData.inProgressComplaints || 0}</div>
                <div className="kpi-footer">Under verification or field audit</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-title">High & Critical Risk</span>
                  <div className="kpi-icon error">
                    <AlertTriangle size={20} />
                  </div>
                </div>
                <div className="kpi-value">
                  {(reportData.criticalComplaints || 0) + (reportData.highRiskComplaints || 0)}
                </div>
                <div className="kpi-footer" style={{ color: "var(--color-error)" }}>
                  {reportData.criticalComplaints || 0} Critical / {reportData.highRiskComplaints || 0} High
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-title">Registered Businesses</span>
                  <div className="kpi-icon info">
                    <Store size={20} />
                  </div>
                </div>
                <div className="kpi-value">{reportData.totalShops || 0}</div>
                <div className="kpi-footer">{reportData.totalUsers || 0} Active Citizens</div>
              </div>
            </div>

            {/* Analytics Grid: Status Breakdown + Category Breakdown */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
                gap: "var(--space-6)",
                marginBottom: "var(--space-6)",
              }}
            >
              {/* Status Breakdown Card */}
              <div className="card" style={{ padding: "var(--space-6)" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    borderBottom: "1px solid var(--color-border)",
                    paddingBottom: "var(--space-3)",
                    marginBottom: "var(--space-4)",
                  }}
                >
                  <BarChart2 size={20} color="var(--color-primary)" />
                  <h3 style={{ margin: 0, fontSize: "var(--font-size-lg)" }}>
                    Lifecycle Status Distribution
                  </h3>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {statusCategories.map((item) => {
                    const count = (reportData.statusBreakdown && reportData.statusBreakdown[item.key]) || 0;
                    const total = reportData.totalComplaints || 1;
                    const pct = Math.round((count / total) * 100);

                    return (
                      <div key={item.key}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "var(--font-size-sm)",
                            marginBottom: "4px",
                          }}
                        >
                          <span style={{ fontWeight: "600", color: "var(--color-heading)" }}>
                            {item.label}
                          </span>
                          <span style={{ color: "var(--color-secondary)" }}>
                            <strong>{count}</strong> ({pct}%)
                          </span>
                        </div>
                        <div
                          style={{
                            height: "7px",
                            background: "var(--color-surface-2)",
                            borderRadius: "var(--radius-full)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${pct}%`,
                              background: item.color,
                              borderRadius: "var(--radius-full)",
                              transition: "width 0.4s ease",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Category Breakdown Card */}
              <div className="card" style={{ padding: "var(--space-6)" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    borderBottom: "1px solid var(--color-border)",
                    paddingBottom: "var(--space-3)",
                    marginBottom: "var(--space-4)",
                  }}
                >
                  <TrendingUp size={20} color="var(--color-primary)" />
                  <h3 style={{ margin: 0, fontSize: "var(--font-size-lg)" }}>
                    Violation Categories
                  </h3>
                </div>

                {reportData.categoryBreakdown && Array.isArray(reportData.categoryBreakdown) && reportData.categoryBreakdown.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {reportData.categoryBreakdown.map((cat, idx) => {
                      const total = reportData.totalComplaints || 1;
                      const pct = Math.round(((cat.count || 0) / total) * 100);
                      return (
                        <div key={idx}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "var(--font-size-sm)",
                              marginBottom: "4px",
                            }}
                          >
                            <span style={{ color: "var(--color-heading)", fontWeight: "500" }}>
                              {cat.category || "General"}
                            </span>
                            <span style={{ color: "var(--color-secondary)" }}>
                              <strong>{cat.count}</strong> cases
                            </span>
                          </div>
                          <div
                            style={{
                              height: "7px",
                              background: "var(--color-surface-2)",
                              borderRadius: "var(--radius-full)",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${pct}%`,
                                background: "var(--color-primary)",
                                borderRadius: "var(--radius-full)",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: "var(--space-6)", textAlign: "center", color: "var(--color-muted)" }}>
                    No categorized violation data logged yet.
                  </div>
                )}
              </div>
            </div>

            {/* Statutory Compliance Footer Strip */}
            <div
              style={{
                padding: "var(--space-4) var(--space-5)",
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
              }}
            >
              <ShieldCheck size={20} color="var(--color-primary)" />
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-secondary)", lineHeight: "1.5" }}>
                <strong>Official Audit Note:</strong> Intelligence figures are generated from the primary relational database registry. Case numbers and risk tiers satisfy statutory Food Safety and Standards documentation mandates.
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

export default Reports;