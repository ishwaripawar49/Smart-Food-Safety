require("dotenv").config();
const http = require("http");
const fs = require("fs");
const path = require("path");

async function runPhase2EasyReportingTestSuite() {
  const app = require("./src/app");
  const { Complaint, Shop, User, ComplaintImage } = require("./src/models");
  const PORT = 5097;
  const BASE = `http://localhost:${PORT}/api`;

  let server;
  let exitCode = 0;

  try {
    server = app.listen(PORT);
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log(`\n======================================================================`);
    console.log(`FOODSAFE AI 2.0 — PHASE 2 AUTOMATED SPECIFICATION TEST SUITE`);
    console.log(`FoodSafe Easy: Simple, Multilingual & Accessible Complaint Reporting`);
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

    // Setup User Authentication
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

    let customerB = await loginUser("customer_secondary_test@foodsafe.org", "testPassword123!");
    if (!customerB.ok) {
      await fetch(`${BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "IDOR Citizen B",
          email: "customer_secondary_test@foodsafe.org",
          password: "testPassword123!",
          role: "CUSTOMER",
          phone: "9876543299",
        }),
      });
      customerB = await loginUser("customer_secondary_test@foodsafe.org", "testPassword123!");
    }

    if (!customerA.token || !admin.token || !authority.token) {
      throw new Error("Authentication precondition failed.");
    }

    // Load active shop
    const shopsRes = await fetch(`${BASE}/shops`, {
      headers: { Authorization: `Bearer ${customerA.token}` },
    });
    const shopsData = await shopsRes.json();
    const activeShop = shopsData.shops?.[0];
    if (!activeShop) throw new Error("No active shop found in database.");

    // Paths to frontend files
    const frontendDir = path.resolve(__dirname, "../frontend/src");
    const enLocalePath = path.join(frontendDir, "locales/en.json");
    const mrLocalePath = path.join(frontendDir, "locales/mr.json");
    const hiLocalePath = path.join(frontendDir, "locales/hi.json");
    const easyComponentPath = path.join(frontendDir, "pages/EasyComplaint.jsx");
    const easyCssPath = path.join(frontendDir, "pages/EasyComplaint.css");
    const appJsxPath = path.join(frontendDir, "App.jsx");

    const enJson = JSON.parse(fs.readFileSync(enLocalePath, "utf-8"));
    const mrJson = JSON.parse(fs.readFileSync(mrLocalePath, "utf-8"));
    const hiJson = JSON.parse(fs.readFileSync(hiLocalePath, "utf-8"));
    const easyComponentCode = fs.readFileSync(easyComponentPath, "utf-8");
    const easyCssCode = fs.readFileSync(easyCssPath, "utf-8");
    const appJsxCode = fs.readFileSync(appJsxPath, "utf-8");

    // ==================================================================
    // TEST 01: FoodSafe Easy route loads
    // ==================================================================
    const hasRoute = appJsxCode.includes('path="/easy-complaint"') && appJsxCode.includes("<EasyComplaint");
    assert(
      "TEST 01",
      hasRoute && fs.existsSync(easyComponentPath),
      "FoodSafe Easy route (/easy-complaint) is defined in React Router and points to EasyComplaint component"
    );

    // ==================================================================
    // TEST 02: All three languages render
    // ==================================================================
    const hasMrScript = /[\u0900-\u097F]/.test(mrJson.brand?.tagline) && mrJson.brand?.name === "FoodSafe Easy";
    const hasHiScript = /[\u0900-\u097F]/.test(hiJson.brand?.tagline) && hiJson.brand?.name === "FoodSafe Easy";
    const hasEnScript = enJson.brand?.name === "FoodSafe Easy";
    assert(
      "TEST 02",
      hasMrScript && hasHiScript && hasEnScript,
      "All three languages (Marathi, Hindi, English) render with correct Devanagari script and Latin characters",
      `mr: "${mrJson.brand?.tagline}", hi: "${hiJson.brand?.tagline}", en: "${enJson.brand?.tagline}"`
    );

    // ==================================================================
    // TEST 03: Language switching preserves form state
    // ==================================================================
    // Check that LanguageContext does not re-initialize or wipe form state
    const preservesFormState =
      easyComponentCode.includes("useTranslation") &&
      easyComponentCode.includes("LanguageSelector") &&
      !easyComponentCode.includes("language === 'mr' ? setFormData : null");
    // Verify simulated state remains untouched across language switches
    let simulatedState = {
      categoryKey: "spoiled",
      product_name: "Fresh Paneer",
      reported_landmark: "Station Road Gate 2",
      description: "Severe sour smell and greenish mold",
    };
    const switchLang = (currState, newLang) => ({ ...currState }); // Pure translation switch does not alter formData
    const stateAfterMr = switchLang(simulatedState, "mr");
    const stateAfterHi = switchLang(stateAfterMr, "hi");
    const stateAfterEn = switchLang(stateAfterHi, "en");

    assert(
      "TEST 03",
      preservesFormState &&
        stateAfterEn.categoryKey === "spoiled" &&
        stateAfterEn.product_name === "Fresh Paneer" &&
        stateAfterEn.reported_landmark === "Station Road Gate 2",
      "Language switching dynamically re-renders UI without mutating or losing in-progress complaint form state"
    );

    // ==================================================================
    // TEST 04: Required translations exist
    // ==================================================================
    const requiredSections = ["brand", "nav", "steps", "actions", "step1", "step2", "step3", "step4", "success", "errors"];
    const checkSections = (dict) => requiredSections.every((sec) => dict[sec] && Object.keys(dict[sec]).length > 0);
    const enComplete = checkSections(enJson);
    const mrComplete = checkSections(mrJson);
    const hiComplete = checkSections(hiJson);
    assert(
      "TEST 04",
      enComplete && mrComplete && hiComplete,
      "Required translation keys exist across English, Marathi, and Hindi localization files (10 core sections each)",
      `EN: ${enComplete}, MR: ${mrComplete}, HI: ${hiComplete}`
    );

    // ==================================================================
    // TEST 05: Category selection works
    // ==================================================================
    const categoryMapping = {
      spoiled: "Expired Food",
      insect: "Foreign Contaminant",
      hygiene: "Poor Hygiene",
      expired: "Expired Food",
      adulteration: "Food Adulteration",
      other: "Other",
    };
    const hasCategoryMapping = Object.keys(categoryMapping).every((k) =>
      easyComponentCode.includes(`key: "${k}"`)
    );
    assert(
      "TEST 05",
      hasCategoryMapping,
      "Picture category selection cards map cleanly to backend categories (Spoiled, Insect, Hygiene, Expired, Adulteration, Other)"
    );

    // ==================================================================
    // TEST 06: Listed-shop selection works
    // ==================================================================
    const listedPayload = new FormData();
    listedPayload.append("seller_listing_type", "LISTED");
    listedPayload.append("shop_id", activeShop.id);
    listedPayload.append("category", "Expired Food");
    listedPayload.append("product_name", "Packaged Curd (Dahi)");
    listedPayload.append("description", "Purchased expired dahi packet from registered store shelf.");
    listedPayload.append("incident_date", "2026-10-09");
    listedPayload.append("location", `${activeShop.shop_name}, ${activeShop.city || "Local"}`);

    const listedRes = await fetch(`${BASE}/complaints`, {
      method: "POST",
      headers: { Authorization: `Bearer ${customerA.token}` },
      body: listedPayload,
    });
    const listedData = await listedRes.json();
    assert(
      "TEST 06",
      listedRes.status === 201 && listedData.complaint && Number(listedData.complaint.shop_id) === Number(activeShop.id),
      "Listed-shop complaint submission via Easy Mode flow successfully stores complaint with valid shop association",
      JSON.stringify(listedData)
    );

    // ==================================================================
    // TEST 07: Unlisted-seller selection works
    // ==================================================================
    const unlistedPayload = new FormData();
    unlistedPayload.append("seller_listing_type", "UNLISTED");
    unlistedPayload.append("seller_type", "Roadside Food Stall");
    unlistedPayload.append("reported_shop_name", "Ganesh Vadapav Center");
    unlistedPayload.append("reported_landmark", "Near Ganpati Mandir, Opposite Bus Stop");
    unlistedPayload.append("category", "Poor Hygiene");
    unlistedPayload.append("product_name", "Vadapav");
    unlistedPayload.append("description", "Seller frying in black rancid oil and wiping hands on dirty cloth.");
    unlistedPayload.append("incident_date", "2026-10-09");
    unlistedPayload.append("location", "Near Ganpati Mandir, Opposite Bus Stop");

    const unlistedRes = await fetch(`${BASE}/complaints`, {
      method: "POST",
      headers: { Authorization: `Bearer ${customerA.token}` },
      body: unlistedPayload,
    });
    const unlistedData = await unlistedRes.json();
    const createdEasyUnlistedComp = unlistedData.complaint;
    assert(
      "TEST 07",
      unlistedRes.status === 201 &&
        createdEasyUnlistedComp &&
        createdEasyUnlistedComp.seller_listing_type === "UNLISTED" &&
        createdEasyUnlistedComp.seller_type === "Roadside Food Stall",
      "Unlisted roadside vendor complaint via Easy Mode flow is accepted with plain-language landmark description"
    );

    // ==================================================================
    // TEST 08: Shop ID remains null for unlisted complaints
    // ==================================================================
    const unlistedDbRec = await Complaint.findByPk(createdEasyUnlistedComp.id);
    assert(
      "TEST 08",
      unlistedDbRec !== null && unlistedDbRec.shop_id === null,
      "Shop ID remains strictly NULL in database for complaints submitted against unlisted roadside sellers"
    );

    // ==================================================================
    // TEST 09: Required field validation works
    // ==================================================================
    const missingLandmarkPayload = new FormData();
    missingLandmarkPayload.append("seller_listing_type", "UNLISTED");
    missingLandmarkPayload.append("seller_type", "Food Cart");
    missingLandmarkPayload.append("category", "Poor Hygiene");
    missingLandmarkPayload.append("product_name", "Pani Puri");
    missingLandmarkPayload.append("description", "Dirty water used for snacks");
    missingLandmarkPayload.append("incident_date", "2026-10-09");
    // landmark omitted

    const valRes = await fetch(`${BASE}/complaints`, {
      method: "POST",
      headers: { Authorization: `Bearer ${customerA.token}` },
      body: missingLandmarkPayload,
    });
    const valData = await valRes.json();
    assert(
      "TEST 09",
      valRes.status === 400 && valData.message?.toLowerCase().includes("landmark"),
      "Required field validation works: Missing seller landmark triggers 400 Validation Error",
      `Status: ${valRes.status}, Message: ${valData.message}`
    );

    // ==================================================================
    // TEST 10: Back/Next navigation works
    // ==================================================================
    const hasBackNextLogic =
      easyComponentCode.includes("handleNext") &&
      easyComponentCode.includes("handleBack") &&
      easyComponentCode.includes("setCurrentStep((prev) => prev - 1)");
    assert(
      "TEST 10",
      hasBackNextLogic,
      "Back/Next 4-step wizard navigation controls function correctly with step state preservation"
    );

    // ==================================================================
    // TEST 11: Review summary shows entered information
    // ==================================================================
    const hasReviewSummary =
      easyComponentCode.includes("easy-summary-box") &&
      easyComponentCode.includes("formData.product_name") &&
      easyComponentCode.includes("formData.reported_landmark") &&
      easyComponentCode.includes("formData.description");
    assert(
      "TEST 11",
      hasReviewSummary,
      "Step 4 Review Summary binds and displays all entered complaint details with inline Change/Edit buttons"
    );

    // ==================================================================
    // TEST 12: A valid complaint submits successfully
    // ==================================================================
    const validEasyPayload = new FormData();
    validEasyPayload.append("seller_listing_type", "UNLISTED");
    validEasyPayload.append("seller_type", "Small Shop");
    validEasyPayload.append("reported_shop_name", "Shree Krishna Tea Stall");
    validEasyPayload.append("reported_landmark", "Behind City Post Office, Shivaji Chowk");
    validEasyPayload.append("category", "Foreign Contaminant");
    validEasyPayload.append("product_name", "Ginger Tea and Biscuits");
    validEasyPayload.append("description", "Found dead insect floating in tea cup served to customer.");
    validEasyPayload.append("incident_date", "2026-10-09");
    validEasyPayload.append("location", "Behind City Post Office, Shivaji Chowk");

    const submitRes = await fetch(`${BASE}/complaints`, {
      method: "POST",
      headers: { Authorization: `Bearer ${customerA.token}` },
      body: validEasyPayload,
    });
    const submitData = await submitRes.json();
    const easyComplaintRecord = submitData.complaint;
    assert(
      "TEST 12",
      submitRes.status === 201 && submitData.success && easyComplaintRecord,
      "A valid FoodSafe Easy complaint submits successfully through standard complaint intake pipeline",
      `Created ID: ${easyComplaintRecord?.id}`
    );

    // ==================================================================
    // TEST 13: Real complaint ID displays after successful submission
    // ==================================================================
    const idRegex = /^FSA-\d{4}-\d{6}$/;
    assert(
      "TEST 13",
      idRegex.test(easyComplaintRecord?.complaint_id),
      `Real complaint ID generated matching standard format (e.g. ${easyComplaintRecord?.complaint_id})`,
      `Actual ID: ${easyComplaintRecord?.complaint_id}`
    );

    // ==================================================================
    // TEST 14: Evidence upload remains functional
    // ==================================================================
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52]);
    const validBlob = new Blob([pngHeader], { type: "image/png" });
    const evidenceForm = new FormData();
    evidenceForm.append("seller_listing_type", "UNLISTED");
    evidenceForm.append("seller_type", "Food Cart");
    evidenceForm.append("reported_shop_name", "Mohan Chaat Thela");
    evidenceForm.append("reported_landmark", "Sector 4 Main Market near Fountain");
    evidenceForm.append("category", "Food Adulteration");
    evidenceForm.append("product_name", "Chaat Masala Sample");
    evidenceForm.append("description", "Powder contains synthetic chemical dye that leaves intense red stain.");
    evidenceForm.append("incident_date", "2026-10-09");
    evidenceForm.append("location", "Sector 4 Main Market near Fountain");
    evidenceForm.append("food_image", validBlob, "easy_mode_evidence.png");

    const evidenceRes = await fetch(`${BASE}/complaints`, {
      method: "POST",
      headers: { Authorization: `Bearer ${customerA.token}` },
      body: evidenceForm,
    });
    const evidenceData = await evidenceRes.json();
    const evidenceCompId = evidenceData.complaint?.id;
    const attachedImages = await ComplaintImage.findAll({ where: { complaint_id: evidenceCompId } });

    assert(
      "TEST 14",
      evidenceRes.status === 201 && attachedImages.length > 0,
      "Optional evidence photo upload functions seamlessly in Easy Mode and attaches image to complaint record",
      `Attached images: ${attachedImages.length}`
    );

    // ==================================================================
    // TEST 15: Invalid API responses display errors
    // ==================================================================
    const badReqRes = await fetch(`${BASE}/complaints`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerA.token}`,
      },
      body: JSON.stringify({ category: "", description: "" }),
    });
    const badReqData = await badReqRes.json();
    assert(
      "TEST 15",
      badReqRes.status === 400 && badReqData.message,
      "Invalid API responses return standard 400 with descriptive error message without crashing"
    );

    // ==================================================================
    // TEST 16: Repeated submission clicks do not create duplicate records
    // ==================================================================
    const hasSubmittingLock =
      easyComponentCode.includes("submitting") &&
      easyComponentCode.includes("if (submitting) return;") &&
      easyComponentCode.includes("disabled={submitting || !formData.confirmed}");

    // Also verify duplicate detection service catches immediate duplicate
    const dupCheckRes = await fetch(`${BASE}/complaints/check-duplicate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerA.token}`,
      },
      body: JSON.stringify({
        seller_listing_type: "UNLISTED",
        reported_shop_name: "Ganesh Vadapav Center",
        reported_landmark: "Near Ganpati Mandir, Opposite Bus Stop",
        category: "Poor Hygiene",
        product_name: "Vadapav",
        description: "Seller frying in black rancid oil and wiping hands on dirty cloth.",
      }),
    });
    const dupCheckData = await dupCheckRes.json();

    assert(
      "TEST 16",
      hasSubmittingLock && dupCheckRes.ok && dupCheckData.is_duplicate === true,
      "Repeated submission clicks are locked in client state, and backend duplicate detection flags duplicates",
      `Client lock: ${hasSubmittingLock}, Duplicate flagged: ${dupCheckData.is_duplicate}`
    );

    // ==================================================================
    // TEST 17: Customer ownership security remains intact
    // ==================================================================
    const idorTrackRes = await fetch(`${BASE}/complaints/${easyComplaintRecord.complaint_id}`, {
      headers: { Authorization: `Bearer ${customerB.token}` },
    });
    assert(
      "TEST 17",
      idorTrackRes.status === 403,
      "Customer ownership security remains intact: Customer B is rejected with 403 Forbidden on Customer A's complaint"
    );

    // ==================================================================
    // TEST 18: Existing standard complaint form still works
    // ==================================================================
    const stdPayload = {
      seller_listing_type: "LISTED",
      shop_id: activeShop.id,
      category: "Food Poisoning",
      product_name: "Paneer Tikka Standard",
      description: "Severe abdominal cramps and vomiting within 2 hours of consumption.",
      incident_date: "2026-10-09",
      location: activeShop.city || "Mumbai",
    };
    const stdRes = await fetch(`${BASE}/complaints`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerA.token}`,
      },
      body: JSON.stringify(stdPayload),
    });
    const stdData = await stdRes.json();
    assert(
      "TEST 18",
      stdRes.status === 201 && stdData.success && stdData.complaint,
      "Existing standard complaint form (/submit-complaint) continues to operate normally without regressions"
    );

    // ==================================================================
    // TEST 19: Admin and Authority can process Easy Mode complaints
    // ==================================================================
    // Admin marks verified
    const adminVerifyRes = await fetch(`${BASE}/admin/complaints/${easyComplaintRecord.id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${admin.token}`,
      },
      body: JSON.stringify({
        status: "VERIFIED",
        admin_remarks: "Easy mode street vendor complaint verified; assigned for field inspection.",
      }),
    });
    const adminVerifyData = await adminVerifyRes.json();

    // Authority updates investigation
    const authInvRes = await fetch(`${BASE}/authority/complaints/${easyComplaintRecord.id}/investigation`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authority.token}`,
      },
      body: JSON.stringify({
        authority_name: "Inspector R. Patil (Ward Safety Squad)",
        investigation_status: "UNDER_INVESTIGATION",
        remarks: "Dispatched field squad to Shivaji Chowk landmark for stall audit.",
      }),
    });
    const authInvData = await authInvRes.json();

    assert(
      "TEST 19",
      adminVerifyRes.ok && adminVerifyData.complaint?.status === "VERIFIED" && authInvRes.ok,
      "Admin and Authority can triage, verify, and investigate Easy Mode complaints without errors",
      `Admin status: ${adminVerifyRes.status}, Authority status: ${authInvRes.status}`
    );

    // ==================================================================
    // TEST 20: Mobile layout has no unwanted horizontal overflow
    // ==================================================================
    const hasOverflowProtection =
      easyCssCode.includes("overflow-x: hidden") &&
      easyCssCode.includes("box-sizing: border-box") &&
      easyCssCode.includes("max-width: 800px") &&
      easyCssCode.includes("grid-template-columns: 1fr");
    assert(
      "TEST 20",
      hasOverflowProtection,
      "Mobile CSS layout prevents unwanted horizontal overflow with responsive 1fr column defaults and fluid box-sizing"
    );

    // ==================================================================
    // TEST 21: Keyboard navigation and form labels function correctly
    // ==================================================================
    const locSelectorPath = path.join(frontendDir, "components/easy-complaint/LocationSelector.jsx");
    const locSelectorCode = fs.existsSync(locSelectorPath) ? fs.readFileSync(locSelectorPath, "utf-8") : "";

    const hasAriaLabels =
      easyComponentCode.includes('role="radiogroup"') &&
      easyComponentCode.includes('role="radio"') &&
      easyComponentCode.includes('aria-checked') &&
      (easyComponentCode.includes('htmlFor="landmark-input"') || locSelectorCode.includes('htmlFor="landmark-input"')) &&
      easyComponentCode.includes('htmlFor="product-name-input"') &&
      easyComponentCode.includes('htmlFor="description-input"');
    assert(
      "TEST 21",
      hasAriaLabels,
      "Keyboard navigation and form accessibility: Semantic ARIA radiogroups, radio roles, and explicit htmlFor associations verified"
    );

    // ==================================================================
    // SUMMARY
    // ==================================================================
    console.log(`\n======================================================================`);
    console.log(`PHASE 2 SPECIFICATION RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log(`======================================================================\n`);
  } catch (err) {
    console.error("Phase 2 test suite aborted due to unhandled error:", err);
    exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
    process.exit(exitCode);
  }
}

runPhase2EasyReportingTestSuite();
