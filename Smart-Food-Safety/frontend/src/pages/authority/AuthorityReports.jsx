import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileCheck,
  Search,
  ClipboardCheck,
  BarChart3,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  Download,
  Filter,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  Flame,
  Layers,
  PieChart,
} from "lucide-react";
import AuthoritySidebar from "../../components/AuthoritySidebar";
import { getApiUrl, authFetch } from "../../services/authService";

function AuthorityReports() {
  const navigate = useNavigate();

  const [complaints, setComplaints] = useState([]);
  const [authorityStats, setAuthorityStats] = useState({
    verified: 0,
    under_investigation: 0,
    action_required: 0,
    resolved: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRisk, setSelectedRisk] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  const fetchReports = async () => {
    try {
      setRefreshing(true);
      setError("");

      const userString = localStorage.getItem("user");
      if (!userString) {
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
        navigate("/login");
        return;
      }

      // 1. Fetch Verified Complaints
      const verifiedPromise = authFetch(`${getApiUrl()}/authority/complaints`);

      // 2. Fetch Investigation Complaints
      const investigationPromise = authFetch(`${getApiUrl()}/authority/investigations`);

      // 3. Fetch Authority Statistics
      const statisticsPromise = authFetch(`${getApiUrl()}/authority/statistics`);

      const [verifiedRes, investigationRes, statsRes] = await Promise.allSettled([
        verifiedPromise,
        investigationPromise,
        statisticsPromise,
      ]);

      let combinedComplaints = [];

      if (verifiedRes.status === "fulfilled" && verifiedRes.value?.ok) {
        const vData = await verifiedRes.value.json();
        const list = vData.complaints || vData.data || [];
        if (Array.isArray(list)) combinedComplaints.push(...list);
      }

      if (investigationRes.status === "fulfilled" && investigationRes.value?.ok) {
        const iData = await investigationRes.value.json();
        const list = iData.complaints || iData.data || [];
        if (Array.isArray(list)) combinedComplaints.push(...list);
      }

      // Deduplicate by ID
      const uniqueComplaints = [];
      const seenIds = new Set();
      combinedComplaints.forEach((c) => {
        const uid = c.id || c.complaint_id;
        if (uid !== undefined && !seenIds.has(uid)) {
          seenIds.add(uid);
          uniqueComplaints.push(c);
        }
      });
      setComplaints(uniqueComplaints);

      // Handle stats
      if (statsRes.status === "fulfilled" && statsRes.value?.ok) {
        const sData = await statsRes.value.json();
        if (sData?.statistics) {
          setAuthorityStats({
            verified: Number(sData.statistics.verified) || 0,
            under_investigation: Number(sData.statistics.under_investigation) || 0,
            action_required: Number(sData.statistics.action_required) || 0,
            resolved: Number(sData.statistics.resolved) || 0,
          });
        }
      } else {
        // Fallback stats computed from unique complaints
        const vCount = uniqueComplaints.filter((c) => String(c.status).toUpperCase() === "VERIFIED").length;
        const iCount = uniqueComplaints.filter((c) => String(c.status).toUpperCase().includes("INVESTIGATION")).length;
        const aCount = uniqueComplaints.filter((c) => String(c.status).toUpperCase().includes("ACTION")).length;
        const rCount = uniqueComplaints.filter((c) => String(c.status).toUpperCase() === "RESOLVED").length;
        setAuthorityStats({
          verified: vCount,
          under_investigation: iCount,
          action_required: aCount,
          resolved: rCount,
        });
      }
    } catch (err) {
      console.error("Authority report fetch error:", err);
      setError(err.message || "Failed to load authority intelligence reports.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const normalizedReports = useMemo(() => {
    return complaints.map((item) => {
      const riskScore = Number(item.risk_score) || 0;
      let calculatedRisk = "LOW";
      if (riskScore >= 75) calculatedRisk = "CRITICAL";
      else if (riskScore >= 50) calculatedRisk = "HIGH";
      else if (riskScore >= 30) calculatedRisk = "MEDIUM";

      const rawRisk = String(item.risk_level || "").toUpperCase();
      const finalRisk = rawRisk.includes("CRITICAL")
        ? "CRITICAL"
        : rawRisk.includes("HIGH")
        ? "HIGH"
        : rawRisk.includes("MEDIUM")
        ? "MEDIUM"
        : calculatedRisk;

      const rawStatus = String(item.status || "VERIFIED").toUpperCase();
      let finalStatus = "VERIFIED";
      if (rawStatus.includes("INVESTIGATION")) finalStatus = "UNDER INVESTIGATION";
      else if (rawStatus.includes("ACTION_TAKEN")) finalStatus = "ACTION TAKEN";
      else if (rawStatus.includes("ACTION")) finalStatus = "ACTION REQUIRED";
      else if (rawStatus.includes("RESOLVED")) finalStatus = "RESOLVED";

      return {
        ...item,
        displayId: item.complaint_id || `CMP-${item.id}`,
        category: item.category || item.complaint_type || "Food Safety Violation",
        product: item.product_name || item.product || "Food Product",
        shop: item.seller_listing_type === "UNLISTED" || !item.shop_id
          ? (item.reported_shop_name || item.seller_type || "Unlisted Food Seller")
          : (item.shop_name || item.shop?.shop_name || "Registered Establishment"),
        isUnlisted: item.seller_listing_type === "UNLISTED" || !item.shop_id,
        risk: finalRisk,
        status: finalStatus,
        createdAt: item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN") : "Recent",
      };
    });
  }, [complaints]);

  // Aggregate metrics
  const verifiedCount = authorityStats.verified;
  const investigationCount = authorityStats.under_investigation + authorityStats.action_required;
  const resolvedCount = authorityStats.resolved;
  const totalCases = (verifiedCount + investigationCount + resolvedCount) || normalizedReports.length || 1;

  const criticalCount = normalizedReports.filter((r) => r.risk === "CRITICAL").length;
  const highCount = normalizedReports.filter((r) => r.risk === "HIGH").length;
  const mediumCount = normalizedReports.filter((r) => r.risk === "MEDIUM").length;
  const lowCount = normalizedReports.filter((r) => r.risk === "LOW").length;

  const verifiedPercent = Math.min(100, Math.round((verifiedCount / totalCases) * 100));
  const investigationPercent = Math.min(100, Math.round((investigationCount / totalCases) * 100));
  const resolvedPercent = Math.min(100, Math.round((resolvedCount / totalCases) * 100));

  // Category breakdown
  const categoryCounts = useMemo(() => {
    const map = {};
    normalizedReports.forEach((r) => {
      map[r.category] = (map[r.category] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [normalizedReports]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return normalizedReports.filter((item) => {
      const matchSearch =
        !q ||
        item.displayId.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.product.toLowerCase().includes(q) ||
        item.shop.toLowerCase().includes(q);

      const matchRisk = selectedRisk === "ALL" || item.risk === selectedRisk;
      const matchStatus = selectedStatus === "ALL" || item.status === selectedStatus;

      return matchSearch && matchRisk && matchStatus;
    });
  }, [normalizedReports, searchTerm, selectedRisk, selectedStatus]);

  const handleExportCSV = () => {
    if (filteredReports.length === 0) return;
    const headers = ["Complaint ID", "Category", "Product", "Shop", "Risk Level", "Status", "Date"];
    const rows = filteredReports.map((r) => [
      `"${r.displayId}"`,
      `"${r.category}"`,
      `"${r.product}"`,
      `"${r.shop}"`,
      `"${r.risk}"`,
      `"${r.status}"`,
      `"${r.createdAt}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `FSSAI_Authority_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="admin-layout">
      <AuthoritySidebar />

      <main className="admin-main">
        {/* TOP BAR / BREADCRUMB */}
        <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", color: "var(--color-text-muted)", marginBottom: "0.25rem" }}>
              <span>FSSAI Authority Portal</span>
              <span>/</span>
              <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>Analytics & Reports</span>
            </div>
            <h1 style={{ fontSize: "1.625rem", fontWeight: 700, color: "var(--color-text)", margin: 0, display: "flex", alignItems: "center", gap: "0.625rem" }}>
              <BarChart3 style={{ color: "var(--color-primary)" }} size={26} />
              Enforcement & Compliance Reports
            </h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              onClick={fetchReports}
              disabled={refreshing}
              className="btn btn-secondary"
              style={{ padding: "0.5rem 0.875rem", fontSize: "0.875rem" }}
            >
              <RefreshCw size={15} className={refreshing ? "spin-icon" : ""} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
            <button
              onClick={handleExportCSV}
              disabled={filteredReports.length === 0}
              className="btn btn-primary"
              style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
            >
              <Download size={15} />
              Export Dossier (CSV)
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: "1rem", background: "var(--color-danger-subtle)", border: "1px solid var(--color-danger-border)", borderRadius: "var(--radius-md)", color: "var(--color-danger)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <AlertTriangle size={18} />
            <span style={{ fontSize: "0.875rem" }}>{error}</span>
          </div>
        )}

        {/* TOP STAT METRIC CARDS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          <div className="card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Verified Queue
              </span>
              <div style={{ width: 34, height: 34, borderRadius: "var(--radius-sm)", background: "rgba(16, 185, 129, 0.12)", color: "#10B981", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FileCheck size={18} />
              </div>
            </div>
            <div style={{ fontSize: "1.875rem", fontWeight: 700, color: "var(--color-text)" }}>
              {verifiedCount}
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
              Referred by Admin for inspection
            </span>
          </div>

          <div className="card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Active Audits
              </span>
              <div style={{ width: 34, height: 34, borderRadius: "var(--radius-sm)", background: "rgba(245, 158, 11, 0.12)", color: "#F59E0B", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Clock size={18} />
              </div>
            </div>
            <div style={{ fontSize: "1.875rem", fontWeight: 700, color: "var(--color-text)" }}>
              {investigationCount}
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
              In-field investigations & sample testing
            </span>
          </div>

          <div className="card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Resolved & Closed
              </span>
              <div style={{ width: 34, height: 34, borderRadius: "var(--radius-sm)", background: "rgba(59, 130, 246, 0.12)", color: "#3B82F6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircle2 size={18} />
              </div>
            </div>
            <div style={{ fontSize: "1.875rem", fontWeight: 700, color: "var(--color-text)" }}>
              {resolvedCount}
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
              Full corrective action verified
            </span>
          </div>

          <div className="card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                High & Critical Risk
              </span>
              <div style={{ width: 34, height: 34, borderRadius: "var(--radius-sm)", background: "rgba(239, 68, 68, 0.12)", color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Flame size={18} />
              </div>
            </div>
            <div style={{ fontSize: "1.875rem", fontWeight: 700, color: "#EF4444" }}>
              {criticalCount + highCount}
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
              Requiring emergency enforcement
            </span>
          </div>
        </div>

        {/* ANALYTICS VISUALIZATION GRID */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem", marginBottom: "1.5rem" }}>
          {/* LIFECYCLE PROGRESS GAUGES */}
          <div className="card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--color-text)", margin: 0 }}>
                  Case Lifecycle Distribution
                </h3>
                <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                  Enforcement pipeline velocity
                </span>
              </div>
              <TrendingUp size={18} style={{ color: "var(--color-primary)" }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", marginBottom: "0.375rem" }}>
                  <span style={{ fontWeight: 500, color: "var(--color-text)" }}>Verified Referrals</span>
                  <span style={{ color: "var(--color-text-muted)" }}>{verifiedCount} cases ({verifiedPercent}%)</span>
                </div>
                <div style={{ width: "100%", height: "8px", background: "var(--color-bg-secondary)", borderRadius: "999px", overflow: "hidden" }}>
                  <div style={{ width: `${verifiedPercent}%`, height: "100%", background: "#10B981", borderRadius: "999px", transition: "width 0.4s ease" }} />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", marginBottom: "0.375rem" }}>
                  <span style={{ fontWeight: 500, color: "var(--color-text)" }}>Active Investigation / Audit</span>
                  <span style={{ color: "var(--color-text-muted)" }}>{investigationCount} cases ({investigationPercent}%)</span>
                </div>
                <div style={{ width: "100%", height: "8px", background: "var(--color-bg-secondary)", borderRadius: "999px", overflow: "hidden" }}>
                  <div style={{ width: `${investigationPercent}%`, height: "100%", background: "#F59E0B", borderRadius: "999px", transition: "width 0.4s ease" }} />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", marginBottom: "0.375rem" }}>
                  <span style={{ fontWeight: 500, color: "var(--color-text)" }}>Resolved & Closed</span>
                  <span style={{ color: "var(--color-text-muted)" }}>{resolvedCount} cases ({resolvedPercent}%)</span>
                </div>
                <div style={{ width: "100%", height: "8px", background: "var(--color-bg-secondary)", borderRadius: "999px", overflow: "hidden" }}>
                  <div style={{ width: `${resolvedPercent}%`, height: "100%", background: "#3B82F6", borderRadius: "999px", transition: "width 0.4s ease" }} />
                </div>
              </div>
            </div>
          </div>

          {/* RISK SPECTRUM STRIP */}
          <div className="card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--color-text)", margin: 0 }}>
                  Statutory Risk Spectrum
                </h3>
                <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                  Health hazard categorization
                </span>
              </div>
              <ShieldAlert size={18} style={{ color: "#EF4444" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
              <div style={{ padding: "0.875rem", borderRadius: "var(--radius-md)", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#DC2626" }} />
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#DC2626", textTransform: "uppercase" }}>Critical Risk</span>
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#DC2626" }}>{criticalCount}</div>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Contamination / Toxins</span>
              </div>

              <div style={{ padding: "0.875rem", borderRadius: "var(--radius-md)", background: "rgba(249, 115, 22, 0.08)", border: "1px solid rgba(249, 115, 22, 0.2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#EA580C" }} />
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#EA580C", textTransform: "uppercase" }}>High Risk</span>
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#EA580C" }}>{highCount}</div>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Adulteration & Spoiled</span>
              </div>

              <div style={{ padding: "0.875rem", borderRadius: "var(--radius-md)", background: "rgba(234, 179, 8, 0.08)", border: "1px solid rgba(234, 179, 8, 0.2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#CA8A04" }} />
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#CA8A04", textTransform: "uppercase" }}>Medium Risk</span>
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#CA8A04" }}>{mediumCount}</div>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Labeling / Minor Hygiene</span>
              </div>

              <div style={{ padding: "0.875rem", borderRadius: "var(--radius-md)", background: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#16A34A" }} />
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#16A34A", textTransform: "uppercase" }}>Low Risk</span>
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#16A34A" }}>{lowCount}</div>
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Informational Queries</span>
              </div>
            </div>
          </div>
        </div>

        {/* TOP VIOLATION CATEGORIES */}
        {categoryCounts.length > 0 && (
          <div className="card" style={{ padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
            <h4 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--color-text)", margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Layers size={17} style={{ color: "var(--color-primary)" }} />
              Top Violation Categories Reported
            </h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
              {categoryCounts.map(([cat, count]) => (
                <div
                  key={cat}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.625rem",
                    padding: "0.5rem 0.875rem",
                    background: "var(--color-bg-secondary)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-border)",
                    fontSize: "0.8125rem",
                  }}
                >
                  <span style={{ color: "var(--color-text)", fontWeight: 500 }}>{cat}</span>
                  <span style={{ padding: "0.125rem 0.5rem", borderRadius: "999px", background: "var(--color-primary-subtle)", color: "var(--color-primary)", fontWeight: 700, fontSize: "0.75rem" }}>
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* COMPREHENSIVE DOSSIER TABLE CARD */}
        <div className="card" style={{ overflow: "hidden" }}>
          {/* TOOLBAR */}
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--color-border)", display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h3 style={{ fontSize: "1.0625rem", fontWeight: 600, color: "var(--color-text)", margin: 0 }}>
                Case Docket & Audit Logs
              </h3>
              <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                Showing {filteredReports.length} of {normalizedReports.length} total entries
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              {/* SEARCH INPUT */}
              <div style={{ position: "relative", minWidth: 220 }}>
                <Search size={15} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
                <input
                  type="text"
                  placeholder="Search docket, shop, product..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: "2.25rem", height: "36px", fontSize: "0.8125rem" }}
                />
              </div>

              {/* RISK FILTER */}
              <select
                value={selectedRisk}
                onChange={(e) => setSelectedRisk(e.target.value)}
                className="input-field"
                style={{ height: "36px", fontSize: "0.8125rem", width: "auto" }}
              >
                <option value="ALL">All Risk Levels</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              {/* STATUS FILTER */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="input-field"
                style={{ height: "36px", fontSize: "0.8125rem", width: "auto" }}
              >
                <option value="ALL">All Statuses</option>
                <option value="VERIFIED">Verified</option>
                <option value="UNDER INVESTIGATION">Under Investigation</option>
                <option value="ACTION REQUIRED">Action Required</option>
                <option value="ACTION TAKEN">Action Taken</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>
          </div>

          {/* TABLE */}
          {loading ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-muted)" }}>
              <RefreshCw size={24} className="spin-icon" style={{ margin: "0 auto 0.75rem auto" }} />
              <p style={{ margin: 0, fontSize: "0.875rem" }}>Synthesizing statutory reporting data...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div style={{ padding: "3.5rem 1.5rem", textAlign: "center", color: "var(--color-text-muted)" }}>
              <FileCheck size={42} style={{ margin: "0 auto 1rem auto", opacity: 0.4 }} />
              <h4 style={{ margin: "0 0 0.5rem 0", color: "var(--color-text)" }}>No matching report records found</h4>
              <p style={{ fontSize: "0.875rem", margin: 0 }}>Try clearing filters or search keywords to view the docket.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--color-bg-secondary)", textAlign: "left" }}>
                    <th style={{ padding: "0.75rem 1rem", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Complaint ID</th>
                    <th style={{ padding: "0.75rem 1rem", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Category</th>
                    <th style={{ padding: "0.75rem 1rem", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Product</th>
                    <th style={{ padding: "0.75rem 1rem", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Vendor / Shop</th>
                    <th style={{ padding: "0.75rem 1rem", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Risk Assessment</th>
                    <th style={{ padding: "0.75rem 1rem", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Status</th>
                    <th style={{ padding: "0.75rem 1rem", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((item) => {
                    const isCritical = item.risk === "CRITICAL";
                    const isHigh = item.risk === "HIGH";
                    const isMedium = item.risk === "MEDIUM";

                    const riskBadgeStyle = isCritical
                      ? { background: "rgba(239, 68, 68, 0.12)", color: "#DC2626", border: "1px solid rgba(239, 68, 68, 0.25)" }
                      : isHigh
                      ? { background: "rgba(249, 115, 22, 0.12)", color: "#EA580C", border: "1px solid rgba(249, 115, 22, 0.25)" }
                      : isMedium
                      ? { background: "rgba(234, 179, 8, 0.12)", color: "#CA8A04", border: "1px solid rgba(234, 179, 8, 0.25)" }
                      : { background: "rgba(34, 197, 94, 0.12)", color: "#16A34A", border: "1px solid rgba(34, 197, 94, 0.25)" };

                    const statusBadgeStyle = item.status === "RESOLVED"
                      ? { background: "rgba(16, 185, 129, 0.12)", color: "#10B981" }
                      : item.status.includes("INVESTIGATION")
                      ? { background: "rgba(59, 130, 246, 0.12)", color: "#3B82F6" }
                      : item.status.includes("ACTION")
                      ? { background: "rgba(245, 158, 11, 0.12)", color: "#F59E0B" }
                      : { background: "rgba(107, 114, 128, 0.12)", color: "var(--color-text-muted)" };

                    return (
                      <tr key={item.displayId} style={{ borderBottom: "1px solid var(--color-border)" }}>
                        <td style={{ padding: "0.875rem 1rem", fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-primary)" }}>
                          {item.displayId}
                        </td>
                        <td style={{ padding: "0.875rem 1rem", fontSize: "0.8125rem", color: "var(--color-text)" }}>
                          {item.category}
                        </td>
                        <td style={{ padding: "0.875rem 1rem", fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                          {item.product}
                        </td>
                        <td style={{ padding: "0.875rem 1rem", fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                          {item.isUnlisted && (
                            <span style={{ display: "inline-block", background: "#fef3c7", color: "#92400e", fontSize: "10px", fontWeight: 700, padding: "1px 5px", borderRadius: 3, marginRight: 6 }}>
                              UNLISTED
                            </span>
                          )}
                          {item.shop}
                        </td>
                        <td style={{ padding: "0.875rem 1rem" }}>
                          <span style={{ display: "inline-block", padding: "0.2rem 0.5rem", borderRadius: "var(--radius-sm)", fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", ...riskBadgeStyle }}>
                            {item.risk}
                          </span>
                        </td>
                        <td style={{ padding: "0.875rem 1rem" }}>
                          <span style={{ display: "inline-block", padding: "0.2rem 0.5rem", borderRadius: "var(--radius-sm)", fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", ...statusBadgeStyle }}>
                            {item.status}
                          </span>
                        </td>
                        <td style={{ padding: "0.875rem 1rem", textAlign: "right" }}>
                          <button
                            onClick={() => navigate(`/authority/complaint/${item.id}`)}
                            className="btn btn-secondary"
                            style={{ padding: "0.35rem 0.65rem", fontSize: "0.75rem", gap: "0.25rem" }}
                          >
                            Details
                            <ArrowRight size={13} />
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
      </main>
    </div>
  );
}

export default AuthorityReports;