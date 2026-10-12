require("dotenv").config();
const http = require("http");
const fs = require("fs");
const path = require("path");

async function runPhase1UnlistedSellerTestSuite() {
  const app = require("./src/app");
  const { Complaint, Shop, User } = require("./src/models");
  const PORT = 5098;
  const BASE = `http://localhost:${PORT}/api`;

  let server;
  let exitCode = 0;

  try {
    server = app.listen(PORT);
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log(`\n======================================================================`);
    console.log(`FOODSAFE AI 2.0 — PHASE 1 SPECIFICATION AUTOMATED TEST SUITE`);
    console.log(`Unlisted Shop & Roadside Food Vendor Complaint Reporting`);
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

    // 1. Setup credentials for testing: Customer A, Customer B, Admin, Authority
    const loginUser = async (email, password) => {
      const res = await fetch(`${BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      return { status: res.status, ok: res.ok, token: data.token, user: data.user };
    };

    const customerA = await loginUser("customer@test.com", "test123");
    const admin = await loginUser("admin@foodsafety.gov", "admin123");
    const authority = await loginUser("authority@foodsafety.com", "123456");

    if (!admin.token || !authority.token) {
      throw new Error("Precondition failed: Admin or Authority credentials invalid.");
    }

    // Create or login Customer B for IDOR testing
    let customerBToken;
    const bLogin = await loginUser("customer_secondary_test@foodsafe.org", "testPassword123!");
    if (bLogin.ok) {
      customerBToken = bLogin.token;
    } else {
      const regRes = await fetch(`${BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "IDOR Tester B",
          email: "customer_secondary_test@foodsafe.org",
          password: "testPassword123!",
          role: "CUSTOMER",
          phone: "9876543299",
        }),
      });
      const regData = await regRes.json();
      const bLogin2 = await loginUser("customer_secondary_test@foodsafe.org", "testPassword123!");
      customerBToken = bLogin2.token;
    }

    // Fetch an existing active shop for listed shop tests
    const shopsRes = await fetch(`${BASE}/shops`, {
      headers: { Authorization: `Bearer ${customerA.token}` },
    });
    const shopsData = await shopsRes.json();
    const existingShop = shopsData.shops && shopsData.shops.length > 0 ? shopsData.shops[0] : null;

    if (!existingShop) {
      throw new Error("Precondition failed: No active shop found in database for testing.");
    }

    let listedComplaint = null;
    let unlistedComplaint = null;
    let unlistedComplaintNoFssai = null;
    let unlistedUnknownNameComplaint = null;
    let uploadedEvidenceImageId = null;

    // ==================================================================
    // TEST 01: Existing listed-shop complaint submission works
    // ==================================================================
    const t1Payload = {
      seller_listing_type: "LISTED",
      shop_id: existingShop.id,
      category: "Food Poisoning",
      product_name: "Paneer Butter Masala",
      description: "Severe gastrointestinal issues after dining at registered restaurant.",
      incident_date: "2026-10-08",
      location: existingShop.city || "Mumbai",
    };
    const t1Res = await fetch(`${BASE}/complaints`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerA.token}`,
      },
      body: JSON.stringify(t1Payload),
    });
    const t1Data = await t1Res.json();
    listedComplaint = t1Data.complaint;
    assert(
      "TEST 01",
      t1Res.status === 201 &&
        listedComplaint &&
        Number(listedComplaint.shop_id) === Number(existingShop.id) &&
        listedComplaint.seller_listing_type === "LISTED",
      "Existing listed-shop complaint submission works and preserves shop association",
      JSON.stringify(t1Data)
    );

    // ==================================================================
    // TEST 02: Unlisted roadside vendor complaint is accepted
    // ==================================================================
    const t2Payload = {
      seller_listing_type: "UNLISTED",
      seller_type: "Roadside Food Stall",
      reported_shop_name: "Sharma Vadapav Corner",
      reported_landmark: "Opposite Railway Station Exit Gate 2",
      reported_address: "Station Road, Near Platform 1 Auto Stand",
      reported_registration_number: "FSSAI-UNLISTED-TEMP-9912",
      category: "Hygiene Issues",
      product_name: "Vadapav and Green Chutney",
      description: "Vendor observed handling food with bare unwashed hands; frying oil was rancid and pitch black.",
      incident_date: "2026-10-09",
    };
    const t2Res = await fetch(`${BASE}/complaints`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerA.token}`,
      },
      body: JSON.stringify(t2Payload),
    });
    const t2Data = await t2Res.json();
    unlistedComplaint = t2Data.complaint;
    assert(
      "TEST 02",
      t2Res.status === 201 &&
        unlistedComplaint &&
        unlistedComplaint.seller_listing_type === "UNLISTED" &&
        unlistedComplaint.seller_type === "Roadside Food Stall" &&
        unlistedComplaint.reported_shop_name === "Sharma Vadapav Corner",
      "Unlisted roadside vendor complaint is accepted with full seller details",
      JSON.stringify(t2Data)
    );

    // ==================================================================
    // TEST 03: Unlisted complaint works without an FSSAI number
    // ==================================================================
    const t3Payload = {
      seller_listing_type: "UNLISTED",
      seller_type: "Food Cart",
      reported_shop_name: "Gupta Chaat Bhandar",
      reported_landmark: "Near Gandhi Market Entrance under Banyan Tree",
      category: "Foreign Object",
      product_name: "Pani Puri",
      description: "Small plastic fragment found inside the spiced water container.",
      incident_date: "2026-10-09",
      // Notice: No reported_registration_number provided
    };
    const t3Res = await fetch(`${BASE}/complaints`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerA.token}`,
      },
      body: JSON.stringify(t3Payload),
    });
    const t3Data = await t3Res.json();
    unlistedComplaintNoFssai = t3Data.complaint;
    assert(
      "TEST 03",
      t3Res.status === 201 &&
        unlistedComplaintNoFssai &&
        (unlistedComplaintNoFssai.reported_registration_number === null ||
          unlistedComplaintNoFssai.reported_registration_number === undefined) &&
        unlistedComplaintNoFssai.registration_verification_status === "NOT_APPLICABLE",
      "Unlisted complaint works without an FSSAI number (optional field not required)",
      JSON.stringify(t3Data)
    );

    // ==================================================================
    // TEST 04: Unknown seller name is accepted when usable location information exists
    // ==================================================================
    const t4Payload = {
      seller_listing_type: "UNLISTED",
      seller_type: "Temporary Market Stall",
      reported_shop_name: "", // Unknown seller name
      reported_landmark: "Weekly Sunday Farmers Market, Row C Stall 14 near Water Cooler",
      category: "Adulteration",
      product_name: "Loose Raw Honey",
      description: "Sugar syrup adulteration suspected in unbranded honey bottle.",
      incident_date: "2026-10-09",
    };
    const t4Res = await fetch(`${BASE}/complaints`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerA.token}`,
      },
      body: JSON.stringify(t4Payload),
    });
    const t4Data = await t4Res.json();
    unlistedUnknownNameComplaint = t4Data.complaint;
    assert(
      "TEST 04",
      t4Res.status === 201 &&
        unlistedUnknownNameComplaint &&
        (unlistedUnknownNameComplaint.reported_shop_name === null ||
          unlistedUnknownNameComplaint.reported_shop_name === "" ||
          unlistedUnknownNameComplaint.reported_shop_name === undefined) &&
        unlistedUnknownNameComplaint.reported_landmark.includes("Weekly Sunday Farmers Market"),
      "Unknown seller name is accepted when usable location information exists",
      JSON.stringify(t4Data)
    );

    // ==================================================================
    // TEST 05: Missing seller location information triggers validation
    // ==================================================================
    const t5Payload = {
      seller_listing_type: "UNLISTED",
      seller_type: "Roadside Food Stall",
      reported_shop_name: "Ghost Vendor",
      reported_landmark: "   ", // Empty landmark
      reported_address: "",
      location: "",
      category: "Hygiene Issues",
      product_name: "Snack",
      description: "Unsanitary conditions reported without any usable location.",
    };
    const t5Res = await fetch(`${BASE}/complaints`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerA.token}`,
      },
      body: JSON.stringify(t5Payload),
    });
    const t5Data = await t5Res.json();
    assert(
      "TEST 05",
      t5Res.status === 400 && (t5Data.message?.toLowerCase().includes("landmark") || t5Data.message?.toLowerCase().includes("location")),
      "Missing seller location information triggers 400 validation error",
      `Status: ${t5Res.status}, Message: ${t5Data.message}`
    );

    // ==================================================================
    // TEST 06: Invalid seller type is rejected
    // ==================================================================
    const t6Payload = {
      seller_listing_type: "UNLISTED",
      seller_type: "UNLICENSED_AIRCRAFT_CATERER", // Invalid type
      reported_landmark: "Airport Road Terminal 2",
      category: "Food Poisoning",
      product_name: "Sandwich",
      description: "Invalid seller type testing with roadside submission.",
    };
    const t6Res = await fetch(`${BASE}/complaints`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerA.token}`,
      },
      body: JSON.stringify(t6Payload),
    });
    const t6Data = await t6Res.json();
    assert(
      "TEST 06",
      t6Res.status === 400 && t6Data.message?.toLowerCase().includes("seller type"),
      "Invalid seller type is rejected with 400 Validation Error",
      `Status: ${t6Res.status}, Message: ${t6Data.message}`
    );

    // ==================================================================
    // TEST 07: shop_id is saved as NULL for unlisted seller complaints
    // ==================================================================
    const dbRecord = await Complaint.findByPk(unlistedComplaint.id);
    assert(
      "TEST 07",
      dbRecord !== null && dbRecord.shop_id === null && dbRecord.seller_listing_type === "UNLISTED",
      "shop_id is strictly saved as NULL in the database for unlisted seller complaints",
      `DB shop_id value: ${dbRecord ? dbRecord.shop_id : "not found"}`
    );

    // ==================================================================
    // TEST 08: Complaint ID is generated correctly
    // ==================================================================
    const complaintIdRegex = /^FSA-\d{4}-\d{6}$/;
    assert(
      "TEST 08",
      complaintIdRegex.test(unlistedComplaint.complaint_id) &&
        complaintIdRegex.test(unlistedComplaintNoFssai.complaint_id),
      `Complaint ID generated matching standard format (e.g. ${unlistedComplaint.complaint_id})`,
      `Actual IDs: ${unlistedComplaint.complaint_id}, ${unlistedComplaintNoFssai.complaint_id}`
    );

    // ==================================================================
    // TEST 09: Admin dashboard displays unlisted complaints
    // ==================================================================
    const adminCompsRes = await fetch(`${BASE}/admin/complaints`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    const adminCompsData = await adminCompsRes.json();
    const foundAdminComp = adminCompsData.complaints?.find((c) => c.id === unlistedComplaint.id);
    assert(
      "TEST 09",
      adminCompsRes.ok &&
        foundAdminComp &&
        foundAdminComp.seller_listing_type === "UNLISTED" &&
        foundAdminComp.seller_type === "Roadside Food Stall" &&
        foundAdminComp.reported_landmark === "Opposite Railway Station Exit Gate 2" &&
        foundAdminComp.shop === null,
      "Admin dashboard displays unlisted complaints with all seller fields intact and null shop handled safely",
      foundAdminComp ? `Found ID ${foundAdminComp.id}, Listing: ${foundAdminComp.seller_listing_type}` : "Not found"
    );

    // ==================================================================
    // TEST 10: Admin can review and verify an unlisted complaint
    // ==================================================================
    const adminVerifyRes = await fetch(`${BASE}/admin/complaints/${unlistedComplaint.id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${admin.token}`,
      },
      body: JSON.stringify({
        status: "VERIFIED",
        admin_remarks: "Unlisted roadside food stall verified; dispatched for Authority field inspection.",
      }),
    });
    const adminVerifyData = await adminVerifyRes.json();
    assert(
      "TEST 10",
      adminVerifyRes.ok && adminVerifyData.complaint?.status === "VERIFIED",
      "Admin can review and verify an unlisted complaint without database foreign key errors",
      `Status: ${adminVerifyRes.status}, New complaint status: ${adminVerifyData.complaint?.status}`
    );

    // ==================================================================
    // TEST 11: Authority can access an assigned unlisted complaint
    // ==================================================================
    const authCompsRes = await fetch(`${BASE}/authority/complaints`, {
      headers: { Authorization: `Bearer ${authority.token}` },
    });
    const authCompsData = await authCompsRes.json();
    const foundAuthComp = authCompsData.complaints?.find((c) => c.id === unlistedComplaint.id);

    // Authority updates investigation status
    const authInvRes = await fetch(`${BASE}/authority/complaints/${unlistedComplaint.id}/investigation`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authority.token}`,
      },
      body: JSON.stringify({
        authority_name: "Inspector V. Kulkarni (Food Safety Enforcement Squad)",
        investigation_status: "UNDER_INVESTIGATION",
        remarks: "Field officer deployed to Railway Station Gate 2 landmark for stall inspection.",
      }),
    });
    const authInvData = await authInvRes.json();

    assert(
      "TEST 11",
      foundAuthComp !== undefined &&
        authInvRes.ok &&
        (authInvData.authorityAction?.investigation_status === "UNDER_INVESTIGATION" || authInvData.success),
      "Authority can access assigned unlisted complaint and update investigation lifecycle",
      `Found in queue: ${Boolean(foundAuthComp)}, Inv update status: ${authInvRes.status}`
    );

    // ==================================================================
    // TEST 12: Customer can track their own unlisted complaint
    // ==================================================================
    const custTrackRes = await fetch(`${BASE}/complaints/${unlistedComplaint.complaint_id}`, {
      headers: { Authorization: `Bearer ${customerA.token}` },
    });
    const custTrackData = await custTrackRes.json();
    assert(
      "TEST 12",
      custTrackRes.ok &&
        custTrackData.complaint &&
        custTrackData.complaint.seller_listing_type === "UNLISTED" &&
        custTrackData.complaint.reported_shop_name === "Sharma Vadapav Corner" &&
        custTrackData.complaint.reported_landmark === "Opposite Railway Station Exit Gate 2",
      "Customer can track their own unlisted complaint and view reported seller details",
      `Track status: ${custTrackRes.status}, Tracking ID: ${custTrackData.complaint?.complaint_id}`
    );

    // ==================================================================
    // TEST 13: Another customer cannot access that complaint or its evidence
    // ==================================================================
    const idorTrackRes = await fetch(`${BASE}/complaints/${unlistedComplaint.complaint_id}`, {
      headers: { Authorization: `Bearer ${customerBToken}` },
    });
    assert(
      "TEST 13",
      idorTrackRes.status === 403,
      "Another customer cannot access that complaint (IDOR protection returns 403 Forbidden)",
      `Status: ${idorTrackRes.status}`
    );

    // ==================================================================
    // TEST 14: Evidence upload continues to work
    // ==================================================================
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52]);
    const validBlob = new Blob([pngHeader], { type: "image/png" });
    const evidenceForm = new FormData();
    evidenceForm.append("food_images", validBlob, "roadside_oil_evidence.png");

    const uploadRes = await fetch(`${BASE}/complaints/${unlistedComplaint.id}/images`, {
      method: "POST",
      headers: { Authorization: `Bearer ${customerA.token}` },
      body: evidenceForm,
    });
    const uploadData = await uploadRes.json();
    if (uploadData.images && uploadData.images.length > 0) {
      uploadedEvidenceImageId = uploadData.images[0].id;
    }

    // Also verify Customer B cannot access this evidence image
    let idorImageBlocked = false;
    if (uploadedEvidenceImageId) {
      const idorImgRes = await fetch(`${BASE}/complaints/${unlistedComplaint.id}/images/${uploadedEvidenceImageId}`, {
        headers: { Authorization: `Bearer ${customerBToken}` },
      });
      idorImageBlocked = idorImgRes.status === 403;
    }

    assert(
      "TEST 14",
      uploadRes.status === 201 && uploadData.success && uploadedEvidenceImageId && idorImageBlocked,
      "Evidence upload continues to work for unlisted complaints and retains IDOR access control",
      `Upload status: ${uploadRes.status}, Image ID: ${uploadedEvidenceImageId}, B blocked: ${idorImageBlocked}`
    );

    // ==================================================================
    // TEST 15: Existing complaints remain accessible
    // ==================================================================
    const totalComplaintsCount = await Complaint.count();
    const existingDbRecord = await Complaint.findByPk(listedComplaint.id, {
      include: [{ model: Shop, as: "shop", required: false }],
    });
    assert(
      "TEST 15",
      totalComplaintsCount >= 1 &&
        existingDbRecord !== null &&
        existingDbRecord.shop !== null &&
        existingDbRecord.shop.id === existingShop.id,
      `Existing complaints remain fully accessible with shops attached (total complaints in system: ${totalComplaintsCount})`,
      `Record ID ${existingDbRecord?.id}, Shop Name: ${existingDbRecord?.shop?.shop_name}`
    );

    // ==================================================================
    // TEST 16: Existing risk scoring and duplicate detection do not crash
    // ==================================================================
    const dupUnlistedRes = await fetch(`${BASE}/complaints/check-duplicate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerA.token}`,
      },
      body: JSON.stringify({
        seller_listing_type: "UNLISTED",
        shop_id: null,
        reported_shop_name: "Sharma Vadapav Corner",
        reported_landmark: "Opposite Railway Station Exit Gate 2",
        product_name: "Vadapav",
        category: "Hygiene Issues",
        description: "Vendor observed handling food with bare unwashed hands and rancid oil.",
      }),
    });
    const dupUnlistedData = await dupUnlistedRes.json();

    const riskScoreCalculated = Number(unlistedComplaint.risk_score) >= 0;
    const riskLevelAssigned = ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(String(unlistedComplaint.risk_level).toUpperCase());

    assert(
      "TEST 16",
      dupUnlistedRes.ok &&
        dupUnlistedData.success &&
        typeof dupUnlistedData.is_duplicate === "boolean" &&
        riskScoreCalculated &&
        riskLevelAssigned,
      `Existing risk scoring and duplicate detection do not crash on null shop_id (Risk: ${unlistedComplaint.risk_score}, Level: ${unlistedComplaint.risk_level})`,
      `Duplicate response: ${JSON.stringify(dupUnlistedData)}`
    );

    // ==================================================================
    // TEST 17: Switching seller types clears incompatible form values
    // ==================================================================
    // Verify frontend form state transition specification:
    // When switching to UNLISTED: shop_id must be cleared.
    // When switching to LISTED: unlisted fields must be cleared.
    const frontendFormPath = path.resolve(__dirname, "../frontend/src/pages/SubmitComplaint.jsx");
    const frontendFormCode = fs.readFileSync(frontendFormPath, "utf-8");

    const hasListingTypeState = frontendFormCode.includes("seller_listing_type");
    const clearsShopIdOnUnlisted =
      frontendFormCode.includes('shop_id: ""') ||
      frontendFormCode.includes("setSelectedShop(null)");
    const clearsUnlistedFieldsOnListed =
      frontendFormCode.includes('seller_type: ""') &&
      frontendFormCode.includes('reported_shop_name: ""') &&
      frontendFormCode.includes('reported_landmark: ""');

    // Simulate programmatic state transition
    const simulateTransition = (initialState, targetType) => {
      let state = { ...initialState };
      if (targetType === "LISTED") {
        state = {
          ...state,
          seller_listing_type: "LISTED",
          seller_type: "",
          reported_shop_name: "",
          reported_landmark: "",
          reported_address: "",
          reported_registration_number: "",
        };
      } else if (targetType === "UNLISTED") {
        state = {
          ...state,
          seller_listing_type: "UNLISTED",
          shop_id: "",
        };
      }
      return state;
    };

    const stateAfterUnlisted = simulateTransition({ shop_id: 42, seller_listing_type: "LISTED" }, "UNLISTED");
    const stateAfterListed = simulateTransition(
      {
        seller_listing_type: "UNLISTED",
        seller_type: "Roadside Food Stall",
        reported_shop_name: "Stall",
        reported_landmark: "Landmark",
        reported_address: "Address",
        reported_registration_number: "REG-1",
      },
      "LISTED"
    );

    const formTransitionsClean =
      stateAfterUnlisted.shop_id === "" &&
      stateAfterListed.seller_type === "" &&
      stateAfterListed.reported_shop_name === "" &&
      stateAfterListed.reported_landmark === "";

    assert(
      "TEST 17",
      hasListingTypeState && clearsShopIdOnUnlisted && clearsUnlistedFieldsOnListed && formTransitionsClean,
      "Switching seller types clears incompatible form values (prevents stale shop IDs and invalid seller info)",
      `clearsShopId: ${clearsShopIdOnUnlisted}, clearsUnlisted: ${clearsUnlistedFieldsOnListed}`
    );

    // ==================================================================
    // TEST 18: Mobile form layout remains responsive
    // ==================================================================
    const hasResponsiveAutoFitGrid = frontendFormCode.includes("repeat(auto-fit, minmax(260px, 1fr))");
    const indexCssPath = path.resolve(__dirname, "../frontend/src/index.css");
    const indexCssCode = fs.readFileSync(indexCssPath, "utf-8");
    const hasMediaQueries = indexCssCode.includes("@media") && indexCssCode.includes("max-width");

    assert(
      "TEST 18",
      hasResponsiveAutoFitGrid && hasMediaQueries,
      "Mobile form layout remains responsive with auto-fitting grid cards and responsive viewport media queries",
      `Responsive grid: ${hasResponsiveAutoFitGrid}, Media queries: ${hasMediaQueries}`
    );

    // ==================================================================
    // SUMMARY
    // ==================================================================
    console.log(`\n======================================================================`);
    console.log(`PHASE 1 SPECIFICATION RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log(`======================================================================\n`);
  } catch (err) {
    console.error("Test execution aborted due to unhandled error:", err);
    exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
    process.exit(exitCode);
  }
}

runPhase1UnlistedSellerTestSuite();
