import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Sparkles,
  MapPin,
  CopyCheck,
  ShieldAlert,
  BarChart2,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  EyeOff,
  AlertTriangle,
  Info,
  Scale,
  FileText,
  Clock,
  Layers,
  ArrowRight,
} from "lucide-react";
import AdminSidebar from "../../components/AdminSidebar";
import AuthoritySidebar from "../../components/AuthoritySidebar";
import {
  fetchHotspots,
  fetchDuplicateQueue,
  submitDuplicateReview,
  fetchExplainableRisk,
  submitPriorityOverride,
  fetchIntelligenceOverview,
  fetchIntelligenceTrends,
} from "../../services/intelligenceService";
import "./AdminIntelligence.css";

const DEFAULT_MAP_CENTER = [19.076, 72.8777]; // Mumbai / Maharashtra default
const DEFAULT_MAP_ZOOM = 12;

export default function AdminIntelligence({ role = "ADMIN" }) {
  const [activeTab, setActiveTab] = useState("overview"); // overview | hotspots | duplicates | risk | trends
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Overview Data
  const [overviewData, setOverviewData] = useState(null);

  // Hotspots Data & Filters
  const [hotspotsData, setHotspotsData] = useState(null);
  const [hotspotFilters, setHotspotFilters] = useState({
    days: "all",
    category: "",
    status: "",
    minThreshold: 5,
  });

  // Duplicate Queue Data & Filters
  const [duplicatesList, setDuplicatesList] = useState([]);
  const [dupStatusFilter, setDupStatusFilter] = useState("PENDING");
  const [reviewNoteModal, setReviewNoteModal] = useState({ open: false, item: null, action: "" });
  const [reviewNotesInput, setReviewNotesInput] = useState("");

  // Explainable Risk Inspector Data
  const [riskComplaintId, setRiskComplaintId] = useState("");
  const [inspectedRisk, setInspectedRisk] = useState(null);
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overridePriorityInput, setOverridePriorityInput] = useState("HIGH");
  const [overrideReasonInput, setOverrideReasonInput] = useState("");

  // Trends Data
  const [trendsData, setTrendsData] = useState(null);

  // Leaflet Map Refs
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const mapLayersRef = useRef([]);

  // Load Initial Overview
  useEffect(() => {
    loadOverview();
  }, []);

  // Tab Change Handler
  useEffect(() => {
    setError(null);
    setActionSuccess(null);
    if (activeTab === "overview") {
      loadOverview();
    } else if (activeTab === "hotspots") {
      loadHotspots();
    } else if (activeTab === "duplicates") {
      loadDuplicates();
    } else if (activeTab === "trends") {
      loadTrends();
    }
  }, [activeTab]);

  // Leaflet map initialization when hotspots tab active & data loaded
  useEffect(() => {
    if (activeTab !== "hotspots" || !mapContainerRef.current) return;

    // Initialize map if not yet created
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: DEFAULT_MAP_CENTER,
        zoom: DEFAULT_MAP_ZOOM,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear previous layers
    mapLayersRef.current.forEach((layer) => {
      try {
        map.removeLayer(layer);
      } catch (e) {
        // layer cleanup
      }
    });
    mapLayersRef.current = [];

    // Render cluster circles and markers
    if (hotspotsData && hotspotsData.clusters && hotspotsData.clusters.length > 0) {
      const bounds = [];

      hotspotsData.clusters.forEach((cluster) => {
        const lat = cluster.center_latitude;
        const lng = cluster.center_longitude;
        bounds.push([lat, lng]);

        let clusterColor = "#16a34a"; // Green (Low)
        if (cluster.concentration_level === "CRITICAL" || cluster.total_reports_count >= 5) {
          clusterColor = "#dc2626"; // Red (Critical)
        } else if (cluster.concentration_level === "HIGH" || cluster.total_reports_count >= 3) {
          clusterColor = "#ea580c"; // Orange (High)
        } else if (cluster.concentration_level === "MEDIUM") {
          clusterColor = "#ca8a04"; // Amber (Medium)
        }

        // Draw spatial coverage circle
        const circle = L.circle([lat, lng], {
          radius: cluster.cluster_radius_meters || 650,
          color: clusterColor,
          weight: 2,
          fillColor: clusterColor,
          fillOpacity: 0.22,
        }).addTo(map);

        // Draw cluster count badge marker
        const markerIcon = L.divIcon({
          className: "intel-custom-cluster-badge",
          html: `
            <div style="
              width: 36px;
              height: 36px;
              background: ${clusterColor};
              color: #ffffff;
              border-radius: 50%;
              border: 3px solid #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 800;
              font-size: 13px;
              box-shadow: 0 4px 10px rgba(0,0,0,0.3);
              cursor: pointer;
            ">
              ${cluster.total_reports_count}
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const marker = L.marker([lat, lng], { icon: markerIcon }).addTo(map);

        // Informative popup with neutral terminology and privacy safeguards
        const popupContent = `
          <div style="font-family: sans-serif; font-size: 13px; line-height: 1.4; min-width: 210px;">
            <div style="font-weight: 800; font-size: 14px; color: #164e2e; margin-bottom: 6px;">
              📍 Reported Complaint Concentration (${cluster.cluster_id})
            </div>
            <div style="background: #f1f5f9; padding: 6px 10px; border-radius: 6px; margin-bottom: 8px;">
              <strong>Total Reports:</strong> ${cluster.total_reports_count}<br/>
              <strong>Verified Findings:</strong> ${cluster.verified_reports_count || cluster.verified_finding_count || 0}<br/>
              <strong>Review Priority:</strong> <span style="font-weight: 700; color: ${clusterColor};">${cluster.review_priority}</span>
            </div>
            <div style="margin-bottom: 6px;">
              <strong>Predominant Category:</strong> ${cluster.predominant_category || "General"}
            </div>
            <div style="margin-bottom: 6px;">
              <strong>Approximate Area:</strong> ${cluster.approximate_area_label || "Reported Food Zone"}
            </div>
            <div style="font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 6px;">
              🔒 Privacy Safeguard: Spatially aggregated over coarse ~1km geographic grid. Complainant identities, personal contact info, and exact coordinates are strictly omitted.
            </div>
          </div>
        `;
        marker.bindPopup(popupContent);
        circle.bindPopup(popupContent);

        mapLayersRef.current.push(circle);
        mapLayersRef.current.push(marker);
      });

      if (bounds.length > 0) {
        try {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        } catch (e) {
          // fitbounds fallback
        }
      }
    }

    // Invalidate size after layout mounts
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);

    return () => {
      // Map cleanup on unmount handled on component destruction
    };
  }, [activeTab, hotspotsData]);

  // Clean up map when component unmounts
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Fetch Overview
  const loadOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchIntelligenceOverview();
      setOverviewData(data);
    } catch (err) {
      setError(err.message || "Failed to load overview");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Hotspots with current filters
  const loadHotspots = async (customFilters = hotspotFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHotspots(customFilters);
      setHotspotsData(data);
    } catch (err) {
      setError(err.message || "Failed to load hotspot analytics");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Duplicate Queue
  const loadDuplicates = async (rescan = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDuplicateQueue({
        status: dupStatusFilter,
        rescan,
      });
      setDuplicatesList(data || []);
    } catch (err) {
      setError(err.message || "Failed to load duplicate queue");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Trends
  const loadTrends = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchIntelligenceTrends();
      setTrendsData(data);
    } catch (err) {
      setError(err.message || "Failed to load trend analytics");
    } finally {
      setLoading(false);
    }
  };

  // Handle Hotspot Filter Change
  const handleFilterChange = (field, value) => {
    const updated = { ...hotspotFilters, [field]: value };
    setHotspotFilters(updated);
    loadHotspots(updated);
  };

  // Handle Duplicate Decision Submit
  const handleExecuteDuplicateReview = async () => {
    if (!reviewNoteModal.item) return;
    try {
      await submitDuplicateReview({
        review_id: reviewNoteModal.item.id,
        source_complaint_id: reviewNoteModal.item.source_complaint?.id,
        target_complaint_id: reviewNoteModal.item.target_complaint?.id,
        review_status: reviewNoteModal.action,
        review_notes: reviewNotesInput,
      });
      setActionSuccess(`Review recorded as ${reviewNoteModal.action}. Complaints remain independently preserved.`);
      setReviewNoteModal({ open: false, item: null, action: "" });
      setReviewNotesInput("");
      loadDuplicates(false);
    } catch (err) {
      setError(err.message || "Failed to record duplicate review");
    }
  };

  // Inspect Risk for a specific complaint
  const handleInspectRisk = async (idToInspect = riskComplaintId) => {
    if (!idToInspect || !String(idToInspect).trim()) {
      setError("Please enter or select a valid Complaint ID.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchExplainableRisk(idToInspect.trim());
      setInspectedRisk(data);
      setRiskComplaintId(data.complaint_id);
    } catch (err) {
      setError(err.message || "Failed to inspect complaint risk");
      setInspectedRisk(null);
    } finally {
      setLoading(false);
    }
  };

  // Submit Manual Priority Override
  const handleOverridePriority = async () => {
    if (!overrideReasonInput.trim()) {
      setError("Documented justification is mandatory when recording a priority override.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await submitPriorityOverride(inspectedRisk.complaint_id, {
        manual_priority: overridePriorityInput,
        override_reason: overrideReasonInput.trim(),
      });
      setActionSuccess(`Priority overridden to ${overridePriorityInput} with documented justification.`);
      setOverrideModalOpen(false);
      setOverrideReasonInput("");
      handleInspectRisk(inspectedRisk.complaint_id);
    } catch (err) {
      setError(err.message || "Failed to submit priority override");
    } finally {
      setLoading(false);
    }
  };

  // Dial Color Calculator
  const getDialColor = (score) => {
    if (score >= 75) return "#dc2626"; // Critical
    if (score >= 50) return "#ea580c"; // High
    if (score >= 30) return "#ca8a04"; // Medium
    return "#16a34a"; // Low
  };

  return (
    <div className="intel-container">
      {/* Sidebar based on role */}
      {role === "AUTHORIZED_AUTHORITY" ? <AuthoritySidebar /> : <AdminSidebar />}

      <main className="intel-main">
        {/* Top Header */}
        <div className="intel-header">
          <div>
            <div className="intel-header-title">
              <h1>FoodSafe Intelligence</h1>
              <span className="intel-badge-phase">Phase 5</span>
            </div>
            <div className="intel-header-subtitle">
              Complaint Analytics, Potential Duplicate Detection &amp; Explainable Risk Prioritization
            </div>
          </div>

          <button
            className="intel-btn-refresh"
            onClick={() => {
              if (activeTab === "overview") loadOverview();
              else if (activeTab === "hotspots") loadHotspots();
              else if (activeTab === "duplicates") loadDuplicates(true);
              else if (activeTab === "risk" && inspectedRisk) handleInspectRisk();
              else if (activeTab === "trends") loadTrends();
            }}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            {loading ? "Refreshing..." : "Refresh Intelligence"}
          </button>
        </div>

        {/* Global Notifications / Alerts */}
        {error && (
          <div className="intel-notice-banner intel-notice-warning" style={{ marginBottom: 16 }}>
            <AlertTriangle size={18} />
            <div>
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        {actionSuccess && (
          <div className="intel-notice-banner intel-notice-success" style={{ marginBottom: 16 }}>
            <CheckCircle size={18} />
            <div>{actionSuccess}</div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="intel-nav-tabs">
          <button
            className={`intel-tab-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <Sparkles size={16} /> Overview
          </button>
          <button
            className={`intel-tab-btn ${activeTab === "hotspots" ? "active" : ""}`}
            onClick={() => setActiveTab("hotspots")}
          >
            <MapPin size={16} /> Hotspot Map
          </button>
          <button
            className={`intel-tab-btn ${activeTab === "duplicates" ? "active" : ""}`}
            onClick={() => setActiveTab("duplicates")}
          >
            <CopyCheck size={16} /> Duplicate Queue
          </button>
          <button
            className={`intel-tab-btn ${activeTab === "risk" ? "active" : ""}`}
            onClick={() => setActiveTab("risk")}
          >
            <ShieldAlert size={16} /> Risk Inspector
          </button>
          <button
            className={`intel-tab-btn ${activeTab === "trends" ? "active" : ""}`}
            onClick={() => setActiveTab("trends")}
          >
            <BarChart2 size={16} /> Trend Analytics
          </button>
        </div>

        {/* ========================================================
            TAB 1: INTELLIGENCE OVERVIEW
           ======================================================== */}
        {activeTab === "overview" && (
          <div>
            <div className="intel-kpi-grid">
              <div className="intel-kpi-card">
                <div className="intel-kpi-icon" style={{ background: "#e0f2fe", color: "#0369a1" }}>
                  <Layers size={24} />
                </div>
                <div>
                  <div className="intel-kpi-value">{overviewData?.total_complaints ?? "--"}</div>
                  <div className="intel-kpi-label">Total Grievances</div>
                </div>
              </div>

              <div className="intel-kpi-card">
                <div className="intel-kpi-icon" style={{ background: "#fef3c7", color: "#b45309" }}>
                  <Clock size={24} />
                </div>
                <div>
                  <div className="intel-kpi-value">{overviewData?.complaints_last_7_days ?? "--"}</div>
                  <div className="intel-kpi-label">Last 7 Days</div>
                </div>
              </div>

              <div className="intel-kpi-card">
                <div className="intel-kpi-icon" style={{ background: "#dcfce7", color: "#15803d" }}>
                  <MapPin size={24} />
                </div>
                <div>
                  <div className="intel-kpi-value">{overviewData?.complaints_with_coordinates ?? "--"}</div>
                  <div className="intel-kpi-label">Mapped Coordinates</div>
                </div>
              </div>

              <div className="intel-kpi-card">
                <div className="intel-kpi-icon" style={{ background: "#fce7f3", color: "#be185d" }}>
                  <CopyCheck size={24} />
                </div>
                <div>
                  <div className="intel-kpi-value">{overviewData?.pending_duplicate_suggestions ?? "--"}</div>
                  <div className="intel-kpi-label">Pending Duplicate Pairs</div>
                </div>
              </div>

              <div className="intel-kpi-card">
                <div className="intel-kpi-icon" style={{ background: "#fee2e2", color: "#b91c1c" }}>
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <div className="intel-kpi-value">{overviewData?.high_priority_queue ?? "--"}</div>
                  <div className="intel-kpi-label">High / Critical Triage</div>
                </div>
              </div>

              <div className="intel-kpi-card">
                <div className="intel-kpi-icon" style={{ background: "#f3e8ff", color: "#7e22ce" }}>
                  <CheckCircle size={24} />
                </div>
                <div>
                  <div className="intel-kpi-value">{overviewData?.verified_findings_count ?? "--"}</div>
                  <div className="intel-kpi-label">Verified Findings</div>
                </div>
              </div>
            </div>

            {/* Quick Access Action Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
              <div className="intel-card" style={{ cursor: "pointer" }} onClick={() => setActiveTab("hotspots")}>
                <div className="intel-card-title">
                  <MapPin size={20} color="#16a34a" /> Explore Hotspot Clusters
                </div>
                <div className="intel-card-desc">
                  Identify spatial concentrations of food safety grievances across wards using 650m neighbourhood clustering.
                </div>
                <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 6, color: "#15803d", fontWeight: 700, fontSize: 13 }}>
                  View Map Analytics <ArrowRight size={16} />
                </div>
              </div>

              <div className="intel-card" style={{ cursor: "pointer" }} onClick={() => setActiveTab("duplicates")}>
                <div className="intel-card-title">
                  <CopyCheck size={20} color="#0284c7" /> Review Potential Duplicates
                </div>
                <div className="intel-card-desc">
                  Evaluate cross-lingual vendor matching, phonetic stall names, and coordinate proximity with explainable match factors.
                </div>
                <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 6, color: "#0369a1", fontWeight: 700, fontSize: 13 }}>
                  Review Queue ({overviewData?.pending_duplicate_suggestions ?? 0}) <ArrowRight size={16} />
                </div>
              </div>
            </div>

            {/* Methodology & Legal Notice */}
            <div className="intel-notice-banner intel-notice-info">
              <Info size={20} style={{ flexShrink: 0 }} />
              <div>
                <strong>Administrative Decision Support Notice:</strong> Hotspot aggregations and AI risk calculations are
                advisory tools designed solely to aid authorized officers in prioritizing investigation visits. Under no
                circumstances do automated scores establish statutory guilt, nor do unverified complaints justify penalizing a
                food business without authorized human field inspection.
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 2: HOTSPOT MAP (FOODSAFE INTELLIGENCE MAP)
           ======================================================== */}
        {activeTab === "hotspots" && (
          <div>
            <div className="intel-card">
              <div className="intel-card-header">
                <div>
                  <h3 className="intel-card-title">
                    <MapPin size={20} /> FoodSafe Intelligence Map
                  </h3>
                  <div className="intel-card-desc">
                    Spatial clustering of reported food safety grievances (~650m neighbourhood ward radius).
                  </div>
                </div>

                <div style={{ fontSize: 13, fontWeight: 700, color: "#166534" }}>
                  {hotspotsData?.total_clusters || 0} Clusters Identified ({hotspotsData?.total_complaints_with_coords || 0} Mapped Complaints)
                </div>
              </div>

              {/* Filters Toolbar */}
              <div className="intel-filter-toolbar">
                <div className="intel-filter-item">
                  <label>Time Window</label>
                  <select
                    value={hotspotFilters.days}
                    onChange={(e) => handleFilterChange("days", e.target.value)}
                  >
                    <option value="all">All Records</option>
                    <option value="7">Last 7 Days</option>
                    <option value="30">Last 30 Days</option>
                    <option value="90">Last 90 Days</option>
                  </select>
                </div>

                <div className="intel-filter-item">
                  <label>Category</label>
                  <select
                    value={hotspotFilters.category}
                    onChange={(e) => handleFilterChange("category", e.target.value)}
                  >
                    <option value="">All Categories</option>
                    <option value="Spoiled or Rotten Food">Spoiled Food</option>
                    <option value="Insect or Foreign Object">Foreign Object</option>
                    <option value="Unhygienic Preparation">Unhygienic Preparation</option>
                    <option value="Suspected Adulteration">Suspected Adulteration</option>
                    <option value="Expired Packaged Food">Expired Food</option>
                  </select>
                </div>

                <div className="intel-filter-item">
                  <label>Investigation Status</label>
                  <select
                    value={hotspotFilters.status}
                    onChange={(e) => handleFilterChange("status", e.target.value)}
                  >
                    <option value="">All Statuses</option>
                    <option value="REPORTED">Reported Concerns Only</option>
                    <option value="VERIFIED">Verified Findings Only</option>
                  </select>
                </div>

                <div className="intel-filter-item">
                  <label>Privacy Threshold (Min Reports)</label>
                  <select
                    value={hotspotFilters.minThreshold}
                    onChange={(e) => handleFilterChange("minThreshold", parseInt(e.target.value, 10))}
                  >
                    <option value="2">Threshold: 2+ (Standard Ward Protection)</option>
                    <option value="5">Threshold: 5+ (Recommended Privacy Baseline)</option>
                    <option value="10">Threshold: 10+ (High Anonymity / Strict Coarsening)</option>
                  </select>
                </div>
              </div>

              {/* Leaflet Map */}
              <div className="intel-map-wrapper">
                <div ref={mapContainerRef} className="intel-map-elem" />

                {/* Map Legend */}
                <div className="intel-map-legend">
                  <div className="intel-legend-title">Cluster Review Priority</div>
                  <div className="intel-legend-row">
                    <span className="intel-legend-dot" style={{ background: "#dc2626" }} />
                    Critical Concentration (5+ reports / acute hazard)
                  </div>
                  <div className="intel-legend-row">
                    <span className="intel-legend-dot" style={{ background: "#ea580c" }} />
                    High Concentration (3–4 reports)
                  </div>
                  <div className="intel-legend-row">
                    <span className="intel-legend-dot" style={{ background: "#ca8a04" }} />
                    Medium Concentration (2 reports)
                  </div>
                  <div className="intel-legend-row">
                    <span className="intel-legend-dot" style={{ background: "#16a34a" }} />
                    Reported Concern (Single isolated report)
                  </div>
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="intel-notice-banner intel-notice-info">
                <Info size={18} style={{ flexShrink: 0 }} />
                <div>
                  <strong>Privacy Safeguards Active:</strong> Complainant personal identities (name, phone, user account, exact
                  private residence) are strictly redacted. Cluster centroids are generalized to ward boundaries to protect
                  individual citizen privacy while providing actionable public health intelligence.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 3: POTENTIAL DUPLICATE QUEUE
           ======================================================== */}
        {activeTab === "duplicates" && (
          <div>
            <div className="intel-card">
              <div className="intel-card-header">
                <div>
                  <h3 className="intel-card-title">
                    <CopyCheck size={20} /> Intelligent Potential Duplicate Review Queue
                  </h3>
                  <div className="intel-card-desc">
                    Multi-signal matching: stall names, geographic distance, multilingual product synonyms, and incident timing.
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <select
                    value={dupStatusFilter}
                    onChange={(e) => {
                      setDupStatusFilter(e.target.value);
                      setTimeout(() => loadDuplicates(false), 50);
                    }}
                    style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #cbdcd1", fontSize: 13 }}
                  >
                    <option value="PENDING">Pending Review</option>
                    <option value="RELATED">Marked Related</option>
                    <option value="UNRELATED">Marked Unrelated</option>
                    <option value="DISMISSED">Dismissed</option>
                    <option value="ALL">All Suggestions</option>
                  </select>

                  <button
                    className="intel-btn-refresh"
                    onClick={() => loadDuplicates(true)}
                    style={{ padding: "6px 12px" }}
                  >
                    <RefreshCw size={13} /> Re-scan Database
                  </button>
                </div>
              </div>

              {/* Non-Destructive Explanatory Banner */}
              <div className="intel-notice-banner intel-notice-warning" style={{ marginBottom: 20 }}>
                <Scale size={18} style={{ flexShrink: 0 }} />
                <div>
                  <strong>Strict Non-Destructive Policy:</strong> Flagging or reviewing potential duplicates never deletes or
                  merges complaints. All original citizen records, timestamps, and evidence submissions are preserved in full.
                  Unlisted roadside vendors with <code style={{ background: "#fff", padding: "2px 4px", borderRadius: 4 }}>shop_id = NULL</code> are
                  never assumed to be the same vendor solely due to geographic proximity.
                </div>
              </div>

              {/* Duplicate Cards List */}
              {duplicatesList.length === 0 ? (
                <div className="intel-empty-state">
                  <CheckCircle size={40} color="#16a34a" style={{ margin: "0 auto 12px" }} />
                  <h3>No Duplicate Suggestions in Queue</h3>
                  <p>All complaints are currently classified as distinct unique reports for status "{dupStatusFilter}".</p>
                </div>
              ) : (
                duplicatesList.map((item) => {
                  const score = item.similarity_score;
                  let scoreClass = "intel-score-low";
                  if (score >= 70) scoreClass = "intel-score-high";
                  else if (score >= 50) scoreClass = "intel-score-medium";

                  const src = item.source_complaint || {};
                  const tgt = item.target_complaint || {};

                  return (
                    <div key={item.id} className="intel-dup-card">
                      <div className="intel-dup-top">
                        <div>
                          <span className={`intel-score-badge ${scoreClass}`}>
                            Similarity Score: {score}%
                          </span>
                          <span style={{ marginLeft: 12, fontSize: 12, color: "#64748b", fontWeight: 600 }}>
                            Status: {item.review_status}
                          </span>
                          {item.reviewer && (
                            <span style={{ marginLeft: 8, fontSize: 12, color: "#166534" }}>
                              (Reviewed by {item.reviewer.name})
                            </span>
                          )}
                        </div>

                        <div className="intel-reasons-wrap">
                          {(item.matching_reasons || []).map((reason, idx) => (
                            <span key={idx} className="intel-reason-tag">
                              ✓ {reason}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Side by side comparison */}
                      <div className="intel-dup-comparison">
                        {/* Source Complaint */}
                        <div className="intel-side-box">
                          <div className="intel-side-title">
                            <span>Primary Complaint: #{src.complaint_id || src.id}</span>
                            <span style={{ fontSize: 11, background: "#e2e8f0", padding: "2px 6px", borderRadius: 4 }}>
                              {src.status}
                            </span>
                          </div>
                          <div className="intel-side-meta">
                            <div><strong>Seller:</strong> {src.reported_shop_name || src.shop?.name || "Unlisted Vendor"} ({src.seller_listing_type || "LISTED"})</div>
                            <div><strong>Product:</strong> {src.product_name || "N/A"}</div>
                            <div><strong>Category:</strong> {src.category}</div>
                            <div><strong>Landmark / Location:</strong> {src.reported_landmark || src.location || "N/A"}</div>
                            <div><strong>Date:</strong> {src.created_at ? new Date(src.created_at).toLocaleDateString() : "N/A"}</div>
                            <div style={{ marginTop: 8, fontStyle: "italic", color: "#334155" }}>
                              "{src.description ? src.description.slice(0, 150) : "No description"}..."
                            </div>
                          </div>
                        </div>

                        {/* Target Complaint */}
                        <div className="intel-side-box">
                          <div className="intel-side-title">
                            <span>Correlated Report: #{tgt.complaint_id || tgt.id}</span>
                            <span style={{ fontSize: 11, background: "#e2e8f0", padding: "2px 6px", borderRadius: 4 }}>
                              {tgt.status}
                            </span>
                          </div>
                          <div className="intel-side-meta">
                            <div><strong>Seller:</strong> {tgt.reported_shop_name || tgt.shop?.name || "Unlisted Vendor"} ({tgt.seller_listing_type || "LISTED"})</div>
                            <div><strong>Product:</strong> {tgt.product_name || "N/A"}</div>
                            <div><strong>Category:</strong> {tgt.category}</div>
                            <div><strong>Landmark / Location:</strong> {tgt.reported_landmark || tgt.location || "N/A"}</div>
                            <div><strong>Date:</strong> {tgt.created_at ? new Date(tgt.created_at).toLocaleDateString() : "N/A"}</div>
                            <div style={{ marginTop: 8, fontStyle: "italic", color: "#334155" }}>
                              "{tgt.description ? tgt.description.slice(0, 150) : "No description"}..."
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Decision Buttons */}
                      <div className="intel-dup-actions">
                        <button
                          className="intel-btn-action intel-btn-related"
                          onClick={() => {
                            setReviewNoteModal({ open: true, item, action: "RELATED" });
                            setReviewNotesInput("Reports describe the same incident/establishment.");
                          }}
                        >
                          <CheckCircle size={14} /> Mark as Related
                        </button>
                        <button
                          className="intel-btn-action intel-btn-unrelated"
                          onClick={() => {
                            setReviewNoteModal({ open: true, item, action: "UNRELATED" });
                            setReviewNotesInput("Distinct food vendors / separate incidents.");
                          }}
                        >
                          <XCircle size={14} /> Mark as Unrelated
                        </button>
                        <button
                          className="intel-btn-action intel-btn-dismiss"
                          onClick={() => {
                            setReviewNoteModal({ open: true, item, action: "DISMISSED" });
                            setReviewNotesInput("Dismissed suggestion without prejudice.");
                          }}
                        >
                          <EyeOff size={14} /> Dismiss Suggestion
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Review Note Modal */}
            {reviewNoteModal.open && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(0,0,0,0.45)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 2000,
                  padding: 20,
                }}
              >
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: 14,
                    padding: 24,
                    maxWidth: 480,
                    width: "100%",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                  }}
                >
                  <h3 style={{ margin: "0 0 8px 0", color: "#14462b" }}>
                    Record Decision: {reviewNoteModal.action}
                  </h3>
                  <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 16px 0" }}>
                    Provide documented rationale for this correlation decision. It will be logged in the administrative audit history.
                  </p>

                  <textarea
                    value={reviewNotesInput}
                    onChange={(e) => setReviewNotesInput(e.target.value)}
                    rows={3}
                    style={{
                      width: "100%",
                      padding: 10,
                      borderRadius: 8,
                      border: "1px solid #cbdcd1",
                      fontSize: 13,
                      boxSizing: "border-box",
                      marginBottom: 16,
                    }}
                    placeholder="Enter review notes or justification..."
                  />

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                    <button
                      className="intel-btn-action intel-btn-dismiss"
                      onClick={() => setReviewNoteModal({ open: false, item: null, action: "" })}
                    >
                      Cancel
                    </button>
                    <button
                      className="intel-btn-action intel-btn-related"
                      onClick={handleExecuteDuplicateReview}
                    >
                      Confirm Decision
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 4: EXPLAINABLE RISK INSPECTOR
           ======================================================== */}
        {activeTab === "risk" && (
          <div>
            <div className="intel-card">
              <div className="intel-card-header">
                <div>
                  <h3 className="intel-card-title">
                    <ShieldAlert size={20} /> Explainable Risk Prioritization Inspector
                  </h3>
                  <div className="intel-card-desc">
                    Deconstructs risk scores into transparent, defensible contributing factors.
                  </div>
                </div>

                {/* Complaint ID Search Bar */}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="text"
                    value={riskComplaintId}
                    onChange={(e) => setRiskComplaintId(e.target.value)}
                    placeholder="e.g. FS-20261010-ABCD or #1"
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #cbdcd1",
                      fontSize: 13,
                      width: 220,
                    }}
                  />
                  <button
                    className="intel-btn-action intel-btn-related"
                    onClick={() => handleInspectRisk()}
                    style={{ padding: "8px 14px" }}
                  >
                    <Search size={14} /> Inspect
                  </button>
                </div>
              </div>

              {!inspectedRisk ? (
                <div className="intel-empty-state">
                  <ShieldAlert size={44} color="#94a3b8" style={{ margin: "0 auto 12px" }} />
                  <h3>Enter a Complaint Identifier</h3>
                  <p>Type any Complaint ID above to view its factor decomposition and scientific explanation.</p>
                </div>
              ) : (
                <div className="intel-risk-grid">
                  {/* Left Column: Score Dial & Override */}
                  <div className="intel-score-dial">
                    <div
                      className="intel-dial-circle"
                      style={{
                        borderColor: getDialColor(inspectedRisk.calculated_score),
                        color: getDialColor(inspectedRisk.calculated_score),
                      }}
                    >
                      <div className="intel-dial-score">{inspectedRisk.calculated_score}</div>
                      <div className="intel-dial-max">out of 100</div>
                    </div>

                    <div style={{ fontSize: 18, fontWeight: 800, color: getDialColor(inspectedRisk.calculated_score) }}>
                      {inspectedRisk.priority} PRIORITY
                    </div>

                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                      Engine: {inspectedRisk.scoring_version}
                    </div>

                    {inspectedRisk.override_info && (
                      <div style={{ marginTop: 14, padding: "8px 12px", background: "#fef9c3", borderRadius: 8, fontSize: 12, color: "#854d0e" }}>
                        ⚠️ <strong>Manually Overridden</strong><br/>
                        Original: {inspectedRisk.override_info.original_priority}<br/>
                        Reason: {inspectedRisk.override_info.reason}
                      </div>
                    )}

                    <button
                      className="intel-btn-action intel-btn-unrelated"
                      onClick={() => setOverrideModalOpen(true)}
                      style={{ width: "100%", justifyContent: "center", marginTop: 16 }}
                    >
                      <Scale size={14} /> Override Priority
                    </button>
                  </div>

                  {/* Right Column: Contributing Factors Breakdown */}
                  <div>
                    <h4 style={{ margin: "0 0 10px 0", color: "#14462b" }}>
                      Contributing Factor Breakdown ({inspectedRisk.contributing_factors?.length || 0} signals)
                    </h4>

                    <div style={{ background: "#f8faf9", padding: 12, borderRadius: 8, fontSize: 13, color: "#1f3729", marginBottom: 16 }}>
                      <strong>Summary:</strong> {inspectedRisk.explanation_summary}
                    </div>

                    <table className="intel-factors-table">
                      <thead>
                        <tr>
                          <th>Factor</th>
                          <th>Category</th>
                          <th>Points</th>
                          <th>Justification Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(inspectedRisk.contributing_factors || []).map((factor, fIdx) => (
                          <tr key={fIdx}>
                            <td style={{ fontWeight: 600 }}>{factor.name}</td>
                            <td>
                              <span style={{ fontSize: 11, background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>
                                {factor.category}
                              </span>
                            </td>
                            <td>
                              <span className="intel-points-pill">+{factor.points}</span>
                            </td>
                            <td style={{ color: "#475569" }}>{factor.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Fairness Assurances */}
                    <div className="intel-notice-banner intel-notice-success" style={{ marginTop: 20 }}>
                      <CheckCircle size={18} style={{ flexShrink: 0 }} />
                      <div>
                        <strong>Fairness Guarantees Active:</strong> Zero penalty applied for unlisted roadside vendor status.
                        Zero penalty applied for vernacular languages (Marathi/Hindi). Zero penalty for missing optional photo
                        receipts. Genuine public health allegations are prioritized objectively.
                      </div>
                    </div>

                    {/* Uncertainty Disclosures */}
                    <div className="intel-notice-banner intel-notice-info" style={{ marginTop: 12 }}>
                      <Info size={18} style={{ flexShrink: 0 }} />
                      <div>
                        <strong>Scientific Limitations Disclosure:</strong> {inspectedRisk.uncertainty_limitations}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Override Modal */}
            {overrideModalOpen && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(0,0,0,0.45)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 2000,
                  padding: 20,
                }}
              >
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: 14,
                    padding: 24,
                    maxWidth: 480,
                    width: "100%",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                  }}
                >
                  <h3 style={{ margin: "0 0 8px 0", color: "#14462b" }}>
                    Authorized Priority Override
                  </h3>
                  <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 16px 0" }}>
                    Modify triage urgency based on field evidence or laboratory reports. A mandatory justification must be documented.
                  </p>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>Target Priority</label>
                    <select
                      value={overridePriorityInput}
                      onChange={(e) => setOverridePriorityInput(e.target.value)}
                      style={{
                        width: "100%",
                        padding: 8,
                        borderRadius: 6,
                        border: "1px solid #cbdcd1",
                        fontSize: 13,
                        marginTop: 4,
                      }}
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>Documented Justification (Required)</label>
                    <textarea
                      value={overrideReasonInput}
                      onChange={(e) => setOverrideReasonInput(e.target.value)}
                      rows={3}
                      placeholder="e.g. Field inspection confirmed toxic adulteration; escalating urgency..."
                      style={{
                        width: "100%",
                        padding: 8,
                        borderRadius: 6,
                        border: "1px solid #cbdcd1",
                        fontSize: 13,
                        marginTop: 4,
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                    <button
                      className="intel-btn-action intel-btn-dismiss"
                      onClick={() => setOverrideModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="intel-btn-action intel-btn-related"
                      onClick={handleOverridePriority}
                    >
                      Record Override
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 5: TREND ANALYTICS
           ======================================================== */}
        {activeTab === "trends" && (
          <div>
            <div className="intel-card">
              <div className="intel-card-header">
                <div>
                  <h3 className="intel-card-title">
                    <BarChart2 size={20} /> Food Safety Grievance Trends
                  </h3>
                  <div className="intel-card-desc">
                    Aggregated grievance distribution by category, listing type, and investigation outcomes.
                  </div>
                </div>
              </div>

              {!trendsData ? (
                <div className="intel-empty-state">
                  <BarChart2 size={40} color="#94a3b8" style={{ margin: "0 auto 12px" }} />
                  <h3>No Trend Data Available</h3>
                  <p>Insufficient complaints recorded to generate statistical distribution.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
                  {/* Category Breakdown */}
                  <div>
                    <h4 style={{ color: "#14462b", marginBottom: 16 }}>Grievances by Category</h4>
                    {trendsData.by_category && trendsData.by_category.length > 0 ? (
                      trendsData.by_category.map((item, idx) => {
                        const maxVal = Math.max(...trendsData.by_category.map((c) => c.count), 1);
                        const pct = Math.round((item.count / maxVal) * 100);
                        return (
                          <div key={idx} className="intel-trend-bar-row">
                            <div className="intel-trend-bar-header">
                              <span>{item.category}</span>
                              <span>{item.count} reports</span>
                            </div>
                            <div className="intel-trend-bar-track">
                              <div className="intel-trend-bar-fill" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p style={{ color: "#94a3b8", fontSize: 13 }}>No category records.</p>
                    )}
                  </div>

                  {/* Status Breakdown */}
                  <div>
                    <h4 style={{ color: "#14462b", marginBottom: 16 }}>Investigation Statuses</h4>
                    {trendsData.by_status && trendsData.by_status.length > 0 ? (
                      trendsData.by_status.map((item, idx) => {
                        const maxVal = Math.max(...trendsData.by_status.map((s) => s.count), 1);
                        const pct = Math.round((item.count / maxVal) * 100);
                        return (
                          <div key={idx} className="intel-trend-bar-row">
                            <div className="intel-trend-bar-header">
                              <span>{item.status}</span>
                              <span>{item.count} cases</span>
                            </div>
                            <div className="intel-trend-bar-track">
                              <div
                                className="intel-trend-bar-fill"
                                style={{
                                  width: `${pct}%`,
                                  background: item.status.includes("VERIFIED")
                                    ? "#0284c7"
                                    : item.status.includes("RESOLVED")
                                    ? "#16a34a"
                                    : "#ea580c",
                                }}
                              />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p style={{ color: "#94a3b8", fontSize: 13 }}>No status records.</p>
                    )}
                  </div>

                  {/* Seller Type Breakdown */}
                  <div>
                    <h4 style={{ color: "#14462b", marginBottom: 16 }}>Seller Listing Distribution</h4>
                    {trendsData.by_seller_type && trendsData.by_seller_type.length > 0 ? (
                      trendsData.by_seller_type.map((item, idx) => {
                        const maxVal = Math.max(...trendsData.by_seller_type.map((s) => s.count), 1);
                        const pct = Math.round((item.count / maxVal) * 100);
                        return (
                          <div key={idx} className="intel-trend-bar-row">
                            <div className="intel-trend-bar-header">
                              <span>{item.listing_type === "UNLISTED" ? "Roadside / Unlisted Stalls" : "Registered Establishments"}</span>
                              <span>{item.count} complaints</span>
                            </div>
                            <div className="intel-trend-bar-track">
                              <div
                                className="intel-trend-bar-fill"
                                style={{
                                  width: `${pct}%`,
                                  background: item.listing_type === "UNLISTED" ? "#8b5cf6" : "#16a34a",
                                }}
                              />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p style={{ color: "#94a3b8", fontSize: 13 }}>No seller records.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
