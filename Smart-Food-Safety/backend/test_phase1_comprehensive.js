require("dotenv").config();
const http = require("http");
const jwt = require("jsonwebtoken");

async function runComprehensivePhase1Suite() {
  const app = require("./src/app");
  const PORT = 5099;
  const BASE = `http://localhost:${PORT}/api`;

  let server;
  let exitCode = 0;

  try {
    server = app.listen(PORT);
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log(`\n======================================================================`);
    console.log(`FOODSAFE AI — PHASE 1 COMPREHENSIVE AUTOMATED VERIFICATION SUITE`);
    console.log(`Testing Server active on port ${PORT}`);
    console.log(`======================================================================\n`);

    let passed = 0;
    let failed = 0;
    let blocked = 0;

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

    // ==================================================================
    // MODULE 1: SYSTEM HEALTH & STARTUP INTEGRITY
    // ==================================================================
    console.log(`\n--- MODULE 1: SYSTEM HEALTH & DATABASE VERIFICATION ---`);

    const healthRes = await fetch(`http://localhost:${PORT}/`);
    const healthData = await healthRes.json();
    assert(healthRes.ok && healthData.success, "Root API service responds with success status");

    const dbRes = await fetch(`${BASE}/test/database`);
    const dbData = await dbRes.json();
    assert(dbRes.ok && dbData.success && dbData.totalUsers >= 1, `MySQL Sequelize connected (total users: ${dbData.totalUsers})`);

    // ==================================================================
    // MODULE 2: AUTHENTICATION & SESSION LIFECYCLE
    // ==================================================================
    console.log(`\n--- MODULE 2: AUTHENTICATION & SESSION LIFECYCLE ---`);

    // 2.1 Customer Login
    const custLoginRes = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "customer@test.com", password: "test123" }),
    });
    const custLoginData = await custLoginRes.json();
    assert(custLoginRes.ok && custLoginData.token, "Customer login succeeds and returns valid JWT");
    const custToken = custLoginData.token;
    const custUser = custLoginData.user;

    // 2.2 Customer Login with Invalid Password
    const badLoginRes = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "customer@test.com", password: "wrongpassword123" }),
    });
    assert(badLoginRes.status === 401, "Customer login with invalid credentials rejected with 401");

    // 2.3 Customer Login with Empty Credentials
    const emptyLoginRes = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "", password: "" }),
    });
    assert(emptyLoginRes.status === 400, "Customer login with empty credentials rejected with 400");

    // 2.4 Verify Customer /auth/me
    const custMeRes = await fetch(`${BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${custToken}` },
    });
    const custMeData = await custMeRes.json();
    assert(custMeRes.ok && custMeData.user.role === "CUSTOMER", "Customer /auth/me returns valid session with CUSTOMER role");

    // 2.5 Admin Login
    const adminLoginRes = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@foodsafety.gov", password: "admin123" }),
    });
    const adminLoginData = await adminLoginRes.json();
    assert(adminLoginRes.ok && adminLoginData.token && adminLoginData.user.role === "ADMIN", "Admin login succeeds with ADMIN role");
    const adminToken = adminLoginData.token;

    // 2.6 Authority Login
    const authLoginRes = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "authority@foodsafety.com", password: "123456" }),
    });
    const authLoginData = await authLoginRes.json();
    assert(authLoginRes.ok && authLoginData.token && authLoginData.user.role === "AUTHORIZED_AUTHORITY", "Authority login succeeds with AUTHORIZED_AUTHORITY role");
    const authToken = authLoginData.token;

    // 2.7 Secondary Customer Login (for IDOR tests)
    let custBToken = null;
    const custBLoginRes = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "customer_secondary_test@foodsafe.org", password: "testPassword123!" }),
    });
    if (custBLoginRes.ok) {
      const bData = await custBLoginRes.json();
      custBToken = bData.token;
    } else {
      // Register secondary customer if not exists
      const regRes = await fetch(`${BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Secondary Test Citizen",
          email: "customer_secondary_test@foodsafe.org",
          password: "testPassword123!",
          phone: "9876543210"
        }),
      });
      const regData = await regRes.json();
      if (regRes.ok) {
        const bLogin = await fetch(`${BASE}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "customer_secondary_test@foodsafe.org", password: "testPassword123!" }),
        });
        const bLogData = await bLogin.json();
        custBToken = bLogData.token;
      }
    }
    assert(custBToken !== null, "Secondary customer account active for IDOR boundary testing");

    // ==================================================================
    // MODULE 3: FOOD SHOP MANAGEMENT & DISCOVERY
    // ==================================================================
    console.log(`\n--- MODULE 3: FOOD SHOP DISCOVERY & MANAGEMENT ---`);

    // 3.1 Fetch active food shops
    const shopsRes = await fetch(`${BASE}/shops`, {
      headers: { Authorization: `Bearer ${custToken}` },
    });
    const shopsData = await shopsRes.json();
    assert(shopsRes.ok && Array.isArray(shopsData.shops) && shopsData.shops.length > 0, `Active shops retrieved (${shopsData.shops.length} establishments found)`);
    const activeShop = shopsData.shops[0];

    // 3.2 Search food shops with query
    const shopSearchRes = await fetch(`${BASE}/shops?search=${encodeURIComponent(activeShop.shop_name.slice(0, 4))}`, {
      headers: { Authorization: `Bearer ${custToken}` },
    });
    const shopSearchData = await shopSearchRes.json();
    assert(shopSearchRes.ok && Array.isArray(shopSearchData.shops) && shopSearchData.shops.length >= 1, `Shop search query matches "${activeShop.shop_name}"`);

    // 3.3 Get single shop by ID with complaint history
    const singleShopRes = await fetch(`${BASE}/shops/${activeShop.id}`, {
      headers: { Authorization: `Bearer ${custToken}` },
    });
    const singleShopData = await singleShopRes.json();
    assert(singleShopRes.ok && singleShopData.shop.id === activeShop.id, "Single shop details retrieved with complaint count");

    // 3.4 Admin registers new shop
    const randomLic = `FSSAI-${Date.now()}`;
    const newShopRes = await fetch(`${BASE}/shops`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        shop_name: "Phase1 QA Tested Bakery",
        owner_name: "Master Baker",
        address: "742 Evergreen Terrace",
        city: "Springfield",
        state: "State",
        pincode: "110001",
        phone: "9123456780",
        email: "bakery@qa-test.gov",
        license_number: randomLic,
        status: "ACTIVE"
      }),
    });
    const newShopData = await newShopRes.json();
    assert(newShopRes.status === 201 && newShopData.success, `Admin registers food business (ID: ${newShopData.shop?.id})`);
    const createdShopId = newShopData.shop?.id;

    // 3.5 Duplicate license registration rejected with 409
    const dupLicRes = await fetch(`${BASE}/shops`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        shop_name: "Duplicate License Impostor",
        license_number: randomLic,
      }),
    });
    assert(dupLicRes.status === 409, "Duplicate FSSAI license rejected with 409 Conflict");

    // 3.6 Missing shop name rejected with 400
    const emptyShopRes = await fetch(`${BASE}/shops`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        shop_name: "",
        license_number: `LIC-${Date.now()}`,
      }),
    });
    assert(emptyShopRes.status === 400, "Empty shop name rejected with 400 Validation Error");

    // 3.7 Admin updates shop details
    const updateShopRes = await fetch(`${BASE}/shops/${createdShopId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        owner_name: "Senior Master Baker (Audited)",
        city: "Metropolis",
      }),
    });
    const updateShopData = await updateShopRes.json();
    assert(updateShopRes.ok && updateShopData.shop.owner_name === "Senior Master Baker (Audited)", "Admin updates shop details successfully");

    // 3.8 Admin deletes test shop without complaints
    const delShopRes = await fetch(`${BASE}/shops/${createdShopId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(delShopRes.ok, "Admin deletes shop with zero complaints");

    // ==================================================================
    // MODULE 4: CUSTOMER COMPLAINT SUBMISSION & TRACKING
    // ==================================================================
    console.log(`\n--- MODULE 4: COMPLAINT SUBMISSION & TRACKING ---`);

    // 4.1 Valid Complaint Submission with AI Risk Scoring
    const compPayload = {
      shop_id: activeShop.id,
      category: "Food Poisoning",
      product_name: "Fresh Paneer Sample Phase1",
      description: "Severe nausea, acute vomiting, and cramps observed within 2 hours of consumption from hotel.",
      incident_date: "2026-10-08",
      location: "Phase 1 Test District",
    };
    const compSubmitRes = await fetch(`${BASE}/complaints`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${custToken}`,
      },
      body: JSON.stringify(compPayload),
    });
    const compSubmitData = await compSubmitRes.json();
    assert(compSubmitRes.status === 201 && compSubmitData.success, "Customer submits valid grievance");
    assert(compSubmitData.complaint.risk_score >= 50, `AI risk assessment computed: ${compSubmitData.complaint.risk_score}/100`);
    assert(compSubmitData.complaint.risk_level === "HIGH" || compSubmitData.complaint.risk_level === "CRITICAL", `AI risk classification: ${compSubmitData.complaint.risk_level}`);
    const testCompId = compSubmitData.complaint.id;
    const testCompNumber = compSubmitData.complaint.complaint_id;

    // 4.2 Duplicate detection check
    const dupRes = await fetch(`${BASE}/complaints/check-duplicate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${custToken}`,
      },
      body: JSON.stringify({
        shop_id: activeShop.id,
        product_name: "Fresh Paneer Sample Phase1",
        category: "Food Poisoning",
        description: "Severe nausea and vomiting after fresh paneer",
      }),
    });
    const dupData = await dupRes.json();
    assert(dupRes.ok && dupData.is_duplicate === true, `AI duplicate detection flagged potential duplicate (${dupData.similarity_score}% similarity)`);

    // 4.3 Validation: Missing category & description rejected with 400
    const badCompRes = await fetch(`${BASE}/complaints`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${custToken}`,
      },
      body: JSON.stringify({ category: "", description: "" }),
    });
    assert(badCompRes.status === 400, "Complaint submission without required fields rejected with 400");

    // 4.4 Customer fetches own complaints (/complaints/my)
    const myCompsRes = await fetch(`${BASE}/complaints/my`, {
      headers: { Authorization: `Bearer ${custToken}` },
    });
    const myCompsData = await myCompsRes.json();
    assert(myCompsRes.ok && Array.isArray(myCompsData.complaints) && myCompsData.complaints.some((c) => c.id === testCompId), "Customer retrieves personal complaints list");

    // 4.5 Customer retrieves complaint statistics (/complaints/my/statistics)
    const custStatsRes = await fetch(`${BASE}/complaints/my/statistics`, {
      headers: { Authorization: `Bearer ${custToken}` },
    });
    const custStatsData = await custStatsRes.json();
    assert(custStatsRes.ok && custStatsData.statistics.total >= 1, "Customer retrieves personal complaint statistics breakdown");

    // 4.6 Track complaint by valid complaint ID
    const trackRes = await fetch(`${BASE}/complaints/${testCompNumber}`, {
      headers: { Authorization: `Bearer ${custToken}` },
    });
    const trackData = await trackRes.json();
    assert(trackRes.ok && trackData.complaint.complaint_id === testCompNumber, `Track complaint by ID #${testCompNumber} matches backend record`);

    // 4.7 Track complaint by numeric database ID
    const trackPkRes = await fetch(`${BASE}/complaints/${testCompId}`, {
      headers: { Authorization: `Bearer ${custToken}` },
    });
    const trackPkData = await trackPkRes.json();
    assert(trackPkRes.ok && trackPkData.complaint.id === testCompId, "Track complaint by database primary key succeeds");

    // 4.8 Track non-existent complaint returns 404
    const nonExistentRes = await fetch(`${BASE}/complaints/FSA-2026-000000`, {
      headers: { Authorization: `Bearer ${custToken}` },
    });
    assert(nonExistentRes.status === 404, "Tracking non-existent complaint returns 404 Not Found");

    // 4.9 IDOR Protection: Customer B forbidden from viewing Customer A's complaint
    const idorTrackRes = await fetch(`${BASE}/complaints/${testCompNumber}`, {
      headers: { Authorization: `Bearer ${custBToken}` },
    });
    assert(idorTrackRes.status === 403, "IDOR check: Customer B forbidden from viewing Customer A complaint (403 Forbidden)");

    // 4.10 Customer notifications
    const custNotifRes = await fetch(`${BASE}/notifications/customer`, {
      headers: { Authorization: `Bearer ${custToken}` },
    });
    const custNotifData = await custNotifRes.json();
    assert(custNotifRes.ok && Array.isArray(custNotifData.notifications), "Customer receives notifications list");

    if (custNotifData.notifications.length > 0) {
      const firstNotifId = custNotifData.notifications[0].id;
      const markReadRes = await fetch(`${BASE}/notifications/${firstNotifId}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${custToken}` },
      });
      assert(markReadRes.ok, "Customer marks single notification as read");
    }

    const markAllCustRes = await fetch(`${BASE}/notifications/customer/read-all`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${custToken}` },
    });
    assert(markAllCustRes.ok, "Customer marks all notifications as read");

    // ==================================================================
    // MODULE 5: ADMIN WORKFLOW & GOVERNANCE
    // ==================================================================
    console.log(`\n--- MODULE 5: ADMIN MANAGEMENT & GOVERNANCE ---`);

    // 5.1 Admin Dashboard Statistics
    const adminStatsRes = await fetch(`${BASE}/admin/statistics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminStatsData = await adminStatsRes.json();
    assert(adminStatsRes.ok && adminStatsData.statistics.totalComplaints >= 1, "Admin dashboard statistics retrieved with real counts");

    // 5.2 Admin Intelligence & Reports
    const adminReportsRes = await fetch(`${BASE}/admin/reports`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminReportsData = await adminReportsRes.json();
    assert(adminReportsRes.ok && adminReportsData.report.resolutionRate !== undefined, "Admin reports aggregate resolution rate and trend charts");

    // 5.3 Admin fetches all complaints
    const adminAllCompRes = await fetch(`${BASE}/admin/complaints`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminAllCompData = await adminAllCompRes.json();
    assert(adminAllCompRes.ok && Array.isArray(adminAllCompData.complaints), "Admin retrieves all complaints queue");

    // 5.4 Admin updates complaint remarks
    const remarkRes = await fetch(`${BASE}/admin/complaints/${testCompId}/remark`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ admin_remark: "Verified preliminary microbiological report. High risk food poisoning." }),
    });
    assert(remarkRes.ok, "Admin records official remarks");

    // 5.5 Admin updates complaint status to VERIFIED (forwards to Authority)
    const verifyRes = await fetch(`${BASE}/admin/complaints/${testCompId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "VERIFIED" }),
    });
    const verifyData = await verifyRes.json();
    assert(verifyRes.ok && verifyData.complaint.status === "VERIFIED", "Admin marks complaint VERIFIED (auto-alerts Authority)");

    // 5.6 Invalid status transition rejected with 400
    const badStatusRes = await fetch(`${BASE}/admin/complaints/${testCompId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: "INVALID_STATUS_CODE" }),
    });
    assert(badStatusRes.status === 400, "Invalid complaint status update rejected with 400 Validation Error");

    // 5.7 Admin notifications
    const adminNotifRes = await fetch(`${BASE}/notifications/admin`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminNotifData = await adminNotifRes.json();
    assert(adminNotifRes.ok && Array.isArray(adminNotifData.notifications), "Admin retrieves admin notifications queue");

    // ==================================================================
    // MODULE 6: AUTHORITY INVESTIGATION & STATUTORY ENFORCEMENT
    // ==================================================================
    console.log(`\n--- MODULE 6: AUTHORITY INVESTIGATION WORKFLOW ---`);

    // 6.1 Authority fetches verified complaints queue
    const authQueueRes = await fetch(`${BASE}/authority/complaints`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const authQueueData = await authQueueRes.json();
    assert(authQueueRes.ok && authQueueData.complaints.some((c) => c.id === testCompId), "Authority receives verified complaint in processing queue");

    // 6.2 Authority fetches authority statistics
    const authStatsRes = await fetch(`${BASE}/authority/statistics`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const authStatsData = await authStatsRes.json();
    assert(authStatsRes.ok && authStatsData.statistics.verified >= 1, "Authority statistics accurately reflect verified caseload");

    // 6.3 Authority fetches cases directory
    const authCasesRes = await fetch(`${BASE}/authority/cases`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const authCasesData = await authCasesRes.json();
    assert(authCasesRes.ok && Array.isArray(authCasesData.cases), "Authority cases directory accessible");

    // 6.4 Authority updates investigation to UNDER_INVESTIGATION
    const updateInvRes = await fetch(`${BASE}/authority/complaints/${testCompId}/investigation`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        authority_name: "Inspector Sharma (FSSAI Zone 1)",
        investigation_status: "UNDER_INVESTIGATION",
        remarks: "On-site sanitary inspection scheduled; food sample seized for lab analysis.",
      }),
    });
    const updateInvData = await updateInvRes.json();
    assert(updateInvRes.ok && updateInvData.success, "Authority updates investigation status to UNDER_INVESTIGATION");

    // 6.5 Authority investigations queue reflects updated status
    const invQueueRes = await fetch(`${BASE}/authority/investigations`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const invQueueData = await invQueueRes.json();
    assert(invQueueRes.ok && invQueueData.complaints.some((c) => c.id === testCompId), "Complaint now listed in Active Investigations queue");

    // 6.6 Authority records statutory enforcement action (Emergency Improvement Notice)
    const actionRes = await fetch(`${BASE}/authority/complaints/${testCompId}/action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        authority_name: "Inspector Sharma (FSSAI Zone 1)",
        action_type: "IMPROVEMENT_NOTICE",
        remarks: "Section 32 Improvement Notice served; vendor instructed to sanitize storage units within 48h.",
      }),
    });
    const actionData = await actionRes.json();
    assert(actionRes.ok && actionData.success, "Authority records official statutory enforcement action");

    // 6.7 Authority investigation history audit trail persisted
    const histRes = await fetch(`${BASE}/authority/complaints/${testCompId}/history`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const histData = await histRes.json();
    assert(histRes.ok && Array.isArray(histData.history) && histData.history.length >= 2, `Audit trail verified: ${histData.history?.length} immutable history records logged`);

    // 6.8 Authority concludes investigation and marks RESOLVED
    const resolveInvRes = await fetch(`${BASE}/authority/complaints/${testCompId}/investigation`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        authority_name: "Inspector Sharma (FSSAI Zone 1)",
        investigation_status: "RESOLVED",
        remarks: "Establishment re-inspected. Corrective actions verified and penalty paid. Case closed.",
      }),
    });
    assert(resolveInvRes.ok, "Authority resolves investigation and closes case");

    // 6.9 Customer tracks updated complaint status reflecting RESOLVED
    const finalTrackRes = await fetch(`${BASE}/complaints/${testCompNumber}`, {
      headers: { Authorization: `Bearer ${custToken}` },
    });
    const finalTrackData = await finalTrackRes.json();
    assert(finalTrackRes.ok && finalTrackData.complaint.status === "RESOLVED", "Customer tracking verifies real-time status updated to RESOLVED");

    // ==================================================================
    // MODULE 7: EVIDENCE UPLOAD & SECURITY VERIFICATION
    // ==================================================================
    console.log(`\n--- MODULE 7: EVIDENCE UPLOAD & SECURITY ---`);

    // 7.1 Genuine PNG evidence upload
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52]);
    const validBlob = new Blob([pngHeader], { type: "image/png" });
    const validForm = new FormData();
    validForm.append("food_images", validBlob, "audit_evidence.png");

    const uploadRes = await fetch(`${BASE}/complaints/${testCompId}/images`, {
      method: "POST",
      headers: { Authorization: `Bearer ${custToken}` },
      body: validForm,
    });
    const uploadData = await uploadRes.json();
    assert(uploadRes.status === 201 && uploadData.success && uploadData.images.length > 0, "Genuine PNG evidence uploaded with cryptographic file verification");
    const uploadedImageId = uploadData.images[0].id;

    // 7.2 Prohibited file extension (.txt) rejected with 400
    const badExtForm = new FormData();
    badExtForm.append("food_images", new Blob(["Malicious text content"], { type: "text/plain" }), "exploit.txt");
    const badExtRes = await fetch(`${BASE}/complaints/${testCompId}/images`, {
      method: "POST",
      headers: { Authorization: `Bearer ${custToken}` },
      body: badExtForm,
    });
    assert(badExtRes.status === 400, "Prohibited file extension (.txt) rejected with 400 Validation Error");

    // 7.3 Spoofed MIME type with invalid file signature rejected with 400
    const spoofForm = new FormData();
    spoofForm.append("food_images", new Blob(["FAKE_PNG_WITH_NO_MAGIC_HEADER"], { type: "image/png" }), "spoofed.png");
    const spoofRes = await fetch(`${BASE}/complaints/${testCompId}/images`, {
      method: "POST",
      headers: { Authorization: `Bearer ${custToken}` },
      body: spoofForm,
    });
    assert(spoofRes.status === 400, "Spoofed MIME type with invalid signature rejected with 400");

    // 7.4 Evidence access control: Owner Customer accesses evidence image
    const ownImgRes = await fetch(`${BASE}/complaints/${testCompId}/images/${uploadedImageId}`, {
      headers: { Authorization: `Bearer ${custToken}` },
    });
    assert(ownImgRes.status === 200, "Complaint owner customer authorized to access evidence image (200 OK)");

    // 7.5 Evidence access control: Customer B forbidden from accessing Customer A evidence
    const idorImgRes = await fetch(`${BASE}/complaints/${testCompId}/images/${uploadedImageId}`, {
      headers: { Authorization: `Bearer ${custBToken}` },
    });
    assert(idorImgRes.status === 403, "Customer B forbidden from accessing Customer A evidence image (403 Forbidden)");

    // 7.6 Evidence access control: Admin authorized to access evidence
    const adminImgRes = await fetch(`${BASE}/complaints/${testCompId}/images/${uploadedImageId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminImgRes.status === 200, "Admin authorized to access evidence image (200 OK)");

    // 7.7 Evidence access control: Authority authorized to access evidence
    const authImgRes = await fetch(`${BASE}/complaints/${testCompId}/images/${uploadedImageId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert(authImgRes.status === 200, "Authority authorized to access evidence image (200 OK)");

    // 7.8 Evidence access control: Unauthenticated request rejected with 401
    const unauthImgRes = await fetch(`${BASE}/complaints/${testCompId}/images/${uploadedImageId}`);
    assert(unauthImgRes.status === 401, "Unauthenticated access to evidence image rejected with 401");

    // ==================================================================
    // MODULE 8: AI ADULTERATION DETECTION
    // ==================================================================
    console.log(`\n--- MODULE 8: AI ADULTERATION SCREENING ---`);

    // 8.1 FSSAI DART Standards retrieval
    const stdRes = await fetch(`${BASE}/adulteration/standards`);
    const stdData = await stdRes.json();
    assert(stdRes.ok && stdData.standards && stdData.standards.Milk, "FSSAI DART standards directory accessible");

    // 8.2 Run adulteration screening for recognized product (Milk)
    const testMilkRes = await fetch(`${BASE}/adulteration/test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${custToken}`,
      },
      body: JSON.stringify({
        sample_name: "Milk",
        test_type: "RAPID_DART",
        complaint_id: testCompId,
        notes: "Milk curds quickly at room temperature with abnormal foam.",
      }),
    });
    const testMilkData = await testMilkRes.json();
    assert(testMilkRes.status === 201 && testMilkData.success && testMilkData.test.risk_level === "High", `Adulteration test executed for Milk (${testMilkData.test?.confidence}% confidence)`);

    // 8.3 Run adulteration screening with missing sample_name rejected with 400
    const emptyTestRes = await fetch(`${BASE}/adulteration/test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${custToken}`,
      },
      body: JSON.stringify({ sample_name: "" }),
    });
    assert(emptyTestRes.status === 400, "Adulteration test without product sample name rejected with 400");

    // 8.4 Retrieve past adulteration test results
    const listTestsRes = await fetch(`${BASE}/adulteration/tests`, {
      headers: { Authorization: `Bearer ${custToken}` },
    });
    const listTestsData = await listTestsRes.json();
    assert(listTestsRes.ok && Array.isArray(listTestsData.tests) && listTestsData.tests.length >= 1, `Past adulteration tests retrieved (${listTestsData.tests?.length} records found)`);

    // ==================================================================
    // MODULE 9: ROLE-BASED ACCESS CONTROL (RBAC) & SECURITY MATRIX
    // ==================================================================
    console.log(`\n--- MODULE 9: RBAC & SECURITY BOUNDARY ENFORCEMENT ---`);

    // 9.1 Unauthenticated request to protected route returns 401
    const unauthRes = await fetch(`${BASE}/complaints/my`);
    assert(unauthRes.status === 401, "Unauthenticated request blocked from protected route (401 Unauthorized)");

    // 9.2 Invalid token signature returns 401
    const invalidSigRes = await fetch(`${BASE}/complaints/my`, {
      headers: { Authorization: "Bearer bad.token.signature" },
    });
    assert(invalidSigRes.status === 401, "Malformed JWT signature returns 401 Unauthorized");

    // 9.3 Expired token returns 401
    const jwtSecret = process.env.JWT_SECRET || "smart_food_safety_secret";
    const expiredToken = jwt.sign({ id: custUser.id, role: "CUSTOMER" }, jwtSecret, { expiresIn: "-10s" });
    const expiredRes = await fetch(`${BASE}/complaints/my`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    assert(expiredRes.status === 401, "Expired JWT token rejected with 401 Unauthorized");

    // 9.4 Customer blocked from Admin complaints route (403)
    const custAdminCompRes = await fetch(`${BASE}/admin/complaints`, {
      headers: { Authorization: `Bearer ${custToken}` },
    });
    assert(custAdminCompRes.status === 403, "Customer blocked from Admin complaints route (403 Forbidden)");

    // 9.5 Customer blocked from Admin statistics route (403)
    const custAdminStatsRes = await fetch(`${BASE}/admin/statistics`, {
      headers: { Authorization: `Bearer ${custToken}` },
    });
    assert(custAdminStatsRes.status === 403, "Customer blocked from Admin statistics route (403 Forbidden)");

    // 9.6 Customer blocked from Authority complaints route (403)
    const custAuthCompRes = await fetch(`${BASE}/authority/complaints`, {
      headers: { Authorization: `Bearer ${custToken}` },
    });
    assert(custAuthCompRes.status === 403, "Customer blocked from Authority complaints route (403 Forbidden)");

    // 9.7 Customer blocked from Authority action recording (403)
    const custAuthActRes = await fetch(`${BASE}/authority/complaints/${testCompId}/action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${custToken}`,
      },
      body: JSON.stringify({ authority_name: "Attacker", action_type: "FINE", remarks: "Unauthorized" }),
    });
    assert(custAuthActRes.status === 403, "Customer blocked from recording Authority enforcement actions (403 Forbidden)");

    // 9.8 Authority blocked from Admin complaints route (403)
    const authAdminRes = await fetch(`${BASE}/admin/complaints`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert(authAdminRes.status === 403, "Authority blocked from Admin management routes (403 Forbidden)");

    // 9.9 Admin blocked from Authority action recording (403)
    const adminAuthActRes = await fetch(`${BASE}/authority/complaints/${testCompId}/action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ authority_name: "Admin User", action_type: "FINE", remarks: "Cross-role invocation" }),
    });
    assert(adminAuthActRes.status === 403, "Admin blocked from Authority action recording (403 Forbidden)");

    console.log(`\n======================================================================`);
    console.log(`PHASE 1 TESTING RESULTS: ${passed} PASSED | ${failed} FAILED | ${blocked} BLOCKED`);
    console.log(`======================================================================\n`);

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

runComprehensivePhase1Suite();
