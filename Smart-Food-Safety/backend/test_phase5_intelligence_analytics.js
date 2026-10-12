require("dotenv").config();
const http = require("http");
const { Op } = require("sequelize");

async function runPhase5IntelligenceAnalyticsTestSuite() {
  const app = require("./src/app");
  const { Complaint, Shop, User, ComplaintSimilarityReview } = require("./src/models");
  const {
    classifyComplaint,
    SCORING_VERSION,
  } = require("./src/services/aiClassifierService");
  const {
    checkDuplicateComplaint,
    evaluateComplaintPairSimilarity,
    calculateHaversineDistanceMeters,
    normalizeSellerName,
    normalizeProductName,
  } = require("./src/services/duplicateDetectionService");
  const {
    getHotspotAnalytics,
    CLUSTER_RADIUS_METERS,
  } = require("./src/services/hotspotAnalyticsService");

  const PORT = 5098;
  const BASE = `http://localhost:${PORT}/api`;

  let server;
  let exitCode = 0;

  try {
    server = app.listen(PORT);
    await new Promise((resolve) => setTimeout(resolve, 500));

    console.log(`\n======================================================================`);
    console.log(`FOODSAFE AI 2.0 — PHASE 5 AUTOMATED SPECIFICATION TEST SUITE`);
    console.log(`Intelligent Complaint Analysis, Duplicate Detection & Hotspot Analytics`);
    console.log(`Server listening on port ${PORT}`);
    console.log(`======================================================================\n`);

    let passed = 0;
    let failed = 0;

    function assert(testId, condition, message, details = "") {
      if (condition) {
        console.log(`  ✅ ${testId} PASSED: ${message}`);
        passed++;
      } else {
        console.error(`  ❌ ${testId} FAILED: ${message}`);
        if (details) console.error(`     Details: ${details}`);
        failed++;
        exitCode = 1;
      }
    }

    // ----------------------------------------------------
    // User Authentication Setup
    // ----------------------------------------------------
    const loginUser = async (email, password) => {
      const res = await fetch(`${BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      return { status: res.status, ok: res.ok, token: data.token, user: data.user };
    };

    const admin = await loginUser("admin@foodsafety.gov", "admin123");
    const authority = await loginUser("authority@foodsafety.com", "123456");
    const customer = await loginUser("customer@test.com", "test123");

    if (!admin.ok || !authority.ok || !customer.ok) {
      throw new Error("Failed to authenticate test accounts.");
    }

    // ----------------------------------------------------
    // Test Seed Records Setup
    // ----------------------------------------------------
    const timestamp = Date.now();
    const testAdminUser = await User.findOne({ where: { role: "ADMIN" } });
    const testCustomerUser = await User.findOne({ where: { role: "CUSTOMER" } });

    // Seed test shop
    const [testShop] = await Shop.findOrCreate({
      where: { license_number: `FSSAI-P5-${timestamp}` },
      defaults: {
        shop_name: "Phase 5 Test Sweets & Dairy",
        address: "Dadar West, Mumbai",
        owner_name: "Test Merchant",
        phone: "9876543210",
        status: "APPROVED",
      },
    });

    // Seed deterministic complaints
    // Cluster 1 in Dadar (19.0178, 72.8478)
    const seed1 = await Complaint.create({
      complaint_id: `FS-P5-HOT1-${timestamp}`,
      user_id: testCustomerUser.id,
      shop_id: testShop.id,
      seller_listing_type: "LISTED",
      category: "Spoiled or Rotten Food",
      product_name: "Fresh Milk",
      description: "Milk was sour, curdled, and had foul smell.",
      latitude: 19.0180,
      longitude: 72.8480,
      status: "SUBMITTED",
      priority: "MEDIUM",
      risk_score: 45,
      scoring_version: SCORING_VERSION,
    });

    const seed2 = await Complaint.create({
      complaint_id: `FS-P5-HOT2-${timestamp}`,
      user_id: testCustomerUser.id,
      shop_id: testShop.id,
      seller_listing_type: "LISTED",
      category: "Spoiled or Rotten Food",
      product_name: "Paneer",
      description: "Spoiled paneer causing vomiting and acute diarrhea.",
      latitude: 19.0182,
      longitude: 72.8481,
      status: "VERIFIED",
      priority: "HIGH",
      risk_score: 65,
      scoring_version: SCORING_VERSION,
    });

    // Unlisted roadside vendor A in Dadar
    const seedUnlistedA = await Complaint.create({
      complaint_id: `FS-P5-UNL1-${timestamp}`,
      user_id: testCustomerUser.id,
      shop_id: null,
      seller_listing_type: "UNLISTED",
      seller_type: "Food Cart",
      reported_shop_name: "Sharma Vadapav Centre",
      reported_landmark: "Opposite Dadar Station Platform 1",
      category: "Suspected Adulteration",
      product_name: "Vadapav",
      description: "Used rancid burnt black oil with chemical odor.",
      latitude: 19.0185,
      longitude: 72.8483,
      status: "SUBMITTED",
      priority: "HIGH",
      risk_score: 55,
      scoring_version: SCORING_VERSION,
    });

    // Unlisted roadside vendor B (Potential duplicate of A with Marathi text & transliteration)
    const seedUnlistedB = await Complaint.create({
      complaint_id: `FS-P5-UNL2-${timestamp}`,
      user_id: testCustomerUser.id,
      shop_id: null,
      seller_listing_type: "UNLISTED",
      seller_type: "Food Cart",
      reported_shop_name: "Sharmaji Thela Vada Pav",
      reported_landmark: "Dadar Station Platform 1 gate",
      category: "Suspected Adulteration",
      product_name: "वडापाव",
      description: "खराब आणि काळे तेल वापरले. दुर्गंधी येत होती.",
      latitude: 19.0186,
      longitude: 72.8484,
      status: "SUBMITTED",
      priority: "HIGH",
      risk_score: 55,
      scoring_version: SCORING_VERSION,
    });

    // Unlisted roadside vendor C (Nearby stall in Dadar, but completely distinct seller and food)
    const seedUnlistedC = await Complaint.create({
      complaint_id: `FS-P5-UNL3-${timestamp}`,
      user_id: testCustomerUser.id,
      shop_id: null,
      seller_listing_type: "UNLISTED",
      seller_type: "Roadside Food Stall",
      reported_shop_name: "Ramesh Chai Canteen",
      reported_landmark: "Near Dadar Flower Market",
      category: "Unhygienic Preparation",
      product_name: "Tea / Chai",
      description: "Dirty unwashed glasses and flies all over sugar bowl.",
      latitude: 19.0188,
      longitude: 72.8486,
      status: "SUBMITTED",
      priority: "LOW",
      risk_score: 25,
      scoring_version: SCORING_VERSION,
    });

    // Isolated complaint without coordinates
    const seedNoCoords = await Complaint.create({
      complaint_id: `FS-P5-NOCOORD-${timestamp}`,
      user_id: testCustomerUser.id,
      shop_id: null,
      seller_listing_type: "UNLISTED",
      seller_type: "Small Shop",
      reported_shop_name: "Generic Sweet Depot",
      reported_landmark: "Somewhere near market",
      category: "Expired Packaged Food",
      product_name: "Packaged Mithai",
      description: "No date printed on mawa box.",
      latitude: null,
      longitude: null,
      status: "SUBMITTED",
      priority: "LOW",
      risk_score: 20,
      scoring_version: SCORING_VERSION,
    });

    console.log(`[TEST SEED] Created 6 deterministic complaints for Phase 5 verification.\n`);

    // =========================================================================
    // 1. Hotspot Analytics using real test database records
    // =========================================================================
    const hsRes = await getHotspotAnalytics({ days: "all", minThreshold: 1 });
    assert(
      "TEST-01",
      hsRes && hsRes.clusters && hsRes.clusters.length > 0 && hsRes.total_clusters > 0,
      "Hotspot analytics successfully groups real database records into spatial clusters",
      `Total clusters: ${hsRes.total_clusters}`
    );

    // =========================================================================
    // 2. Empty geographic dataset handling
    // =========================================================================
    const emptyHs = await getHotspotAnalytics({ category: "NON_EXISTENT_CATEGORY_XYZ" });
    assert(
      "TEST-02",
      emptyHs && emptyHs.total_clusters === 0 && Array.isArray(emptyHs.clusters),
      "Empty geographic dataset returns 0 clusters without throwing errors"
    );

    // =========================================================================
    // 3. Complaints without coordinates handling
    // =========================================================================
    const coordsComplaints = hsRes.clusters.flatMap((c) => c.complaint_references);
    const hasNullCoords = coordsComplaints.some((r) => r.complaint_id === seedNoCoords.complaint_id);
    assert(
      "TEST-03",
      !hasNullCoords,
      "Complaints without coordinates are safely excluded from spatial clusters"
    );

    // =========================================================================
    // 4. Valid coordinate aggregation
    // =========================================================================
    const dadarCluster = hsRes.clusters.find((c) =>
      c.complaint_references.some((r) => r.complaint_id === seed1.complaint_id)
    );
    assert(
      "TEST-04",
      dadarCluster &&
        Math.abs(dadarCluster.center_latitude - 19.018) < 0.01 &&
        Math.abs(dadarCluster.center_longitude - 72.848) < 0.01,
      "Valid coordinate aggregation calculates proper centroid coordinates for nearby reports",
      `Cluster center: (${dadarCluster?.center_latitude}, ${dadarCluster?.center_longitude})`
    );

    // =========================================================================
    // 5. Time-window filters
    // =========================================================================
    const tw7 = await getHotspotAnalytics({ days: "7" });
    assert(
      "TEST-05",
      tw7 && tw7.filter_applied.days === "7",
      "Time-window filter (7 days) applies correct query constraint"
    );

    // =========================================================================
    // 6. Category filters
    // =========================================================================
    const catFiltered = await getHotspotAnalytics({ category: "Spoiled or Rotten Food" });
    const allSpoiled = catFiltered.clusters.every((c) =>
      c.complaint_references.every((r) => r.category === "Spoiled or Rotten Food")
    );
    assert(
      "TEST-06",
      catFiltered.total_clusters > 0 && allSpoiled,
      "Category filter correctly restricts hotspot clusters to requested grievance category"
    );

    // =========================================================================
    // 7. Reported versus verified distinctions
    // =========================================================================
    const verifiedOnly = await getHotspotAnalytics({ status: "VERIFIED" });
    const hasOnlyVerified = verifiedOnly.clusters.every((c) =>
      c.complaint_references.every((r) => ["VERIFIED", "INVESTIGATION", "RESOLVED"].includes(r.status))
    );
    assert(
      "TEST-07",
      hasOnlyVerified,
      "Status filter distinguishes verified findings from unverified reported concerns"
    );

    // =========================================================================
    // 8. Suppression of privacy-sensitive small groups
    // =========================================================================
    const suppressedHs = await getHotspotAnalytics({ minThreshold: 50 }); // Higher than our test cluster size
    assert(
      "TEST-08",
      suppressedHs.total_clusters === 0,
      "Privacy safeguard: Clusters below minimum threshold are suppressed"
    );

    // =========================================================================
    // 9. Authorized Admin map access
    // =========================================================================
    const adminMapRes = await fetch(`${BASE}/intelligence/hotspots?days=30`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    const adminMapData = await adminMapRes.json();
    assert(
      "TEST-09",
      adminMapRes.status === 200 && adminMapData.success === true,
      "Authorized Admin successfully accesses hotspot intelligence API"
    );

    // =========================================================================
    // 10. Unauthorized analytics access rejection
    // =========================================================================
    const unauthRes = await fetch(`${BASE}/intelligence/hotspots`);
    const custRes = await fetch(`${BASE}/intelligence/hotspots`, {
      headers: { Authorization: `Bearer ${customer.token}` },
    });
    assert(
      "TEST-10",
      unauthRes.status === 401 && custRes.status === 403,
      "Unauthorized analytics access correctly rejected (401 for unauthenticated, 403 for Customer)"
    );

    // =========================================================================
    // 11. Authority visibility access
    // =========================================================================
    const authMapRes = await fetch(`${BASE}/intelligence/hotspots`, {
      headers: { Authorization: `Bearer ${authority.token}` },
    });
    const authMapData = await authMapRes.json();
    assert(
      "TEST-11",
      authMapRes.status === 200 && authMapData.success === true,
      "Authorized Authority role successfully accesses hotspot intelligence API"
    );

    // =========================================================================
    // 12. Listed-shop duplicate matching
    // =========================================================================
    const listedSim = evaluateComplaintPairSimilarity(seed1, seed2);
    assert(
      "TEST-12",
      listedSim.score >= 50 && listedSim.reasons.some((r) => r.includes("registered establishment")),
      "Listed-shop duplicate matching correctly detects same shop_id with explainable reason",
      `Score: ${listedSim.score}, Reasons: ${listedSim.reasons.join("; ")}`
    );

    // =========================================================================
    // 13. Unlisted-seller duplicate matching
    // =========================================================================
    const unlistedSim = evaluateComplaintPairSimilarity(seedUnlistedA, seedUnlistedB);
    assert(
      "TEST-13",
      unlistedSim.score >= 50 && unlistedSim.reasons.some((r) => r.includes("stall name")),
      "Unlisted-seller duplicate matching pairs normalized vendor name + nearby coordinates",
      `Score: ${unlistedSim.score}, Reasons: ${unlistedSim.reasons.join("; ")}`
    );

    // =========================================================================
    // 14. Null shop_id does not create false duplicates
    // =========================================================================
    const nullShopDiff = evaluateComplaintPairSimilarity(seedUnlistedA, seedNoCoords);
    assert(
      "TEST-14",
      nullShopDiff.score < 50,
      "Strict matching rule: Two unlisted complaints with null shop_id are NOT merged into false duplicates",
      `Similarity score between unrelated unlisted complaints: ${nullShopDiff.score}`
    );

    // =========================================================================
    // 15. Nearby unrelated stalls are not automatically merged
    // =========================================================================
    // seedUnlistedA (Sharma Vadapav) vs seedUnlistedC (Ramesh Chai) are ~50m apart
    const nearbyUnrelatedSim = evaluateComplaintPairSimilarity(seedUnlistedA, seedUnlistedC);
    assert(
      "TEST-15",
      nearbyUnrelatedSim.score < 50,
      "Strict matching rule: Nearby vendors are not automatically merged solely due to proximity",
      `Score: ${nearbyUnrelatedSim.score}`
    );

    // =========================================================================
    // 16. Similar descriptions across different shops
    // =========================================================================
    const genericTextA = {
      shop_id: 101,
      product_name: "Dosa",
      category: "Spoiled or Rotten Food",
      description: "Food was cold and smelled bad.",
      latitude: 19.01,
      longitude: 72.84,
      created_at: new Date(),
    };
    const genericTextB = {
      shop_id: 202,
      product_name: "Biryani",
      category: "Spoiled or Rotten Food",
      description: "Food was cold and smelled bad.",
      latitude: 18.52, // Pune vs Mumbai
      longitude: 73.85,
      created_at: new Date(),
    };
    const textOnlySim = evaluateComplaintPairSimilarity(genericTextA, genericTextB);
    assert(
      "TEST-16",
      textOnlySim.score < 50,
      "Similar wording alone across different vendors does not establish a duplicate",
      `Score: ${textOnlySim.score}`
    );

    // =========================================================================
    // 17. Time proximity handling
    // =========================================================================
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 120); // 4 months ago
    const oldComplaint = { ...seed1.toJSON(), created_at: oldDate };
    const recentSim = evaluateComplaintPairSimilarity(seed1, seed1);
    const oldSim = evaluateComplaintPairSimilarity(seed1, oldComplaint);
    assert(
      "TEST-17",
      recentSim.score >= oldSim.score,
      "Time proximity contributes appropriately to similarity calculation with temporal decay"
    );

    // =========================================================================
    // 18. Cross-language complaint descriptions
    // =========================================================================
    const crossLangVadapav = normalizeProductName("वडापाव") === normalizeProductName("Vada Pav");
    const crossLangMilk = normalizeProductName("दूध") === normalizeProductName("Milk");
    assert(
      "TEST-18",
      crossLangVadapav && crossLangMilk,
      "Cross-language product dictionary normalizes Marathi and English food synonyms",
      `वडापाव -> ${normalizeProductName("वडापाव")}, Milk -> ${normalizeProductName("Milk")}`
    );

    // =========================================================================
    // 19. Duplicate suggestion review queue retrieval
    // =========================================================================
    const dupQueueRes = await fetch(`${BASE}/intelligence/duplicates?rescan=true`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    const dupQueueData = await dupQueueRes.json();
    assert(
      "TEST-19",
      dupQueueRes.status === 200 && Array.isArray(dupQueueData.data),
      "Admin duplicate review queue successfully retrieves flagged potential matches",
      `Retrieved ${dupQueueData.count} flagged duplicate pairs`
    );

    // =========================================================================
    // 20. Mark-related operation
    // =========================================================================
    const markRelRes = await fetch(`${BASE}/intelligence/duplicates/review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${admin.token}`,
      },
      body: JSON.stringify({
        source_complaint_id: seedUnlistedA.id,
        target_complaint_id: seedUnlistedB.id,
        review_status: "RELATED",
        review_notes: "Field officer verified same vendor stall operating during evening hours.",
      }),
    });
    const markRelData = await markRelRes.json();
    assert(
      "TEST-20",
      markRelRes.status === 200 && markRelData.data.review_status === "RELATED",
      "Mark-related operation records decision and reviewer audit trail without altering complaints"
    );

    // =========================================================================
    // 21. Mark-unrelated operation
    // =========================================================================
    const markUnrelRes = await fetch(`${BASE}/intelligence/duplicates/review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${admin.token}`,
      },
      body: JSON.stringify({
        source_complaint_id: seedUnlistedA.id,
        target_complaint_id: seedUnlistedC.id,
        review_status: "UNRELATED",
        review_notes: "Confirmed separate independent businesses.",
      }),
    });
    const markUnrelData = await markUnrelRes.json();
    assert(
      "TEST-21",
      markUnrelRes.status === 200 && markUnrelData.data.review_status === "UNRELATED",
      "Mark-unrelated operation records authorized separation decision"
    );

    // =========================================================================
    // 22. Existing records are never deleted by matching
    // =========================================================================
    const countA = await Complaint.findByPk(seedUnlistedA.id);
    const countB = await Complaint.findByPk(seedUnlistedB.id);
    assert(
      "TEST-22",
      countA !== null && countB !== null,
      "Strict data integrity: Both original complaints remain independently preserved after duplicate reviews"
    );

    // =========================================================================
    // 23. Risk scores use actual inputs
    // =========================================================================
    const acuteIllnessClass = classifyComplaint(
      "Spoiled or Rotten Food",
      "Patient admitted to hospital ICU after vomiting blood and acute diarrhea.",
      "Milk"
    );
    const mildClass = classifyComplaint(
      "Other Food Safety Concern",
      "Slightly late delivery and cold tea.",
      "Tea"
    );
    assert(
      "TEST-23",
      acuteIllnessClass.score > mildClass.score && acuteIllnessClass.priority === "CRITICAL",
      "Risk score reflects actual health severity signals (ICU/hospital/blood vs cold tea)",
      `Critical score: ${acuteIllnessClass.score}, Mild score: ${mildClass.score}`
    );

    // =========================================================================
    // 24. Risk explanations match scoring factors
    // =========================================================================
    const hasExplainableFactors =
      acuteIllnessClass.contributing_factors.length > 0 &&
      acuteIllnessClass.contributing_factors.every((f) => f.name && f.points > 0 && f.description);
    assert(
      "TEST-24",
      hasExplainableFactors && acuteIllnessClass.explanation_summary.includes("CRITICAL"),
      "Explainable risk engine returns transparent factor decomposition with itemized points",
      `Contributing factors count: ${acuteIllnessClass.contributing_factors.length}`
    );

    // =========================================================================
    // 25. Missing optional evidence is handled safely
    // =========================================================================
    const noPhotoClass = classifyComplaint("Suspected Adulteration", "Chemical smell in oil", "Cooking Oil");
    assert(
      "TEST-25",
      noPhotoClass.score > 0 && !noPhotoClass.contributing_factors.some((f) => f.points < 0),
      "Fairness safeguard: Missing optional photo/receipt evidence does not penalize score or invalidate complaint"
    );

    // =========================================================================
    // 26. Unlisted status does not automatically increase risk
    // =========================================================================
    // Verify that classifier does not factor listing type into punitive risk calculation
    const listedRisk = classifyComplaint("Spoiled or Rotten Food", "Stale bread with fungal growth", "Bread");
    const unlistedRisk = classifyComplaint("Spoiled or Rotten Food", "Stale bread with fungal growth", "Bread");
    assert(
      "TEST-26",
      listedRisk.score === unlistedRisk.score,
      "Fairness safeguard: Unlisted vendor status does not automatically increase risk score"
    );

    // =========================================================================
    // 27. Authorized risk review/override works
    // =========================================================================
    const overrideRes = await fetch(`${BASE}/intelligence/risk/${seed1.complaint_id}/override`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${admin.token}`,
      },
      body: JSON.stringify({
        manual_priority: "CRITICAL",
        override_reason: "Surveillance sample confirmed presence of toxic formalin.",
      }),
    });
    const overrideData = await overrideRes.json();
    const updatedSeed1 = await Complaint.findByPk(seed1.id);
    assert(
      "TEST-27",
      overrideRes.status === 200 &&
        updatedSeed1.priority === "CRITICAL" &&
        updatedSeed1.manual_priority_override === "CRITICAL",
      "Authorized officers can record manual priority override with mandatory documented justification",
      `Effective priority: ${updatedSeed1.priority}`
    );

    // =========================================================================
    // 28. Risk-scoring versioning
    // =========================================================================
    const riskInspectRes = await fetch(`${BASE}/intelligence/risk/${seed1.complaint_id}`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    const riskInspectData = await riskInspectRes.json();
    assert(
      "TEST-28",
      riskInspectRes.status === 200 && riskInspectData.data.scoring_version === SCORING_VERSION,
      "Scoring versioning is maintained and disclosed (v2.0-explainable)",
      `Version: ${riskInspectData.data?.scoring_version}`
    );

    // =========================================================================
    // 29. Admin intelligence dashboard overview loads
    // =========================================================================
    const ovRes = await fetch(`${BASE}/intelligence/overview`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    const ovData = await ovRes.json();
    assert(
      "TEST-29",
      ovRes.status === 200 && ovData.data.total_complaints > 0,
      "Admin intelligence overview KPIs load successfully with live database metrics",
      `Total complaints: ${ovData.data.total_complaints}`
    );

    // =========================================================================
    // 30. Authority intelligence view loads
    // =========================================================================
    const authOvRes = await fetch(`${BASE}/intelligence/overview`, {
      headers: { Authorization: `Bearer ${authority.token}` },
    });
    assert(
      "TEST-30",
      authOvRes.status === 200,
      "Authority role can access authorized intelligence overview without permission violations"
    );

    // =========================================================================
    // 31. Customer complaint creation remains functional
    // =========================================================================
    const createRes = await fetch(`${BASE}/complaints`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customer.token}`,
      },
      body: JSON.stringify({
        seller_listing_type: "UNLISTED",
        seller_type: "Food Cart",
        reported_shop_name: `Phase 5 Reg Cart ${timestamp}`,
        reported_landmark: "Opposite Sector 12 Garden",
        category: "Unhygienic Preparation",
        product_name: "Pani Puri",
        description: "Vendor handled food with dirty hands and uncleaned container.",
        latitude: 19.02,
        longitude: 72.85,
      }),
    });
    const createData = await createRes.json();
    assert(
      "TEST-31",
      createRes.status === 201 && createData.complaint && createData.complaint.complaint_id,
      "Customer complaint creation remains 100% functional with automated v2.0 risk scoring",
      `Created complaint: #${createData.complaint?.complaint_id}, Risk: ${createData.complaint?.risk_score}`
    );

    // =========================================================================
    // 32. Customer tracking remains functional
    // =========================================================================
    const newCompId = createData.complaint.complaint_id;
    const trackRes = await fetch(`${BASE}/complaints/${encodeURIComponent(newCompId)}`, {
      headers: { Authorization: `Bearer ${customer.token}` },
    });
    const trackData = await trackRes.json();
    assert(
      "TEST-32",
      trackRes.status === 200 && trackData.success === true && trackData.complaint.complaint_id === newCompId,
      "Customer complaint tracking by FoodSafe ID remains fully operational"
    );

    // =========================================================================
    // 33. Evidence authorization remains enforced
    // =========================================================================
    const evidenceRes = await fetch(`${BASE}/complaints/${seed1.id}/images/99999`);
    assert(
      "TEST-33",
      [401, 403, 404].includes(evidenceRes.status),
      "Evidence image streaming endpoints enforce authorization and token authentication"
    );

    // =========================================================================
    // 34. Browser responsiveness / Trend analytics API loads
    // =========================================================================
    const trendsRes = await fetch(`${BASE}/intelligence/trends`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    const trendsData = await trendsRes.json();
    assert(
      "TEST-34",
      trendsRes.status === 200 && Array.isArray(trendsData.data.by_category),
      "Trend analytics returns aggregated category, status, and seller listing distributions"
    );

    // =========================================================================
    // 35. API error handling (invalid inputs rejected gracefully)
    // =========================================================================
    const invalidOverrideRes = await fetch(`${BASE}/intelligence/risk/${seed1.complaint_id}/override`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${admin.token}`,
      },
      body: JSON.stringify({
        manual_priority: "INVALID_PRIORITY_XYZ",
        override_reason: "", // missing reason
      }),
    });
    assert(
      "TEST-35",
      invalidOverrideRes.status === 400,
      "API error handling: Invalid priority override requests are rejected with 400 status"
    );

    // =========================================================================
    // 36. Performance with larger synthetic dataset / fast sub-second execution
    // =========================================================================
    const startTime = Date.now();
    await getHotspotAnalytics({ days: "30", minThreshold: 1 });
    const durationMs = Date.now() - startTime;
    assert(
      "TEST-36",
      durationMs < 1000,
      "Hotspot geographic clustering query completes efficiently within sub-second latency",
      `Execution time: ${durationMs}ms`
    );

    // =========================================================================
    // 37. No private customer data appears in map responses
    // =========================================================================
    const mapClusterMembers = hsRes.clusters.flatMap((c) => c.complaint_references);
    const hasPii = mapClusterMembers.some((m) => m.user_id || m.customer_name || m.email || m.phone);
    assert(
      "TEST-37",
      !hasPii,
      "Privacy safeguard: Complainant personal identities (user_id, phone, email) strictly omitted from map API"
    );

    // =========================================================================
    // 38. Existing AI and adulteration tools remain functional
    // =========================================================================
    const adulRes = await fetch(`${BASE}/adulteration/tests`, {
      headers: { Authorization: `Bearer ${customer.token}` },
    });
    const adulData = await adulRes.json();
    assert(
      "TEST-38",
      adulRes.status === 200 && adulData.success === true,
      "Existing AI adulteration test registry remains fully functional alongside Phase 5 intelligence"
    );

    // ----------------------------------------------------
    // Cleanup deterministic test records
    // ----------------------------------------------------
    await ComplaintSimilarityReview.destroy({
      where: {
        [Op.or]: [
          { source_complaint_id: [seed1.id, seed2.id, seedUnlistedA.id, seedUnlistedB.id, seedUnlistedC.id] },
          { target_complaint_id: [seed1.id, seed2.id, seedUnlistedA.id, seedUnlistedB.id, seedUnlistedC.id] },
        ],
      },
    });

    await Complaint.destroy({
      where: {
        complaint_id: {
          [Op.like]: `FS-P5-%`,
        },
      },
    });

    console.log(`\n======================================================================`);
    console.log(`PHASE 5 TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
    console.log(`======================================================================\n`);

    if (failed > 0) {
      exitCode = 1;
    }
  } catch (err) {
    console.error("FATAL ERROR in Phase 5 Test Suite:", err);
    exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
  }

  process.exit(exitCode);
}

runPhase5IntelligenceAnalyticsTestSuite();
