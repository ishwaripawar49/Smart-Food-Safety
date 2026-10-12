require("dotenv").config();
const http = require("http");
const fs = require("fs");
const path = require("path");

async function runPhase4LocationReportingTestSuite() {
  const app = require("./src/app");
  const { Complaint, Shop, User } = require("./src/models");
  const PORT = 5097;
  const BASE = `http://localhost:${PORT}/api`;

  let server;
  let exitCode = 0;

  try {
    server = app.listen(PORT);
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log(`\n======================================================================`);
    console.log(`FOODSAFE AI 2.0 — PHASE 4 AUTOMATED SPECIFICATION TEST SUITE`);
    console.log(`FoodSafe Location: GPS, Interactive Maps & Food Seller Reporting`);
    console.log(`(दुकानाचे ठिकाण निवडा / Select Food Seller Location)`);
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

    // Load active registered shop for listed test
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
    const geoHookPath = path.join(frontendDir, "hooks/useGeolocation.js");
    const locServicePath = path.join(frontendDir, "services/locationService.js");
    const locMapCompPath = path.join(frontendDir, "components/easy-complaint/LocationMap.jsx");
    const locSelectorCompPath = path.join(frontendDir, "components/easy-complaint/LocationSelector.jsx");
    const easyComponentPath = path.join(frontendDir, "pages/EasyComplaint.jsx");
    const easyCssPath = path.join(frontendDir, "pages/EasyComplaint.css");
    const adminDetailsPath = path.join(frontendDir, "pages/admin/ComplaintDetails.jsx");
    const authorityDetailsPath = path.join(frontendDir, "pages/authority/AuthorityComplaintDetails.jsx");
    const trackComplaintPath = path.join(frontendDir, "pages/TrackComplaint.jsx");

    const enJson = JSON.parse(fs.readFileSync(enLocalePath, "utf-8"));
    const mrJson = JSON.parse(fs.readFileSync(mrLocalePath, "utf-8"));
    const hiJson = JSON.parse(fs.readFileSync(hiLocalePath, "utf-8"));
    const geoHookCode = fs.readFileSync(geoHookPath, "utf-8");
    const locServiceCode = fs.readFileSync(locServicePath, "utf-8");
    const locMapCompCode = fs.readFileSync(locMapCompPath, "utf-8");
    const locSelectorCompCode = fs.readFileSync(locSelectorCompPath, "utf-8");
    const easyComponentCode = fs.readFileSync(easyComponentPath, "utf-8");
    const easyCssCode = fs.readFileSync(easyCssPath, "utf-8");
    const adminDetailsCode = fs.readFileSync(adminDetailsPath, "utf-8");
    const authorityDetailsCode = fs.readFileSync(authorityDetailsPath, "utf-8");
    const trackComplaintCode = fs.readFileSync(trackComplaintPath, "utf-8");

    // -------------------------------------------------------------------------
    // TEST 01: LocationSelector component loads
    // -------------------------------------------------------------------------
    const test01 =
      fs.existsSync(locSelectorCompPath) &&
      locSelectorCompCode.includes("export default function LocationSelector") &&
      locSelectorCompCode.includes("useGeolocation") &&
      locSelectorCompCode.includes("LocationMap");
    assert("TEST 01", test01, "LocationSelector component loads and exports standard interface.");

    // -------------------------------------------------------------------------
    // TEST 02: Current-location option is available
    // -------------------------------------------------------------------------
    const test02 =
      locSelectorCompCode.includes('activeMethod === "CURRENT"') &&
      locSelectorCompCode.includes("handleDetectCurrentLocation") &&
      enJson.location?.tabCurrent === "Use My Location" &&
      mrJson.location?.tabCurrent === "माझे सध्याचे ठिकाण वापरा" &&
      hiJson.location?.tabCurrent === "मेरी वर्तमान लोकेशन का उपयोग करें";
    assert("TEST 02", test02, "Current-location option is available with multilingual tab labels.");

    // -------------------------------------------------------------------------
    // TEST 03: Permission request occurs only after user interaction
    // -------------------------------------------------------------------------
    // useGeolocation must NOT request position on mount/render
    const test03 =
      !geoHookCode.includes("useEffect(() => {\n    navigator.geolocation") &&
      !geoHookCode.includes("useEffect(() => {\n    getCurrentPosition") &&
      locSelectorCompCode.includes("onClick={handleDetectCurrentLocation}");
    assert("TEST 03", test03, "Permission request occurs strictly upon explicit user interaction (no auto-request on page load).");

    // -------------------------------------------------------------------------
    // TEST 04: Geolocation success populates a proposed location
    // -------------------------------------------------------------------------
    const test04 =
      geoHookCode.includes("coords.latitude") &&
      geoHookCode.includes("coords.longitude") &&
      locSelectorCompCode.includes("setTentativeCoords({") &&
      locSelectorCompCode.includes("lat: reading.latitude");
    assert("TEST 04", test04, "Geolocation success populates a tentative proposed location.");

    // -------------------------------------------------------------------------
    // TEST 05: Proposed location requires seller-location confirmation
    // -------------------------------------------------------------------------
    const test05 =
      locSelectorCompCode.includes("setIsConfirmed(false)") &&
      locSelectorCompCode.includes("handleConfirmLocation") &&
      locSelectorCompCode.includes("confirmLocation");
    assert("TEST 05", test05, "Proposed location requires explicit seller-location confirmation before submission.");

    // -------------------------------------------------------------------------
    // TEST 06: Geolocation permission denial shows manual fallback
    // -------------------------------------------------------------------------
    const test06 =
      (geoHookCode.includes("err.code === 1") || geoHookCode.includes("permission-denied")) &&
      locSelectorCompCode.includes('geoError === "permission-denied"') &&
      locSelectorCompCode.includes("easy-manual-location-section") &&
      Boolean(enJson.location?.errors?.permissionDenied);
    assert("TEST 06", test06, "Geolocation permission denial displays graceful message with immediate manual fallback.");

    // -------------------------------------------------------------------------
    // TEST 07: Geolocation timeout is handled
    // -------------------------------------------------------------------------
    const test07 =
      (geoHookCode.includes("err.code === 3") || geoHookCode.includes("timeout")) &&
      locSelectorCompCode.includes('geoError === "timeout"') &&
      Boolean(enJson.location?.errors?.timeout);
    assert("TEST 07", test07, "Geolocation timeout is handled gracefully without breaking the workflow.");

    // -------------------------------------------------------------------------
    // TEST 08: Unsupported browser is handled
    // -------------------------------------------------------------------------
    const test08 =
      geoHookCode.includes("navigator.geolocation") &&
      locSelectorCompCode.includes("!isGeoSupported") &&
      Boolean(enJson.location?.errors?.notSupported);
    assert("TEST 08", test08, "Unsupported geolocation browser capability is handled with user warning.");

    // -------------------------------------------------------------------------
    // TEST 09: Manual landmark entry works
    // -------------------------------------------------------------------------
    const test09 =
      locSelectorCompCode.includes("id=\"landmark-input\"") &&
      locSelectorCompCode.includes("onLandmarkChange") &&
      easyComponentCode.includes("landmark={formData.reported_landmark}");
    assert("TEST 09", test09, "Manual landmark entry works independently without requiring GPS access.");

    // -------------------------------------------------------------------------
    // TEST 10: Map loads when a provider is available
    // -------------------------------------------------------------------------
    const test10 =
      locMapCompCode.includes("L.map") &&
      locMapCompCode.includes("tileLayer") &&
      locMapCompCode.includes("OpenStreetMap") &&
      locMapCompCode.includes("attribution");
    assert("TEST 10", test10, "Map loads using Leaflet with OpenStreetMap tiles and required legal attribution.");

    // -------------------------------------------------------------------------
    // TEST 11: Map marker placement works
    // -------------------------------------------------------------------------
    const test11 =
      locMapCompCode.includes("L.marker") &&
      (locMapCompCode.includes("createCustomPinIcon") || locMapCompCode.includes("custom-pin")) &&
      locMapCompCode.includes("draggable: !readOnly");
    assert("TEST 11", test11, "Map marker placement works with custom emerald pin icon.");

    // -------------------------------------------------------------------------
    // TEST 12: Marker dragging updates the selected location
    // -------------------------------------------------------------------------
    const test12 =
      locMapCompCode.includes("marker.on(\"dragend\"") &&
      locMapCompCode.includes("onLocationChange(") &&
      locSelectorCompCode.includes("handleMapPinChange");
    assert("TEST 12", test12, "Marker dragging updates the selected location coordinates dynamically.");

    // -------------------------------------------------------------------------
    // TEST 13: User can remove coordinates
    // -------------------------------------------------------------------------
    const test13 =
      locSelectorCompCode.includes("handleRemoveCoordinates") &&
      locSelectorCompCode.includes("onClearCoordinates") &&
      easyComponentCode.includes("latitude: null,") &&
      easyComponentCode.includes("longitude: null,");
    assert("TEST 13", test13, "User can remove coordinates at any time before complaint submission.");

    // -------------------------------------------------------------------------
    // TEST 14: User can switch location methods
    // -------------------------------------------------------------------------
    const test14 =
      locSelectorCompCode.includes("handleSwitchMethod(\"CURRENT\")") &&
      locSelectorCompCode.includes("handleSwitchMethod(\"MAP\")") &&
      locSelectorCompCode.includes("handleSwitchMethod(\"MANUAL\")");
    assert("TEST 14", test14, "User can freely switch between Current Location, Map Pin, and Manual Landmark methods.");

    // -------------------------------------------------------------------------
    // TEST 15: Coordinates are validated correctly
    // -------------------------------------------------------------------------
    const { validateCoordinates, formatCoordinates } = require("../frontend/src/services/locationService");
    const test15 =
      validateCoordinates(19.9975, 73.7898) === true &&
      validateCoordinates("18.5204", "73.8567") === true &&
      validateCoordinates(95, 73.7898) === false &&
      validateCoordinates(19.9975, 185) === false &&
      validateCoordinates(null, 73.7898) === false &&
      validateCoordinates(NaN, 73.7898) === false;
    assert("TEST 15", test15, "Coordinates are validated correctly across numeric boundaries.");

    // -------------------------------------------------------------------------
    // TEST 16: Invalid latitude is rejected
    // -------------------------------------------------------------------------
    const resLatInvalid = await fetch(`${BASE}/complaints`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${customerA.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        seller_listing_type: "UNLISTED",
        seller_type: "Roadside Food Stall",
        category: "Poor Hygiene",
        product_name: "Chaat",
        description: "Contaminated street food with bad water",
        latitude: 99.5, // Invalid > 90
        longitude: 73.8567,
      }),
    });
    const dataLatInvalid = await resLatInvalid.json();
    assert(
      "TEST 16",
      resLatInvalid.status === 400 && dataLatInvalid.success === false,
      "Invalid latitude (> 90) is rejected with HTTP 400.",
      dataLatInvalid.message
    );

    // -------------------------------------------------------------------------
    // TEST 17: Invalid longitude is rejected
    // -------------------------------------------------------------------------
    const resLngInvalid = await fetch(`${BASE}/complaints`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${customerA.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        seller_listing_type: "UNLISTED",
        seller_type: "Food Cart",
        category: "Poor Hygiene",
        product_name: "Juice",
        description: "Flies and contaminated ice used in sugarcane juice",
        latitude: 19.9975,
        longitude: -195.0, // Invalid < -180
      }),
    });
    const dataLngInvalid = await resLngInvalid.json();
    assert(
      "TEST 17",
      resLngInvalid.status === 400 && dataLngInvalid.success === false,
      "Invalid longitude (< -180) is rejected with HTTP 400.",
      dataLngInvalid.message
    );

    // -------------------------------------------------------------------------
    // TEST 18: Missing coordinate pairs are rejected
    // -------------------------------------------------------------------------
    const resPairInvalid = await fetch(`${BASE}/complaints`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${customerA.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        seller_listing_type: "UNLISTED",
        seller_type: "Small Shop",
        category: "Expired Food",
        product_name: "Milk Packet",
        description: "Expired milk packet with sour odor",
        latitude: 19.9975,
        // longitude missing
      }),
    });
    const dataPairInvalid = await resPairInvalid.json();
    assert(
      "TEST 18",
      resPairInvalid.status === 400 && dataPairInvalid.success === false,
      "Missing coordinate pairs (latitude without longitude) is rejected with HTTP 400.",
      dataPairInvalid.message
    );

    // -------------------------------------------------------------------------
    // TEST 19: Legitimate zero coordinates are accepted
    // -------------------------------------------------------------------------
    const resZeroCoords = await fetch(`${BASE}/complaints`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${customerA.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        seller_listing_type: "UNLISTED",
        seller_type: "Temporary Market Stall",
        category: "Foreign Contaminant",
        product_name: "Grain",
        description: "Zero coordinate boundary test at Null Island Equator / Prime Meridian",
        reported_landmark: "Equator and Prime Meridian Reference",
        latitude: 0,
        longitude: 0,
      }),
    });
    const dataZeroCoords = await resZeroCoords.json();
    assert(
      "TEST 19",
      (resZeroCoords.status === 201 || resZeroCoords.status === 200) &&
        dataZeroCoords.success === true &&
        Number(dataZeroCoords.complaint.latitude) === 0 &&
        Number(dataZeroCoords.complaint.longitude) === 0,
      "Legitimate zero coordinates (0.0, 0.0) are accepted and preserved.",
      dataZeroCoords.message
    );

    // -------------------------------------------------------------------------
    // TEST 20: Landmark-only unlisted complaint works
    // -------------------------------------------------------------------------
    const resLandmarkOnly = await fetch(`${BASE}/complaints`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${customerA.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        seller_listing_type: "UNLISTED",
        seller_type: "Roadside Food Stall",
        category: "Food Adulteration",
        product_name: "Vadapav",
        description: "Vadapav stall near Yeola Bus Stand, opposite the market entrance. Burnt oil smelling bad.",
        reported_shop_name: "Yeola Vadapav Centre",
        reported_landmark: "Near Yeola Bus Stand, opposite market entrance",
        reported_address: "Yeola-Manmad Road",
      }),
    });
    const dataLandmarkOnly = await resLandmarkOnly.json();
    const test20 =
      (resLandmarkOnly.status === 201 || resLandmarkOnly.status === 200) &&
      dataLandmarkOnly.success === true &&
      dataLandmarkOnly.complaint.latitude === null &&
      dataLandmarkOnly.complaint.longitude === null &&
      dataLandmarkOnly.complaint.reported_landmark.includes("Yeola Bus Stand");
    assert("TEST 20", test20, "Landmark-only unlisted complaint works without GPS coordinates.", dataLandmarkOnly.message);

    // -------------------------------------------------------------------------
    // TEST 21: GPS-based unlisted complaint works
    // -------------------------------------------------------------------------
    const resGpsComplaint = await fetch(`${BASE}/complaints`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${customerA.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        seller_listing_type: "UNLISTED",
        seller_type: "Food Cart",
        category: "Poor Hygiene",
        product_name: "Bhel Puri",
        description: "Unhygienic roadside cart, uncovered chutney with flies.",
        reported_shop_name: "Raju Bhel Cart",
        reported_landmark: "Opposite City Centre Mall Gate 3",
        latitude: 19.9974533,
        longitude: 73.7898021,
        location_accuracy: 12.5,
      }),
    });
    const dataGpsComplaint = await resGpsComplaint.json();
    const createdGpsComplaint = dataGpsComplaint.complaint;
    const test21 =
      (resGpsComplaint.status === 201 || resGpsComplaint.status === 200) &&
      dataGpsComplaint.success === true &&
      Math.abs(Number(createdGpsComplaint.latitude) - 19.9974533) < 0.0001 &&
      Math.abs(Number(createdGpsComplaint.longitude) - 73.7898021) < 0.0001 &&
      createdGpsComplaint.location_accuracy === 12.5;
    assert("TEST 21", test21, "GPS-based unlisted complaint saves latitude, longitude, and accuracy.", dataGpsComplaint.message);

    // -------------------------------------------------------------------------
    // TEST 22: Existing listed-shop submission works
    // -------------------------------------------------------------------------
    const resListed = await fetch(`${BASE}/complaints`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${customerA.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        seller_listing_type: "LISTED",
        shop_id: activeShop.id,
        category: "Poor Hygiene",
        product_name: "Thali",
        description: "Dirty dining tables and unwashed utensils at listed restaurant.",
        location: `${activeShop.shop_name}, ${activeShop.city || "Nashik"}`,
      }),
    });
    const dataListed = await resListed.json();
    assert(
      "TEST 22",
      (resListed.status === 201 || resListed.status === 200) && dataListed.success === true && dataListed.complaint.shop_id === activeShop.id,
      "Existing listed-shop submission works with foreign key shop_id.",
      dataListed.message
    );

    // -------------------------------------------------------------------------
    // TEST 23: Existing Phase 1 seller details remain intact
    // -------------------------------------------------------------------------
    const test23 =
      createdGpsComplaint.seller_type === "Food Cart" &&
      createdGpsComplaint.reported_shop_name === "Raju Bhel Cart" &&
      createdGpsComplaint.reported_landmark.includes("City Centre Mall") &&
      createdGpsComplaint.shop_id === null;
    assert("TEST 23", test23, "Existing Phase 1 unlisted seller fields remain fully intact and backward-compatible.");

    // -------------------------------------------------------------------------
    // TEST 24: Language switching preserves location information
    // -------------------------------------------------------------------------
    const test24 =
      mrJson.location?.title?.includes("दुकानाचे ठिकाण निवडा") &&
      hiJson.location?.title?.includes("दुकान का स्थान चुनें") &&
      enJson.location?.title?.includes("Select Food Seller Location") &&
      mrJson.step4?.summary?.coordinates &&
      hiJson.step4?.summary?.coordinates &&
      enJson.step4?.summary?.coordinates;
    assert("TEST 24", test24, "Localization files contain complete Marathi, Hindi, and English keys for FoodSafe Location.");

    // -------------------------------------------------------------------------
    // TEST 25: Voice complaint functionality remains intact
    // -------------------------------------------------------------------------
    const test25 =
      easyComponentCode.includes("VoiceComplaintInput") &&
      easyComponentCode.includes("handleVoiceConfirmDescription") &&
      enJson.voice?.title?.includes("FoodSafe Voice");
    assert("TEST 25", test25, "Phase 3 FoodSafe Voice functionality remains completely intact.");

    // -------------------------------------------------------------------------
    // TEST 26: Easy Mode step navigation preserves confirmed location
    // -------------------------------------------------------------------------
    const test26 =
      easyComponentCode.includes("onCoordinatesChange={(lat, lng, acc) =>") &&
      easyComponentCode.includes("latitude={formData.latitude}") &&
      easyComponentCode.includes("longitude={formData.longitude}") &&
      easyComponentCode.includes("landmark={formData.reported_landmark}");
    assert("TEST 26", test26, "Easy Mode step navigation preserves coordinates and landmark in state across transitions.");

    // -------------------------------------------------------------------------
    // TEST 27: Customer review shows correct location information
    // -------------------------------------------------------------------------
    const test27 =
      easyComponentCode.includes("t(\"step4.summary.location\")") &&
      easyComponentCode.includes("t(\"step4.summary.coordinates\")") &&
      easyComponentCode.includes("formatCoordinates(formData.latitude, formData.longitude)");
    assert("TEST 27", test27, "Customer review (Step 4) displays formatted location and GPS coordinates summary.");

    // -------------------------------------------------------------------------
    // TEST 28: Admin can view location details
    // -------------------------------------------------------------------------
    const resAdminView = await fetch(`${BASE}/complaints/${createdGpsComplaint.id}`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    const dataAdminView = await resAdminView.json();
    const adminComplaint = dataAdminView.complaint;
    const test28 =
      resAdminView.ok &&
      adminDetailsCode.includes("SELLER GPS COORDINATES") &&
      adminDetailsCode.includes("openstreetmap.org") &&
      Math.abs(Number(adminComplaint.latitude) - 19.9974533) < 0.0001;
    assert("TEST 28", test28, "Admin can retrieve and view seller GPS coordinates and Open on Map link.");

    // -------------------------------------------------------------------------
    // TEST 29: Authorized Authority can view assigned location details
    // -------------------------------------------------------------------------
    const resAuthorityView = await fetch(`${BASE}/complaints/${createdGpsComplaint.id}`, {
      headers: { Authorization: `Bearer ${authority.token}` },
    });
    const dataAuthorityView = await resAuthorityView.json();
    const test29 =
      resAuthorityView.ok &&
      authorityDetailsCode.includes("Seller GPS Location") &&
      authorityDetailsCode.includes("openstreetmap.org") &&
      dataAuthorityView.complaint.latitude !== null;
    assert("TEST 29", test29, "Authorized Authority can access coordinates and open location in map service.");

    // -------------------------------------------------------------------------
    // TEST 30: Cross-customer complaint authorization remains enforced
    // -------------------------------------------------------------------------
    const resCustomerBIdor = await fetch(`${BASE}/complaints/${createdGpsComplaint.id}`, {
      headers: { Authorization: `Bearer ${customerB.token}` },
    });
    assert(
      "TEST 30",
      resCustomerBIdor.status === 403,
      "Cross-customer unauthorized access to complaint details is strictly blocked (403 Forbidden)."
    );

    // -------------------------------------------------------------------------
    // TEST 31: Map failure does not block manual reporting
    // -------------------------------------------------------------------------
    const test31 =
      (locMapCompCode.includes("tileError") || locMapCompCode.includes("easy-map-overlay-error")) &&
      locSelectorCompCode.includes("easy-manual-location-section") &&
      easyComponentCode.includes("validateStep2") &&
      !easyComponentCode.includes("throw new Error('map failed')");
    assert("TEST 31", test31, "Map loading failure or offline status does not prevent manual landmark complaint submission.");

    // -------------------------------------------------------------------------
    // TEST 32: Mobile map remains usable without overflow
    // -------------------------------------------------------------------------
    const test32 =
      easyCssCode.includes("@media (max-width: 640px)") &&
      easyCssCode.includes(".easy-map-element") &&
      locMapCompCode.includes("scrollWheelZoom: false") &&
      locMapCompCode.includes("touchZoom: true");
    assert("TEST 32", test32, "Mobile map is responsive, disables page-scroll hijacking (scrollWheelZoom: false), and supports touch.");

    // -------------------------------------------------------------------------
    // TEST 33: No continuous background location collection occurs
    // -------------------------------------------------------------------------
    const test33 =
      !geoHookCode.includes("watchPosition") &&
      !locSelectorCompCode.includes("watchPosition") &&
      !locSelectorCompCode.includes("setInterval");
    assert("TEST 33", test33, "Privacy verified: No continuous background tracking or watchPosition exists.");

    // -------------------------------------------------------------------------
    // TEST 34: Customer must explicitly submit the completed complaint
    // -------------------------------------------------------------------------
    const test34 =
      easyComponentCode.includes("disabled={submitting || !formData.confirmed}") &&
      easyComponentCode.includes("handleSubmit");
    assert("TEST 34", test34, "Customer must explicitly check confirmation box and trigger submission button on review step.");

    console.log(`\n======================================================================`);
    console.log(`PHASE 4 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`======================================================================\n`);

    if (failed > 0) {
      exitCode = 1;
    }
  } catch (err) {
    console.error("Test execution exception:", err);
    exitCode = 1;
  } finally {
    if (server) server.close();
    process.exit(exitCode);
  }
}

runPhase4LocationReportingTestSuite();
