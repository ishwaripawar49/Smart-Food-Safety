const { Complaint, Shop } = require("../models");
const { Op } = require("sequelize");
const { calculateHaversineDistanceMeters } = require("./duplicateDetectionService");

/**
 * Cluster radius threshold in meters (~600m neighbourhood ward cluster)
 */
const CLUSTER_RADIUS_METERS = 650;

const DEFAULT_MIN_HOTSPOT_GROUP_SIZE = parseInt(process.env.MIN_HOTSPOT_GROUP_SIZE, 10) || 2;
const GRID_LAT_STEP = 0.009; // ~1km latitude step

/**
 * Snap raw coordinates to a deterministic, fixed ~1km geographic grid cell.
 * Prevents centroid shifting and exact location re-identification.
 */
function getQuantizedGridCell(avgLat, avgLng) {
  const numLat = Number(avgLat);
  const numLng = Number(avgLng);
  const latIndex = Math.floor(numLat / GRID_LAT_STEP);
  const cellCenterLat = Number(((latIndex + 0.5) * GRID_LAT_STEP).toFixed(4));

  const latRad = (cellCenterLat * Math.PI) / 180;
  const cosLat = Math.max(0.2, Math.cos(latRad));
  const gridLngStep = Number((GRID_LAT_STEP / cosLat).toFixed(6));
  const lngIndex = Math.floor(numLng / gridLngStep);
  const cellCenterLng = Number(((lngIndex + 0.5) * gridLngStep).toFixed(4));

  return {
    cellId: `HOTSPOT-GRID-${latIndex}-${lngIndex}`,
    centerLatitude: cellCenterLat,
    centerLongitude: cellCenterLng,
    radiusMeters: 850,
  };
}

/**
 * Generate privacy-preserving, spatially aggregated hotspot clusters for authorized reviewers.
 *
 * @param {object} filterOptions
 * @param {string|number} filterOptions.days - Time window in days (7, 30, 90, or 'all')
 * @param {string} filterOptions.category - Filter by grievance category
 * @param {string} filterOptions.status - Filter by complaint status (e.g., 'VERIFIED' vs all)
 * @param {number} filterOptions.minThreshold - Minimum grouping threshold to suppress unsafe small groups
 * @returns {Promise<object>} Hotspot analytics summary & cluster list
 */
