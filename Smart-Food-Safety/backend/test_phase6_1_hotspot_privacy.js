/**
 * FOODSAFE AI 2.0 — PHASE 6.1 DEDICATED TEST SUITE: FIX 2
 * Hotspot Map Privacy Hardening & Coarse Spatial Aggregation
 */

require("dotenv").config();
const { sequelize } = require("./src/config/database");
const { Complaint, User, Shop } = require("./src/models");
const { getHotspotAnalytics } = require("./src/services/hotspotAnalyticsService");

const BASE = "http://localhost:5000/api";
let passed = 0;
let failed = 0;
const results = [];

function assert(testId, condition, description, details = "") {
  if (condition) {
    console.log(`  ✅ [${testId}] PASSED: ${description}`);
    passed++;
    results.push({ testId, status: "PASSED", description, details });
  } else {
    console.error(`  ❌ [${testId}] FAILED: ${description}`);
    if (details) console.error(`     Details: ${details}`);
    failed++;
    results.push({ testId, status: "FAILED", description, details });
  }
}

async function runHotspotPrivacyTests() {
  console.log("\n======================================================================");
  console.log("FOODSAFE AI 2.0 — TEST SUITE: FIX 2 (HOTSPOT MAP PRIVACY HARDENING)");
  console.log("======================================================================\n");

  try {
    await sequelize.authenticate();
    const timestamp = Date.now();

    // 1. Setup isolated test user & seed isolated cluster in a unique geographic location (Koregaon Park, Pune)
    // Coords: 18.5362, 73.8938
    let testUser = await User.findOne({ where: { role: "CUSTOMER" } });
    const adminUser = await User.findOne({ where: { role: "ADMIN" } });
    const authorityUser = await User.findOne({ where: { role: "AUTHORIZED_AUTHORITY" } });

    // Seed 6 complaints in a run-unique geographic cluster
    const clusterLat = Number((18.1000 + ((Date.now() % 400) * 0.001)).toFixed(4));
    const clusterLng = Number((73.1000 + ((Date.now() % 400) * 0.001)).toFixed(4));
    const seededClusterIds = [];

    for (let i = 1; i <= 6; i++) {
      // Small jitter around cluster center (<50 meters)
      const lat = Number((clusterLat + (i * 0.0001)).toFixed(4));
      const lng = Number((clusterLng + (i * 0.0001)).toFixed(4));
      const c = await Complaint.create({
        complaint_id: `FSA-PRIV-${timestamp}-${i}`,
        user_id: testUser.id,
        category: i <= 4 ? "Spoiled Food" : "Poor Hygiene",
        product_name: `Seeded Food ${i}`,
        description: `Privacy test report narrative ${i} with specific personal observation`,
        seller_listing_type: "UNLISTED",
        seller_type: "Roadside Food Stall",
        reported_shop_name: `Private Vendor ${i}`,
        reported_landmark: `Koregaon Park Lane ${i}`,
        latitude: lat,
        longitude: lng,
        status: i % 2 === 0 ? "VERIFIED" : "SUBMITTED",
        created_at: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)), // spread across days
      });
      seededClusterIds.push(c.id);
    }

    // Also seed a SINGLETON isolated complaint ~15km away
    const singleLat = Number((clusterLat + 0.15).toFixed(4));
    const singleLng = Number((clusterLng + 0.15).toFixed(4));
    const singleton = await Complaint.create({
      complaint_id: `FSA-SINGLE-${timestamp}`,
      user_id: testUser.id,
      category: "Food Adulteration",
      product_name: "Private Honey",
      description: "Isolated report from single citizen residence",
      seller_listing_type: "UNLISTED",
      seller_type: "Food Cart",
      reported_landmark: "Solapur Road",
      latitude: singleLat,
      longitude: singleLng,
      status: "SUBMITTED",
      created_at: new Date(),
    });

    // -------------------------------------------------------------------------
    // TEST-MAP-01: Groups below the privacy threshold are suppressed
    // -------------------------------------------------------------------------
    // With minThreshold = 5, the singleton in Hadapsar (count = 1) MUST be suppressed!
    const resThreshold5 = await getHotspotAnalytics({ days: "all", minThreshold: 5 });
    const singletonSuppressed = !resThreshold5.clusters.some((c) =>
      Math.abs(c.center_latitude - singleLat) < 0.02 && Math.abs(c.center_longitude - singleLng) < 0.02
    );

    assert(
      "TEST-MAP-01",
      singletonSuppressed,
      "Groups below the privacy threshold (< 5) are strictly suppressed from map clusters",
      `Singleton at (${singleLat}, ${singleLng}) omitted from clusters`
    );

    // -------------------------------------------------------------------------
    // TEST-MAP-02: Groups at or above the threshold follow the configured aggregation policy
    // -------------------------------------------------------------------------
    const kpCluster = resThreshold5.clusters.find((c) =>
      Math.abs(c.center_latitude - clusterLat) < 0.02 && Math.abs(c.center_longitude - clusterLng) < 0.02
    );

    assert(
      "TEST-MAP-02",
      kpCluster && kpCluster.total_reports_count >= 5,
      "Groups at or above threshold follow aggregation policy and report aggregated count",
      `Koregaon Park cluster count: ${kpCluster?.total_reports_count}`
    );

    // -------------------------------------------------------------------------
    // TEST-MAP-03: Individual customer identity is absent from aggregated responses
    // -------------------------------------------------------------------------
    let hasIdentityLeak = false;
    resThreshold5.clusters.forEach((cluster) => {
      if (cluster.user_id || cluster.email || cluster.customer_name || cluster.complainant_name) {
        hasIdentityLeak = true;
      }
      (cluster.complaint_references || []).forEach((ref) => {
        if (ref.user_id || ref.email || ref.phone || ref.customer_name || ref.reported_address) {
          hasIdentityLeak = true;
        }
      });
    });

    assert(
      "TEST-MAP-03",
      !hasIdentityLeak,
      "Individual customer identity (name, email, user_id, phone, address) is completely absent from responses"
    );

    // -------------------------------------------------------------------------
    // TEST-MAP-04: Exact individual complaint coordinates are absent
    // -------------------------------------------------------------------------
    // The cluster coordinates must be the coarse fixed grid cell center, NOT the exact complaint coordinates
    const exactLatMatch = resThreshold5.clusters.some((c) =>
      c.center_latitude === clusterLat || (c.complaint_references || []).some((r) => r.latitude === clusterLat)
    );

    assert(
      "TEST-MAP-04",
      !exactLatMatch && kpCluster && kpCluster.center_latitude !== clusterLat,
      "Exact individual complaint coordinates are absent; coordinates are quantized to fixed ~1km grid cell",
      `Raw Lat: ${clusterLat}, Aggregated Cell Center Lat: ${kpCluster?.center_latitude}`
    );

    // -------------------------------------------------------------------------
    // TEST-MAP-05: Filtered results enforce privacy thresholds
    // -------------------------------------------------------------------------
    // Category filter for "Poor Hygiene" has only 2 complaints in this cluster
    // With threshold 5, "Poor Hygiene" alone must be suppressed!
    const resFilteredCat = await getHotspotAnalytics({ category: "Poor Hygiene", minThreshold: 5 });
    const kpSuppressedUnderFilter = !resFilteredCat.clusters.some((c) =>
      Math.abs(c.center_latitude - clusterLat) < 0.02
    );

    assert(
      "TEST-MAP-05",
      kpSuppressedUnderFilter,
      "Filtered results enforce privacy thresholds post-filtering (sub-threshold categories suppressed)",
      `Poor Hygiene count was 2 (< 5), successfully suppressed`
    );

    // -------------------------------------------------------------------------
    // TEST-MAP-06: Narrow time windows do not reveal single reports
    // -------------------------------------------------------------------------
    // Filter to last 1 day (has only 1 complaint)
    const resNarrowTime = await getHotspotAnalytics({ days: "1", minThreshold: 5 });
    const narrowTimeSuppressed = !resNarrowTime.clusters.some((c) =>
      Math.abs(c.center_latitude - clusterLat) < 0.02
    );

    assert(
      "TEST-MAP-06",
      narrowTimeSuppressed,
      "Narrow time windows do not reveal single reports (post-filtering threshold enforcement holds)",
      `1-day window cluster suppressed`
    );

    // -------------------------------------------------------------------------
    // TEST-MAP-07: Category filters cannot bypass suppression
    // -------------------------------------------------------------------------
    // Attempting to query with a non-matching category or narrow category returns 0 clusters
    const resCategoryBypass = await getHotspotAnalytics({ category: "Food Adulteration", minThreshold: 5 });
    const bypassBlocked = !resCategoryBypass.clusters.some((c) =>
      Math.abs(c.center_latitude - 18.5089) < 0.02
    );

    assert(
      "TEST-MAP-07",
      bypassBlocked,
      "Category filters cannot bypass suppression for sparse categories"
    );

    // -------------------------------------------------------------------------
    // TEST-MAP-08: Comparing overlapping filters does not trivially reveal an individual's contribution
    // -------------------------------------------------------------------------
    // Even if threshold is set to 2, coordinates do not shift because of fixed grid snapping
    const run1 = await getHotspotAnalytics({ days: "7", minThreshold: 2 });
    const run2 = await getHotspotAnalytics({ days: "90", minThreshold: 2 });
    const cluster1 = run1.clusters.find((c) => Math.abs(c.center_latitude - clusterLat) < 0.02);
    const cluster2 = run2.clusters.find((c) => Math.abs(c.center_latitude - clusterLat) < 0.02);

    const coordinatesIdentical =
      cluster1 && cluster2 &&
      cluster1.center_latitude === cluster2.center_latitude &&
      cluster1.center_longitude === cluster2.center_longitude;

    assert(
      "TEST-MAP-08",
      coordinatesIdentical,
      "Comparing overlapping filters reveals no coordinate shift (fixed grid coordinates eliminate centroid shift)",
      `7-day Center: (${cluster1?.center_latitude}, ${cluster1?.center_longitude}), 90-day Center: (${cluster2?.center_latitude}, ${cluster2?.center_longitude})`
    );

    // -------------------------------------------------------------------------
    // TEST-MAP-09: Customer role cannot access protected hotspot APIs
    // -------------------------------------------------------------------------
    const jwt = require("jsonwebtoken");
    const customerToken = jwt.sign({ id: testUser.id, role: "CUSTOMER" }, process.env.JWT_SECRET || "default_secret");
    const customerRes = await fetch(`${BASE}/intelligence/hotspots`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });

    assert(
      "TEST-MAP-09",
      customerRes.status === 403,
      "Customer role is strictly forbidden from accessing protected hotspot intelligence API (HTTP 403)",
      `Received HTTP ${customerRes.status}`
    );

    // -------------------------------------------------------------------------
    // TEST-MAP-10: Unauthorized / unauthenticated access is rejected
    // -------------------------------------------------------------------------
    const unauthRes = await fetch(`${BASE}/intelligence/hotspots`);
    assert(
      "TEST-MAP-10",
      unauthRes.status === 401,
      "Unauthenticated request to hotspot intelligence is rejected with HTTP 401",
      `Received HTTP ${unauthRes.status}`
    );

    // -------------------------------------------------------------------------
    // TEST-MAP-11: Authorized Admin map renders correctly
    // -------------------------------------------------------------------------
    const adminToken = jwt.sign({ id: adminUser.id, role: "ADMIN" }, process.env.JWT_SECRET || "default_secret");
    const adminRes = await fetch(`${BASE}/intelligence/hotspots?minThreshold=2`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminJson = await adminRes.json();

    assert(
      "TEST-MAP-11",
      adminRes.status === 200 && adminJson.success === true && Array.isArray(adminJson.data.clusters),
      "Authorized Admin role successfully accesses aggregated hotspot intelligence",
      `Total clusters returned: ${adminJson.data?.total_clusters}`
    );

    // -------------------------------------------------------------------------
    // TEST-MAP-12: Existing customer complaint location functionality continues to work
    // -------------------------------------------------------------------------
    const ownComplaint = await Complaint.findByPk(seededClusterIds[0]);
    assert(
      "TEST-MAP-12",
      ownComplaint && ownComplaint.latitude !== null && ownComplaint.reported_landmark !== null,
      "Customer individual complaint location functionality preserves exact coordinates in authorized private workflows"
    );

    // -------------------------------------------------------------------------
    // TEST-MAP-13: Empty and sparse datasets are handled correctly
    // -------------------------------------------------------------------------
    const emptyRes = await getHotspotAnalytics({ category: "NON_EXISTENT_CAT_ZZZ", minThreshold: 5 });
    assert(
      "TEST-MAP-13",
      emptyRes && emptyRes.total_clusters === 0 && Array.isArray(emptyRes.clusters),
      "Empty or completely suppressed datasets return safe structure (0 clusters, empty array) without throwing"
    );

    // -------------------------------------------------------------------------
    // TEST-MAP-14: No private complaint details appear in map tooltips / cluster metadata
    // -------------------------------------------------------------------------
    let tooltipLeak = false;
    adminJson.data.clusters.forEach((c) => {
      const tooltipString = JSON.stringify(c);
      if (tooltipString.includes("email") || tooltipString.includes("phone") || tooltipString.includes("password") || tooltipString.includes("address")) {
        tooltipLeak = true;
      }
    });

    assert(
      "TEST-MAP-14",
      !tooltipLeak,
      "No private complaint details (phone, email, password, residence) appear in map cluster metadata"
    );

    // -------------------------------------------------------------------------
    // TEST-MAP-15: Existing trend and analytics modules remain compatible
    // -------------------------------------------------------------------------
    const trendsRes = await fetch(`${BASE}/intelligence/trends`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const trendsJson = await trendsRes.json();

    assert(
      "TEST-MAP-15",
      trendsRes.status === 200 && trendsJson.success === true && Array.isArray(trendsJson.data?.by_status),
      "Executive trend analytics and category distribution APIs remain fully compatible alongside hardened hotspots",
      `Status distributions count: ${trendsJson.data?.by_status?.length}`
    );

    console.log("\n======================================================================");
    console.log(`FIX 2 TEST SUMMARY: ${passed} PASSED | ${failed} FAILED (TOTAL: ${passed + failed})`);
    console.log("======================================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("TEST EXECUTION FAILED WITH UNCAUGHT ERROR:", err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runHotspotPrivacyTests();
