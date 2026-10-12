require("dotenv").config();
const http = require("http");
const jwt = require("jsonwebtoken");

async function runTestSuite() {
  const app = require("./src/app");
  const PORT = 5098;
  const BASE = `http://localhost:${PORT}/api`;

  let server;
  let exitCode = 0;

  try {
    server = app.listen(PORT);
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log(`\n======================================================`);
    console.log(`SMART FOOD SAFETY — FULL INTEGRATION TEST SUITE`);
    console.log(`Backend running on port ${PORT}`);
    console.log(`======================================================\n`);

    let passed = 0;
    let failed = 0;

    function assert(condition, message) {
      if (condition) {
        console.log(`  ✅ PASS: ${message}`);
        passed++;
      } else {
        console.error(`  ❌ FAIL: ${message}`);
        failed++;
        exitCode = 1;
      }
    }

    // --------------------------------------------------------
    // FLOW 1: CUSTOMER WORKFLOW
    // --------------------------------------------------------
    console.log(`\n--- 1. CUSTOMER WORKFLOW ---`);

    // 1.1 Customer login
    const custLoginRes = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "customer@test.com", password: "test123" }),
    });
    const custLoginData = await custLoginRes.json();
    assert(custLoginRes.ok && custLoginData.token, "Customer login succeeds and returns JWT");
    const custToken = custLoginData.token;

    // 1.2 Auth verification (/auth/me)
    const meRes = await fetch(`${BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${custToken}` },
    });
    const meData = await meRes.json();
    assert(meRes.ok && meData.user.role === "CUSTOMER", "Verify session /auth/me returns CUSTOMER role");

    // 1.3 Fetch active shops
    const shopsRes = await fetch(`${BASE}/shops`, {
      headers: { Authorization: `Bearer ${custToken}` },
    });
    const shopsData = await shopsRes.json();
    assert(shopsRes.ok && Array.isArray(shopsData.shops) && shopsData.shops.length > 0, "Fetch active shops from database");
    const testShopId = shopsData.shops[0].id;

    // 1.4 Submit Complaint with AI Classification
    const compSubmitRes = await fetch(`${BASE}/complaints`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${custToken}`,
      },
      body: JSON.stringify({
        shop_id: testShopId,
        category: "Food Poisoning",
        product_name: "End-to-End Suite Tested Milk",
        description: "Patient experienced nausea, vomiting and fever after drinking expired milk",
        incident_date: "2026-10-06",
        location: "Test Suite City",
      }),
    });
    const compSubmitData = await compSubmitRes.json();
    assert(compSubmitRes.status === 201 && compSubmitData.success, "Customer submits complaint with shop linkage");
    assert(compSubmitData.complaint.risk_score >= 50, `AI risk score calculated (${compSubmitData.complaint.risk_score}/100)`);
    assert(compSubmitData.complaint.risk_level === "HIGH" || compSubmitData.complaint.risk_level === "CRITICAL", `AI risk level: ${compSubmitData.complaint.risk_level}`);
    const newComplaintId = compSubmitData.complaint.id;
    const newComplaintNumber = compSubmitData.complaint.complaint_id;

    // 1.5 Duplicate detection check
    const dupCheckRes = await fetch(`${BASE}/complaints/check-duplicate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${custToken}`,
      },
      body: JSON.stringify({
        shop_id: testShopId,
        product_name: "End-to-End Suite Tested Milk",
        category: "Food Poisoning",
        description: "Severe nausea and vomiting after milk",
      }),
    });
    const dupCheckData = await dupCheckRes.json();
    assert(dupCheckRes.ok && dupCheckData.is_duplicate === true, "AI duplicate detection identifies matching complaint");

    // 1.6 Get Customer's own complaints
    const myCompRes = await fetch(`${BASE}/complaints/my`, {
      headers: { Authorization: `Bearer ${custToken}` },
    });
    const myCompData = await myCompRes.json();
    assert(myCompRes.ok && Array.isArray(myCompData.complaints), "Customer retrieves own complaints list");
    assert(myCompData.complaints.some((c) => c.id === newComplaintId), "Newly submitted complaint present in customer list");

    // 1.7 Get Customer statistics
    const myStatsRes = await fetch(`${BASE}/complaints/my/statistics`, {
      headers: { Authorization: `Bearer ${custToken}` },
    });
    const myStatsData = await myStatsRes.json();
    assert(myStatsRes.ok && myStatsData.statistics.total >= 1, "Customer statistics endpoint returns aggregated metrics");

    // 1.8 Track Complaint details
    const trackRes = await fetch(`${BASE}/complaints/${newComplaintNumber}`, {
      headers: { Authorization: `Bearer ${custToken}` },
    });
    const trackData = await trackRes.json();
    assert(trackRes.ok && trackData.complaint.complaint_id === newComplaintNumber, "Customer tracks complaint by ID");

    // 1.9 Adulteration Detection Test
    const adultRes = await fetch(`${BASE}/adulteration/test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${custToken}`,
      },
      body: JSON.stringify({
        sample_name: "Paneer",
        test_type: "RAPID_DART",
        complaint_id: newComplaintId,
        notes: "Iodine solution turned sample blue",
      }),
    });
    const adultData = await adultRes.json();
    assert(adultRes.status === 201 && adultData.test.confidence > 70, `Adulteration screening completed (Confidence: ${adultData.test?.confidence}%)`);

    // 1.10 Customer Notifications
    const custNotifRes = await fetch(`${BASE}/notifications/customer`, {
      headers: { Authorization: `Bearer ${custToken}` },
    });
    const custNotifData = await custNotifRes.json();
    assert(custNotifRes.ok && custNotifData.notifications.length > 0, "Customer receives submission notification");
    const custNotifId = custNotifData.notifications[0].id;

    // 1.11 Mark Notification as read
    const custMarkRes = await fetch(`${BASE}/notifications/${custNotifId}/read`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${custToken}` },
    });
    const custMarkData = await custMarkRes.json();
    assert(custMarkRes.ok && custMarkData.success, "Customer marks notification as read");

    // --------------------------------------------------------
    // FLOW 2: ADMIN WORKFLOW
    // --------------------------------------------------------
    console.log(`\n--- 2. ADMIN WORKFLOW ---`);

    // 2.1 Admin login
    const adminLoginRes = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@foodsafety.gov", password: "admin123" }),
    });
    const adminLoginData = await adminLoginRes.json();
    assert(adminLoginRes.ok && adminLoginData.token, "Admin login succeeds and returns JWT");
    const adminToken = adminLoginData.token;

    // 2.2 Admin Dashboard Statistics
    const adminStatsRes = await fetch(`${BASE}/admin/statistics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminStatsData = await adminStatsRes.json();
    assert(adminStatsRes.ok && adminStatsData.statistics.totalComplaints > 0, "Admin dashboard statistics retrieved");

    // 2.3 Admin Intelligence & Reports
    const adminRepRes = await fetch(`${BASE}/admin/reports`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminRepData = await adminRepRes.json();
    assert(adminRepRes.ok && adminRepData.report.totalComplaints > 0, "Admin Intelligence & Reports aggregated metrics retrieved");

    // 2.4 Admin Update Remark
    const remarkRes = await fetch(`${BASE}/admin/complaints/${newComplaintId}/remark`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ admin_remark: "Reviewed by Chief Food Safety Inspector. Priority expedited." }),
    });
    const remarkData = await remarkRes.json();
    assert(remarkRes.ok && remarkData.success, "Admin updates complaint remark");

    // 2.5 Admin Update Status to VERIFIED (Triggers Authority Notification)
    const statusRes = await fetch(`${BASE}/admin/complaints/${newComplaintId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "VERIFIED" }),
    });
    const statusData = await statusRes.json();
    assert(statusRes.ok && statusData.success, "Admin verifies complaint and forwards to Authority");

    // 2.6 Admin Shop Management CRUD
    const newShopRes = await fetch(`${BASE}/shops`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        shop_name: "Suite Test Grocery Store",
        owner_name: "S. Test Owner",
        license_number: `FSSAI-${Date.now()}`,
        contact_number: "9876543210",
        email: "teststore@suite.com",
        location: "Suite Test Ward",
        address: "Lane 42, Food Plaza",
      }),
    });
    const newShopData = await newShopRes.json();
    assert(newShopRes.status === 201 && newShopData.shop.id, "Admin registers new shop with license");
    const createdShopId = newShopData.shop.id;

    // Update shop
    const updateShopRes = await fetch(`${BASE}/shops/${createdShopId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ shop_name: "Suite Test Superstore Updated" }),
    });
    const updateShopData = await updateShopRes.json();
    assert(updateShopRes.ok && updateShopData.shop.shop_name === "Suite Test Superstore Updated", "Admin updates shop details");

    // Safe delete shop
    const delShopRes = await fetch(`${BASE}/shops/${createdShopId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(delShopRes.ok, "Admin deletes/suspends shop");

    // 2.7 Admin Notifications
    const adminNotifRes = await fetch(`${BASE}/notifications/admin`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminNotifData = await adminNotifRes.json();
    assert(adminNotifRes.ok && Array.isArray(adminNotifData.notifications), "Admin retrieves notifications list");

    // Admin mark all read
    const adminMarkAllRes = await fetch(`${BASE}/notifications/admin/read-all`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminMarkAllRes.ok, "Admin marks all admin notifications as read");

    // --------------------------------------------------------
    // FLOW 3: AUTHORITY WORKFLOW
    // --------------------------------------------------------
    console.log(`\n--- 3. AUTHORITY WORKFLOW ---`);

    // 3.1 Authority login
    const authLoginRes = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "authority@foodsafety.com", password: "123456" }),
    });
    const authLoginData = await authLoginRes.json();
    assert(authLoginRes.ok && authLoginData.token, "Authority login succeeds and returns JWT");
    const authAuthorityToken = authLoginData.token;

    // 3.2 Authority verified complaints
    const authVerCompRes = await fetch(`${BASE}/authority/complaints`, {
      headers: { Authorization: `Bearer ${authAuthorityToken}` },
    });
    const authVerCompData = await authVerCompRes.json();
    assert(authVerCompRes.ok && authVerCompData.complaints.length > 0, "Authority retrieves verified complaints");

    // 3.3 Authority Cases list
    const authCasesRes = await fetch(`${BASE}/authority/cases`, {
      headers: { Authorization: `Bearer ${authAuthorityToken}` },
    });
    const authCasesData = await authCasesRes.json();
    assert(authCasesRes.ok && authCasesData.cases.length > 0, "Authority retrieves cases directory");

    // 3.4 Authority Reports
    const authRepRes = await fetch(`${BASE}/authority/reports`, {
      headers: { Authorization: `Bearer ${authAuthorityToken}` },
    });
    const authRepData = await authRepRes.json();
    assert(authRepRes.ok && authRepData.statistics, "Authority retrieves authority reports summary");

    // 3.5 Authority Updates Investigation
    const updateInvRes = await fetch(`${BASE}/authority/complaints/${newComplaintId}/investigation`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authAuthorityToken}`,
      },
      body: JSON.stringify({
        authority_name: "FSSAI District Enforcement Officer",
        investigation_status: "UNDER_INVESTIGATION",
        remarks: "Sample taken for formal laboratory analysis.",
      }),
    });
    const updateInvData = await updateInvRes.json();
    assert(updateInvRes.ok && updateInvData.success, "Authority updates investigation status");

    // 3.6 Authority Records Enforcement Action
    const recordActionRes = await fetch(`${BASE}/authority/complaints/${newComplaintId}/action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authAuthorityToken}`,
      },
      body: JSON.stringify({
        authority_name: "FSSAI District Enforcement Officer",
        action_type: "WARNING_ISSUED",
        remarks: "Formal statutory warning issued to vendor.",
      }),
    });
    const recordActionData = await recordActionRes.json();
    assert(recordActionRes.ok && recordActionData.success, "Authority records official enforcement action");

    // 3.7 Authority Investigation History
    const historyRes = await fetch(`${BASE}/authority/complaints/${newComplaintId}/history`, {
      headers: { Authorization: `Bearer ${authAuthorityToken}` },
    });
    const historyData = await historyRes.json();
    assert(historyRes.ok && historyData.history.length >= 2, `Investigation history persisted (${historyData.history?.length} audit trail records)`);

    // 3.8 Authority Notifications
    const authNotifRes = await fetch(`${BASE}/notifications/authority`, {
      headers: { Authorization: `Bearer ${authAuthorityToken}` },
    });
    const authNotifData = await authNotifRes.json();
    assert(authNotifRes.ok && Array.isArray(authNotifData.notifications), "Authority retrieves notifications list");

    // --------------------------------------------------------
    // FLOW 4: SECURITY & AUTHORIZATION TESTS
    // --------------------------------------------------------
    console.log(`\n--- 4. SECURITY & AUTHORIZATION TESTS ---`);

    // 4.1 Customer forbidden from Admin endpoints
    const secAdminRes = await fetch(`${BASE}/admin/complaints`, {
      headers: { Authorization: `Bearer ${custToken}` },
    });
    assert(secAdminRes.status === 403, "Customer blocked from Admin complaints route (403 Forbidden)");

    // 4.2 Customer forbidden from Authority endpoints
    const secAuthRes = await fetch(`${BASE}/authority/complaints`, {
      headers: { Authorization: `Bearer ${custToken}` },
    });
    assert(secAuthRes.status === 403, "Customer blocked from Authority complaints route (403 Forbidden)");

    // 4.3 Unauthenticated request blocked
    const secNoAuthRes = await fetch(`${BASE}/complaints/my`);
    assert(secNoAuthRes.status === 401, "Unauthenticated request blocked from protected route (401 Unauthorized)");

    // 4.4 Data ownership check: Customer cannot track another customer's complaint
    // Pick another complaint owned by user_id !== 1 (or mock ID)
    const otherCompRes = await fetch(`${BASE}/complaints/FSA-2026-999999`, {
      headers: { Authorization: `Bearer ${custToken}` },
    });
    assert(otherCompRes.status === 404, "Non-existent or unauthorized complaint access returns 404/403");

    // --------------------------------------------------------
    // FLOW 5: SECURITY & VALIDATION REGRESSION SUITE (PHASE 11)
    // --------------------------------------------------------
    console.log(`\n--- 5. SECURITY & VALIDATION REGRESSION SUITE ---`);

    // 5.1 Unauthenticated evidence image access returns 401
    const unauthImgRes = await fetch(`${BASE}/complaints/${newComplaintId}/images/1`);
    assert(unauthImgRes.status === 401, "Unauthenticated access to evidence image returns 401");

    // 5.2 Upload valid image with proper magic bytes and extension
    const validPngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52
    ]);
    const validForm = new FormData();
    validForm.append("food_images", new Blob([validPngBuffer], { type: "image/png" }), "evidence_sample.png");

    const uploadRes = await fetch(`${BASE}/complaints/${newComplaintId}/images`, {
      method: "POST",
      headers: { Authorization: `Bearer ${custToken}` },
      body: validForm,
    });
    const uploadData = await uploadRes.json();
    assert(uploadRes.status === 201 && Array.isArray(uploadData.images) && uploadData.images.length > 0, "Customer uploads genuine PNG evidence with verified signature");
    const testImageId = uploadData.images?.[0]?.id || 1;

    // Register / login Customer B
    const custBEmail = `customer_b_${Date.now()}@test.com`;
    await fetch(`${BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Customer B", email: custBEmail, password: "password123" }),
    });
    const custBLoginRes = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: custBEmail, password: "password123" }),
    });
    const custBToken = (await custBLoginRes.json()).token;

    // 5.3 Customer B forbidden from accessing Customer A's evidence image (403)
    const custBAccessRes = await fetch(`${BASE}/complaints/${newComplaintId}/images/${testImageId}`, {
      headers: { Authorization: `Bearer ${custBToken}` },
    });
    assert(custBAccessRes.status === 403, "Customer B forbidden from accessing Customer A evidence image (403 Forbidden)");

    // 5.4 Customer A retrieves own evidence image with correct Content-Type (200)
    const custAAccessRes = await fetch(`${BASE}/complaints/${newComplaintId}/images/${testImageId}`, {
      headers: { Authorization: `Bearer ${custToken}` },
    });
    assert(custAAccessRes.status === 200 && custAAccessRes.headers.get("content-type")?.includes("image/png"), "Customer A retrieves own evidence image (200 OK with proper Content-Type)");

    // 5.5 Admin accesses evidence image (200)
    const adminImgAccessRes = await fetch(`${BASE}/complaints/${newComplaintId}/images/${testImageId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminImgAccessRes.status === 200, "Admin authorized to access evidence image (200 OK)");

    // 5.6 Authority accesses evidence image (200)
    const authImgAccessRes = await fetch(`${BASE}/complaints/${newComplaintId}/images/${testImageId}`, {
      headers: { Authorization: `Bearer ${authAuthorityToken}` },
    });
    assert(authImgAccessRes.status === 200, "Authority authorized to access evidence image (200 OK)");

    // 5.7 Uploading invalid file extension (.txt) rejected with 400
    const badExtForm = new FormData();
    badExtForm.append("food_images", new Blob(["Malicious text script"], { type: "text/plain" }), "script.txt");
    const badExtRes = await fetch(`${BASE}/complaints/${newComplaintId}/images`, {
      method: "POST",
      headers: { Authorization: `Bearer ${custToken}` },
      body: badExtForm,
    });
    assert(badExtRes.status === 400, "Uploading invalid file extension (.txt) rejected with 400");

    // 5.8 Uploading spoofed MIME with invalid signature rejected with 400
    const spoofForm = new FormData();
    spoofForm.append("food_images", new Blob(["NOT_A_REAL_IMAGE_SIGNATURE"], { type: "image/png" }), "spoofed.png");
    const spoofRes = await fetch(`${BASE}/complaints/${newComplaintId}/images`, {
      method: "POST",
      headers: { Authorization: `Bearer ${custToken}` },
      body: spoofForm,
    });
    assert(spoofRes.status === 400, "Uploading spoofed MIME with invalid file signature rejected with 400");

    // 5.9 Customer blocked from Admin status update API (403)
    const custAdminBlockRes = await fetch(`${BASE}/admin/complaints/${newComplaintId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${custToken}`,
      },
      body: JSON.stringify({ status: "RESOLVED" }),
    });
    assert(custAdminBlockRes.status === 403, "Customer blocked from Admin status update API (403 Forbidden)");

    // 5.10 Customer blocked from Authority action API (403)
    const custAuthBlockRes = await fetch(`${BASE}/authority/complaints/${newComplaintId}/action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${custToken}`,
      },
      body: JSON.stringify({
        authority_name: "Illegal Customer",
        action_type: "WARNING",
        remarks: "Unauthorized customer action attempt",
      }),
    });
    assert(custAuthBlockRes.status === 403, "Customer blocked from Authority action API (403 Forbidden)");

    // 5.11 Admin blocked from Authority action API (403)
    const adminAuthBlockRes = await fetch(`${BASE}/authority/complaints/${newComplaintId}/action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        authority_name: "Admin Officer",
        action_type: "WARNING",
        remarks: "Unauthorized admin role calling authority endpoint",
      }),
    });
    assert(adminAuthBlockRes.status === 403, "Admin blocked from Authority action API (403 Forbidden)");

    // 5.12 Invalid JWT returns 401
    const invalidJwtRes = await fetch(`${BASE}/complaints/my`, {
      headers: { Authorization: "Bearer bad.token.signature" },
    });
    assert(invalidJwtRes.status === 401, "Invalid JWT token signature returns 401 Unauthorized");

    // 5.13 Expired JWT returns 401
    const jwtSecret = process.env.JWT_SECRET || "smart_food_safety_jwt_secret_2026";
    const expiredToken = jwt.sign({ id: 1, role: "CUSTOMER" }, jwtSecret, { expiresIn: "-10s" });
    const expiredJwtRes = await fetch(`${BASE}/complaints/my`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    assert(expiredJwtRes.status === 401, "Expired JWT token returns 401 Unauthorized");

    // 5.14 Invalid complaint status update rejected with 400
    const invalidStatusRes = await fetch(`${BASE}/admin/complaints/${newComplaintId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "NON_EXISTENT_STATUS_XYZ" }),
    });
    assert(invalidStatusRes.status === 400, "Invalid complaint status update rejected with 400 Validation Error");

    // 5.15 Invalid complaint submission (empty category/description) rejected with 400
    const invalidCompRes = await fetch(`${BASE}/complaints`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${custToken}`,
      },
      body: JSON.stringify({
        category: "",
        description: "",
      }),
    });
    assert(invalidCompRes.status === 400, "Invalid complaint submission (empty category/description) rejected with 400");

    console.log(`\n======================================================`);
    console.log(`TEST SUITE RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log(`======================================================\n`);

  } catch (err) {
    console.error("TEST EXECUTION ERROR:", err);
    exitCode = 1;
  } finally {
    if (server) {
      server.close(() => {
        process.exit(exitCode);
      });
    } else {
      process.exit(exitCode);
    }
  }
}

runTestSuite();