async function getHotspotAnalytics(filterOptions = {}) {
  const { days = "all", category = "", status = "" } = filterOptions;

  const effectiveMinThreshold =
    filterOptions.minThreshold !== undefined
      ? Math.max(1, parseInt(filterOptions.minThreshold, 10) || 1)
      : DEFAULT_MIN_HOTSPOT_GROUP_SIZE;

  const whereConditions = {
    latitude: { [Op.ne]: null },
    longitude: { [Op.ne]: null },
  };

  // Time-window filter
  if (days && days !== "all") {
    const numDays = parseInt(days, 10);
    if (!isNaN(numDays) && numDays > 0) {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - numDays);
      whereConditions.created_at = { [Op.gte]: sinceDate };
    }
  }

  // Category filter
  if (category && category.trim()) {
    whereConditions.category = category.trim();
  }

  // Status filter (e.g. verified vs reported)
  if (status && status.trim()) {
    if (status.toUpperCase() === "VERIFIED") {
      whereConditions.status = { [Op.in]: ["VERIFIED", "INVESTIGATION", "RESOLVED"] };
    } else if (status.toUpperCase() === "REPORTED") {
      whereConditions.status = { [Op.in]: ["SUBMITTED", "UNDER_REVIEW"] };
    } else {
      whereConditions.status = status.trim();
    }
  }

  const complaints = await Complaint.findAll({
    where: whereConditions,
    attributes: [
      "id",
      "complaint_id",
      "latitude",
      "longitude",
      "category",
      "product_name",
      "status",
      "priority",
      "risk_score",
      "seller_listing_type",
      "seller_type",
      "reported_shop_name",
      "reported_landmark",
      "created_at",
      "shop_id",
    ],
    include: [{ model: Shop, as: "shop", attributes: ["id", "shop_name", "city"], required: false }],
    order: [["created_at", "DESC"]],
  });

  if (complaints.length === 0) {
    return {
      total_complaints_with_coords: 0,
      total_clusters: 0,
      privacy_threshold: effectiveMinThreshold,
      aggregation_resolution: "Coarse ~1km fixed geographic grid cell",
      filter_applied: { days, category, status, minThreshold: effectiveMinThreshold },
      clusters: [],
      terminology_notice:
        "All clusters represent Reported Concerns and Complaint Concentrations for administrative review. " +
        "They do not constitute judicial proof of food safety violations.",
    };
  }

  // Spatial clustering algorithm
  const visited = new Set();
  const clusters = [];

  for (let i = 0; i < complaints.length; i++) {
    if (visited.has(complaints[i].id)) continue;

    const clusterMembers = [complaints[i]];
    visited.add(complaints[i].id);

    for (let j = i + 1; j < complaints.length; j++) {
      if (visited.has(complaints[j].id)) continue;

      const dist = calculateHaversineDistanceMeters(
        complaints[i].latitude,
        complaints[i].longitude,
        complaints[j].latitude,
        complaints[j].longitude
      );

      if (dist !== null && dist <= CLUSTER_RADIUS_METERS) {
        clusterMembers.push(complaints[j]);
        visited.add(complaints[j].id);
      }
    }

    // Apply minimum grouping threshold for privacy protection (post-filtering)
    if (clusterMembers.length < effectiveMinThreshold) {
      continue;
    }

    // Calculate centroid of member reports
    const avgLat =
      clusterMembers.reduce((sum, c) => sum + Number(c.latitude), 0) / clusterMembers.length;
    const avgLng =
      clusterMembers.reduce((sum, c) => sum + Number(c.longitude), 0) / clusterMembers.length;

    // Privacy Safeguard: Snap cluster coordinates to coarse, fixed ~1km grid cell
    // Completely obscures exact citizen addresses, individual shop coordinates, and centroid shifting
    const gridCell = getQuantizedGridCell(avgLat, avgLng);

    // Calculate cluster metrics
    let verifiedCount = 0;
    let reportedCount = 0;
    let investigationCount = 0;
    let totalRisk = 0;
    const categoryCounts = {};
    const sellerNames = new Set();
    const landmarks = [];

    clusterMembers.forEach((member) => {
      const st = String(member.status).toUpperCase();
      if (["VERIFIED", "RESOLVED"].includes(st)) {
        verifiedCount++;
      } else if (st === "INVESTIGATION") {
        investigationCount++;
      } else {
        reportedCount++;
      }

      totalRisk += Number(member.risk_score || 0);

      const cat = member.category || "General";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

      if (member.shop?.shop_name) sellerNames.add(member.shop.shop_name);
      if (member.reported_shop_name) sellerNames.add(member.reported_shop_name);
      if (member.reported_landmark) landmarks.push(member.reported_landmark);
    });

    const avgRiskScore = Math.round(totalRisk / clusterMembers.length);

    let severityLevel = "LOW";
    if (avgRiskScore >= 70) severityLevel = "CRITICAL";
    else if (avgRiskScore >= 50) severityLevel = "HIGH";
    else if (avgRiskScore >= 30) severityLevel = "MEDIUM";

    // Primary category
    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "General";

    // Generalized area landmark label
    const primaryLandmark =
      landmarks[0] ||
      (sellerNames.size > 0 ? Array.from(sellerNames)[0] : "Reported Food Zone");

    clusters.push({
      cluster_id: gridCell.cellId,
      center_latitude: gridCell.centerLatitude,
      center_longitude: gridCell.centerLongitude,
      radius_meters: gridCell.radiusMeters,
      total_reports_count: clusterMembers.length,
      reported_concern_count: reportedCount,
      verified_finding_count: verifiedCount,
      under_investigation_count: investigationCount,
      repeated_reports: clusterMembers.length >= 2,
      review_priority: severityLevel,
      average_risk_score: avgRiskScore,
      predominant_category: topCategory,
      category_breakdown: categoryCounts,
      approximate_area_label: primaryLandmark,
      associated_sellers_count: sellerNames.size,
      privacy_safeguard:
        "Spatially aggregated over coarse ~1km geographic grid. Specific complainant identities, personal contact information, and exact coordinates are strictly omitted.",
      // Anonymized reference entries for authorized administrative review (PII completely redacted)
      complaint_references: clusterMembers.map((m) => ({
        complaint_id: m.complaint_id,
        category: m.category,
        status: m.status,
        priority: m.priority,
      })),
    });
  }

  // Sort clusters by priority and complaint count
  clusters.sort((a, b) => b.total_reports_count - a.total_reports_count || b.average_risk_score - a.average_risk_score);

  return {
    total_complaints_with_coords: complaints.length,
    total_clusters: clusters.length,
    privacy_threshold: effectiveMinThreshold,
    aggregation_resolution: "Coarse ~1km fixed geographic grid cell",
    filter_applied: { days, category, status, minThreshold: effectiveMinThreshold },
    clusters,
    terminology_notice:
      "All clusters represent Reported Concerns and Complaint Concentrations for administrative review. " +
      "They do not constitute judicial proof of food safety violations.",
  };
}

module.exports = {
  getHotspotAnalytics,
  CLUSTER_RADIUS_METERS,
};
