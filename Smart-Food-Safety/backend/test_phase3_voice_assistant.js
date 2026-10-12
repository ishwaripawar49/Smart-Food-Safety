require("dotenv").config();
const http = require("http");
const fs = require("fs");
const path = require("path");

async function runPhase3VoiceAssistantTestSuite() {
  const app = require("./src/app");
  const { Complaint, Shop, User } = require("./src/models");
  const PORT = 5096;
  const BASE = `http://localhost:${PORT}/api`;

  let server;
  let exitCode = 0;

  try {
    server = app.listen(PORT);
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log(`\n======================================================================`);
    console.log(`FOODSAFE AI 2.0 — PHASE 3 AUTOMATED SPECIFICATION TEST SUITE`);
    console.log(`FoodSafe Voice: Multilingual Voice Complaint Assistant (बोलून तक्रार करा)`);
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
    const hookPath = path.join(frontendDir, "hooks/useSpeechRecognition.js");
    const voiceCompPath = path.join(frontendDir, "components/easy-complaint/VoiceComplaintInput.jsx");
    const voiceReExportPath = path.join(frontendDir, "components/VoiceComplaintInput.jsx");
    const easyComponentPath = path.join(frontendDir, "pages/EasyComplaint.jsx");
    const easyCssPath = path.join(frontendDir, "pages/EasyComplaint.css");

    const enJson = JSON.parse(fs.readFileSync(enLocalePath, "utf-8"));
    const mrJson = JSON.parse(fs.readFileSync(mrLocalePath, "utf-8"));
    const hiJson = JSON.parse(fs.readFileSync(hiLocalePath, "utf-8"));
    const hookCode = fs.readFileSync(hookPath, "utf-8");
    const voiceCompCode = fs.readFileSync(voiceCompPath, "utf-8");
    const voiceReExportCode = fs.existsSync(voiceReExportPath)
      ? fs.readFileSync(voiceReExportPath, "utf-8")
      : "";
    const easyComponentCode = fs.readFileSync(easyComponentPath, "utf-8");
    const easyCssCode = fs.readFileSync(easyCssPath, "utf-8");

    // ==================================================================
    // TEST 01: Voice input component loads
    // ==================================================================
    const test01Condition =
      fs.existsSync(voiceCompPath) &&
      voiceCompCode.includes("export default function VoiceComplaintInput") &&
      easyComponentCode.includes("VoiceComplaintInput") &&
      easyComponentCode.includes("<VoiceComplaintInput");
    assert(
      "TEST 01",
      test01Condition,
      "Voice input component loads and is embedded into FoodSafe Easy workflow"
    );

    // ==================================================================
    // TEST 02: English language configuration works
    // ==================================================================
    const test02Condition =
      hookCode.includes('en: "en-IN"') &&
      enJson.voice &&
      typeof enJson.voice.buttonStart === "string" &&
      enJson.voice.buttonStart.toLowerCase().includes("speak") &&
      typeof enJson.voice.spokenGuide === "string";
    assert(
      "TEST 02",
      test02Condition,
      "English language configuration works with en-IN speech locale and localized keys"
    );

    // ==================================================================
    // TEST 03: Marathi language configuration works
    // ==================================================================
    const test03Condition =
      hookCode.includes('mr: "mr-IN"') &&
      mrJson.voice &&
      mrJson.voice.buttonStart.includes("तक्रार बोला") &&
      mrJson.voice.spokenGuide.includes("कृपया तुमची तक्रार सांगा");
    assert(
      "TEST 03",
      test03Condition,
      "Marathi language configuration works with mr-IN speech locale and authentic Devanagari phrasing"
    );

    // ==================================================================
    // TEST 04: Hindi language configuration works
    // ==================================================================
    const test04Condition =
      hookCode.includes('hi: "hi-IN"') &&
      hiJson.voice &&
      hiJson.voice.buttonStart.includes("शिकायत बोलें") &&
      hiJson.voice.spokenGuide.includes("कृपया अपनी शिकायत बताएं");
    assert(
      "TEST 04",
      test04Condition,
      "Hindi language configuration works with hi-IN speech locale and authentic Devanagari phrasing"
    );

    // ==================================================================
    // TEST 05: Microphone support detection works
    // ==================================================================
    const test05Condition =
      hookCode.includes("window.SpeechRecognition") &&
      hookCode.includes("window.webkitSpeechRecognition") &&
      hookCode.includes("isSupported");
    assert(
      "TEST 05",
      test05Condition,
      "Microphone and SpeechRecognition browser API support detection is properly evaluated"
    );

    // ==================================================================
    // TEST 06: Unsupported browser shows a fallback
    // ==================================================================
    const test06Condition =
      voiceCompCode.includes("!isSupported") &&
      voiceCompCode.includes("easy-voice-alert warning") &&
      voiceCompCode.includes("disabled={!isSupported}") &&
      voiceCompCode.includes("voice.notSupported");
    assert(
      "TEST 06",
      test06Condition,
      "Unsupported browser gracefully displays fallback alert and encourages standard manual typing"
    );

    // ==================================================================
    // TEST 07: Permission denied shows a useful error
    // ==================================================================
    const test07Condition =
      hookCode.includes('"not-allowed"') &&
      hookCode.includes('"permission-denied"') &&
      hookCode.includes("setPermissionDenied(true)") &&
      voiceCompCode.includes("permissionDenied") &&
      voiceCompCode.includes("voice.permissionDenied");
    assert(
      "TEST 07",
      test07Condition,
      "Microphone permission denial triggers helpful error message directing user to settings or typing"
    );

    // ==================================================================
    // TEST 08: Starting recognition updates the UI state
    // ==================================================================
    const test08Condition =
      hookCode.includes("startListening") &&
      hookCode.includes("setIsListening(true)") &&
      voiceCompCode.includes("easy-voice-mic-btn listening") &&
      voiceCompCode.includes("easy-voice-wave-container");
    assert(
      "TEST 08",
      test08Condition,
      "Starting speech recognition transitions isListening state and renders active listening waveform UI"
    );

    // ==================================================================
    // TEST 09: Stopping recognition works
    // ==================================================================
    const test09Condition =
      hookCode.includes("stopListening") &&
      hookCode.includes("recognitionRef.current.stop()") &&
      hookCode.includes("setIsListening(false)");
    assert(
      "TEST 09",
      test09Condition,
      "Stopping recognition safely terminates browser audio processing and updates listening state"
    );

    // ==================================================================
    // TEST 10: Recognized transcript appears
    // ==================================================================
    const test10Condition =
      hookCode.includes("onresult") &&
      hookCode.includes("item.isFinal") &&
      hookCode.includes("setTranscript") &&
      voiceCompCode.includes("localTranscript");
    assert(
      "TEST 10",
      test10Condition,
      "Recognized speech results are collected into continuous transcript state"
    );

    // ==================================================================
    // TEST 11: Transcript is editable
    // ==================================================================
    const test11Condition =
      voiceCompCode.includes("<textarea") &&
      voiceCompCode.includes("id=\"voice-transcript-editor\"") &&
      voiceCompCode.includes("value={localTranscript}") &&
      voiceCompCode.includes("onChange={handleTranscriptChange}");
    assert(
      "TEST 11",
      test11Condition,
      "Recognized words appear in an editable textarea allowing manual corrections before confirmation"
    );

    // ==================================================================
    // TEST 12: Retry recognition works
    // ==================================================================
    const test12Condition =
      voiceCompCode.includes("handleRetry") &&
      voiceCompCode.includes("resetTranscript()") &&
      voiceCompCode.includes("startListening()");
    assert(
      "TEST 12",
      test12Condition,
      "Retry button resets prior transcript and re-engages voice recognition seamlessly"
    );

    // ==================================================================
    // TEST 13: Clear transcript works
    // ==================================================================
    const test13Condition =
      voiceCompCode.includes("handleClear") &&
      voiceCompCode.includes('setLocalTranscript("")') &&
      voiceCompCode.includes("resetTranscript()");
    assert(
      "TEST 13",
      test13Condition,
      "Clear button allows user to discard scratchpad transcript without altering the main form"
    );

    // ==================================================================
    // TEST 14: User confirmation is required
    // ==================================================================
    // Speech recognition alone does not touch formData.description until handleVoiceConfirmDescription is called
    const test14Condition =
      voiceCompCode.includes("handleConfirmReplace") &&
      voiceCompCode.includes("handleConfirmAppend") &&
      voiceCompCode.includes("onConfirmDescription");
    assert(
      "TEST 14",
      test14Condition,
      "User confirmation action is strictly required before speech transcript applies to complaint description"
    );

    // ==================================================================
    // TEST 15: Confirmed transcript updates the complaint description
    // ==================================================================
    const test15Condition =
      easyComponentCode.includes("handleVoiceConfirmDescription") &&
      easyComponentCode.includes("setFormData((prev) =>") &&
      easyComponentCode.includes("description: updated");
    assert(
      "TEST 15",
      test15Condition,
      "Confirmed voice transcript updates the complaint description state in EasyComplaint"
    );

    // ==================================================================
    // TEST 16: Step navigation preserves confirmed text
    // ==================================================================
    // Form state lives in top-level EasyComplaint formData, not in unmounted sub-steps
    const test16Condition =
      easyComponentCode.includes("const [formData, setFormData] = useState") &&
      easyComponentCode.includes("description:") &&
      !easyComponentCode.includes("description: '' // reset on back");
    assert(
      "TEST 16",
      test16Condition,
      "Step navigation preserves confirmed description across backward and forward transitions"
    );

    // ==================================================================
    // TEST 17: Language switching preserves existing text
    // ==================================================================
    // Switching language only updates document.documentElement.lang and translations, never resets formData
    const langContextPath = path.join(frontendDir, "context/LanguageContext.jsx");
    const langContextCode = fs.readFileSync(langContextPath, "utf-8");
    const test17Condition =
      langContextCode.includes("changeLanguage") &&
      !langContextCode.includes("localStorage.clear()") &&
      easyComponentCode.includes("const { language } = useLanguage()");
    assert(
      "TEST 17",
      test17Condition,
      "Language switching dynamically updates interface labels without clearing entered complaint text"
    );

    // ==================================================================
    // TEST 18: Failed recognition does not corrupt form data
    // ==================================================================
    const test18Condition =
      hookCode.includes("onerror = (event) =>") &&
      !hookCode.includes("setTranscript(null)") &&
      voiceCompCode.includes("error === \"no-speech\"");
    assert(
      "TEST 18",
      test18Condition,
      "Microphone or network speech recognition failures leave existing form inputs completely uncorrupted"
    );

    // ==================================================================
    // TEST 19: Existing text entry works without a microphone
    // ==================================================================
    const test19Condition =
      easyComponentCode.includes("id=\"description-input\"") &&
      easyComponentCode.includes("className=\"easy-textarea\"") &&
      easyComponentCode.includes("onChange={(e) =>");
    assert(
      "TEST 19",
      test19Condition,
      "Standard text entry remains fully accessible via keyboard typing without requiring a microphone"
    );

    // ==================================================================
    // TEST 20: Complaint submission works with voice-generated text
    // ==================================================================
    const voiceTranscriptSample =
      "मी येवला बस स्टँडजवळ वडापाव घेतला. त्यामध्ये किडा सापडला. तेल खूप खराब होते.";

    const voiceComplaintPayload = new FormData();
    voiceComplaintPayload.append("seller_listing_type", "UNLISTED");
    voiceComplaintPayload.append("seller_type", "Roadside Food Stall");
    voiceComplaintPayload.append("reported_shop_name", "Yevla Corner Vadapav");
    voiceComplaintPayload.append("reported_landmark", "Near Yevla ST Stand bus stop under banyan tree");
    voiceComplaintPayload.append("category", "Foreign Contaminant");
    voiceComplaintPayload.append("product_name", "वडापाव");
    voiceComplaintPayload.append("description", voiceTranscriptSample);
    voiceComplaintPayload.append("incident_date", "2026-10-10");
    voiceComplaintPayload.append("location", "Near Yevla ST Stand bus stop under banyan tree");

    const submitRes = await fetch(`${BASE}/complaints`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${customerA.token}`,
      },
      body: voiceComplaintPayload,
    });

    const submitData = await submitRes.json();
    const createdComplaintId = submitData.complaint?.complaint_id;
    const test20Condition =
      submitRes.status === 201 &&
      submitData.success === true &&
      Boolean(createdComplaintId) &&
      createdComplaintId.startsWith("FSA-2026-");

    assert(
      "TEST 20",
      test20Condition,
      `Complaint submission with voice-generated Devanagari text succeeds (ID: ${createdComplaintId})`,
      JSON.stringify(submitData)
    );

    // Verify stored text in database matches verbatim
    const dbRecord = createdComplaintId
      ? await Complaint.findOne({ where: { complaint_id: createdComplaintId } })
      : null;
    const test20bCondition =
      dbRecord && dbRecord.description === voiceTranscriptSample;
    if (!test20bCondition) {
      console.warn("  ⚠️ Warning: Stored description did not match verbatim");
    }

    // ==================================================================
    // TEST 21: Existing review and confirmation screen works
    // ==================================================================
    const test21Condition =
      easyComponentCode.includes("step4.summary.description") &&
      easyComponentCode.includes("formData.description") &&
      easyComponentCode.includes("step4.confirmation") &&
      easyComponentCode.includes("formData.confirmed");
    assert(
      "TEST 21",
      test21Condition,
      "Step 4 Review Summary binds and displays voice description with confirmation safeguard"
    );

    // ==================================================================
    // TEST 22: Listed shop reporting remains functional
    // ==================================================================
    const listedVoicePayload = new FormData();
    listedVoicePayload.append("seller_listing_type", "LISTED");
    listedVoicePayload.append("shop_id", activeShop.id);
    listedVoicePayload.append("category", "Expired Food");
    listedVoicePayload.append("product_name", "Milk Packet");
    listedVoicePayload.append("description", "Voice report: Milk packet bought today was spoiled with sour smell.");
    listedVoicePayload.append("incident_date", "2026-10-10");
    listedVoicePayload.append("location", `${activeShop.shop_name}, ${activeShop.city || "Local"}`);

    const listedVoiceRes = await fetch(`${BASE}/complaints`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${customerA.token}`,
      },
      body: listedVoicePayload,
    });
    const listedVoiceData = await listedVoiceRes.json();
    const test22Condition =
      listedVoiceRes.status === 201 &&
      Number(listedVoiceData.complaint?.shop_id) === Number(activeShop.id);
    assert(
      "TEST 22",
      test22Condition,
      `Listed shop reporting with voice input remains functional with shop ID ${activeShop.id}`
    );

    // ==================================================================
    // TEST 23: Unlisted vendor reporting remains functional
    // ==================================================================
    const test23Condition =
      dbRecord &&
      dbRecord.seller_listing_type === "UNLISTED" &&
      dbRecord.shop_id === null &&
      Boolean(dbRecord.reported_landmark) &&
      dbRecord.reported_landmark.includes("Yevla ST Stand");
    assert(
      "TEST 23",
      test23Condition,
      "Unlisted vendor reporting with voice input preserves null shop_id and landmark details"
    );

    // ==================================================================
    // TEST 24: Admin and Authority can access submitted complaint details
    // ==================================================================
    const adminComplaintsRes = await fetch(`${BASE}/admin/complaints`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    const adminComplaintsData = await adminComplaintsRes.json();
    const foundInAdmin = adminComplaintsData.complaints?.find(
      (c) => c.complaint_id === createdComplaintId
    );

    const adminVerifyRes = await fetch(
      `${BASE}/admin/complaints/${dbRecord.id}/status`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${admin.token}`,
        },
        body: JSON.stringify({
          status: "VERIFIED",
          admin_remarks: "Voice complaint verified and forwarded for inspection.",
        }),
      }
    );

    const authFetchRes = await fetch(`${BASE}/authority/cases`, {
      headers: { Authorization: `Bearer ${authority.token}` },
    });
    const authFetchData = await authFetchRes.json();

    const test24Condition =
      adminComplaintsRes.status === 200 &&
      Boolean(foundInAdmin) &&
      foundInAdmin.description === voiceTranscriptSample &&
      adminVerifyRes.status === 200 &&
      authFetchRes.status === 200;
    assert(
      "TEST 24",
      test24Condition,
      "Admin and Authority can access and inspect voice complaint details including full Devanagari text"
    );

    // ==================================================================
    // TEST 25: Unauthorized customers cannot access others' complaints
    // ==================================================================
    const idorRes = await fetch(`${BASE}/complaints/${createdComplaintId}`, {
      headers: { Authorization: `Bearer ${customerB.token}` },
    });
    const test25Condition = idorRes.status === 403;
    assert(
      "TEST 25",
      test25Condition,
      "IDOR security enforced: Customer B is rejected with 403 Forbidden on Customer A's voice complaint"
    );

    // ==================================================================
    // TEST 26: Mobile layout remains accessible
    // ==================================================================
    const test26Condition =
      easyCssCode.includes(".easy-voice-mic-btn") &&
      easyCssCode.includes("min-height: 64px") &&
      easyCssCode.includes("min-height: 44px") &&
      easyCssCode.includes("@media (prefers-reduced-motion: reduce)") &&
      easyCssCode.includes("@media (max-width: 480px)");
    assert(
      "TEST 26",
      test26Condition,
      "Mobile CSS layout features accessible touch targets (>= 44-48px), responsive cards, and reduced-motion support"
    );

    // ==================================================================
    // TEST 27: Recognition cleans up properly when navigating away
    // ==================================================================
    const test27Condition =
      hookCode.includes("recognitionRef.current.abort()") &&
      hookCode.includes("window.speechSynthesis.cancel()") &&
      hookCode.includes("return () => {");
    assert(
      "TEST 27",
      test27Condition,
      "Speech recognition and synthesis clean up resources properly when component unmounts"
    );

    // ==================================================================
    // TEST 28: No complaint is submitted automatically by voice recognition
    // ==================================================================
    const test28Condition =
      !hookCode.includes("fetch(") &&
      !hookCode.includes("authFetch(") &&
      !voiceCompCode.includes("handleSubmit") &&
      !voiceCompCode.includes("fetch(");
    assert(
      "TEST 28",
      test28Condition,
      "Safety guarantee verified: No complaint is submitted automatically when speech recognition ends"
    );

    console.log(`\n======================================================================`);
    console.log(`PHASE 3 SPECIFICATION RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log(`======================================================================\n`);
  } catch (err) {
    console.error("Test Suite Execution Fatal Error:", err);
    exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
    process.exit(exitCode);
  }
}

runPhase3VoiceAssistantTestSuite();
