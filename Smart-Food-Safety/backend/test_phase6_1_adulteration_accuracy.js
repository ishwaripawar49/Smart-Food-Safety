require("dotenv").config();
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const { AdulterationTest, Complaint } = require("./src/models");
const { sequelize } = require("./src/config/database");

const BASE = "http://localhost:5000/api";
const JWT_SECRET = process.env.JWT_SECRET || "smart_food_safety_jwt_secret_2026";
const testToken = jwt.sign(
  { id: 1, email: "citizen@foodsafe.test", role: "CUSTOMER" },
  JWT_SECRET,
  { expiresIn: "1h" }
);

async function runAdulterationAccuracyTests() {
  console.log("================================================================================");
  console.log("  FOODSAFE AI 2.0 — PHASE 6.1 FIX 3: ADULTERATION ACCURACY TEST SUITE");
  console.log("================================================================================");

  let passed = 0;
  let failed = 0;

  function recordPass(testId, description) {
    console.log(`[PASS] ${testId}: ${description}`);
    passed++;
  }

  function recordFail(testId, description, err) {
    console.error(`[FAIL] ${testId}: ${description}`);
    console.error("       Error:", err.message);
    failed++;
  }

  // ---------------------------------------------------------------------------
  // TEST-DART-01: No random fabricated confidence values are generated
  // ---------------------------------------------------------------------------
  try {
    const scores = [];
    for (let i = 0; i < 5; i++) {
      const res = await fetch(`${BASE}/adulteration/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${testToken}`
        },
        body: JSON.stringify({
          sample_name: "Milk",
          notes: "Diluted with water"
        })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 201, "Expected 201 Created");
      assert.ok(data.success, "Expected success true");
      scores.push(data.test.confidence);
    }

    // All scores must be strictly identical (0 standard deviation, no Math.random())
    const allIdentical = scores.every((s) => s === scores[0]);
    assert.ok(allIdentical, `All 5 runs must yield identical score, got: ${scores.join(", ")}`);
    assert.strictEqual(typeof scores[0], "number", "Score must be a number");
    recordPass("TEST-DART-01", "No random fabricated confidence values generated; deterministic protocol scoring confirmed");
  } catch (err) {
    recordFail("TEST-DART-01", "Random or non-deterministic values detected", err);
  }

  // ---------------------------------------------------------------------------
  // TEST-DART-02: Equivalent inputs produce equivalent deterministic educational guidance
  // ---------------------------------------------------------------------------
  try {
    const run1 = await fetch(`${BASE}/adulteration/test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testToken}`
      },
      body: JSON.stringify({
        sample_name: "Turmeric Powder",
        notes: "Color bled magenta upon test"
      })
    });
    const data1 = await run1.json();

    const run2 = await fetch(`${BASE}/adulteration/test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testToken}`
      },
      body: JSON.stringify({
        sample_name: "Turmeric Powder",
        notes: "Color bled magenta upon test"
      })
    });
    const data2 = await run2.json();

    assert.strictEqual(data1.test.result, data2.test.result, "Results must be identical");
    assert.strictEqual(data1.test.confidence, data2.test.confidence, "Scores must be identical");
    assert.strictEqual(data1.test.risk_level, data2.test.risk_level, "Risk levels must be identical");
    assert.deepStrictEqual(data1.test.issues, data2.test.issues, "Issues must be identical");
    recordPass("TEST-DART-02", "Equivalent inputs produce equivalent deterministic educational guidance");
  } catch (err) {
    recordFail("TEST-DART-02", "Non-deterministic educational guidance", err);
  }

  // ---------------------------------------------------------------------------
  // TEST-DART-03: The interface / API includes an educational disclaimer
  // ---------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE}/adulteration/test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testToken}`
      },
      body: JSON.stringify({ sample_name: "Ghee" })
    });
    const data = await res.json();
    assert.ok(data.test.educational_disclaimer, "educational_disclaimer must be present in response");
    assert.ok(
      data.test.educational_disclaimer.includes("educational screening guidance") &&
      data.test.educational_disclaimer.includes("Results do not confirm food adulteration"),
      "Disclaimer must explicitly state screening nature and lack of laboratory confirmation"
    );
    recordPass("TEST-DART-03", "API response explicitly contains educational screening disclaimer");
  } catch (err) {
    recordFail("TEST-DART-03", "Missing educational disclaimer in API", err);
  }

  // ---------------------------------------------------------------------------
  // TEST-DART-04: No unsupported laboratory-confirmation claim appears
  // ---------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE}/adulteration/test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testToken}`
      },
      body: JSON.stringify({ sample_name: "Cooking Oil" })
    });
    const data = await res.json();
    const serialized = JSON.stringify(data).toLowerCase();

    const prohibitedTerms = [
      "laboratory verified",
      "scientifically proven",
      "ai-certified",
      "guaranteed detection",
      "100% accurate",
      "fssai approved"
    ];

    for (const term of prohibitedTerms) {
      assert.ok(
        !serialized.includes(term),
        `Prohibited misleading term '${term}' found in response payload`
      );
    }

    assert.strictEqual(
      data.test.laboratory_confirmation_status,
      "REQUIRED_FOR_STATUTORY_ENFORCEMENT",
      "Response must state laboratory confirmation is required"
    );
    recordPass("TEST-DART-04", "No unsupported laboratory-confirmation claims present in response");
  } catch (err) {
    recordFail("TEST-DART-04", "Unsupported laboratory claims found", err);
  }

  // ---------------------------------------------------------------------------
  // TEST-DART-05: No unsupported calibrated probability is presented
  // ---------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE}/adulteration/test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testToken}`
      },
      body: JSON.stringify({ sample_name: "Honey" })
    });
    const data = await res.json();

    assert.strictEqual(
      data.test.scoring_methodology,
      "HEURISTIC_DART_BENCHMARK",
      "Scoring methodology must be identified as HEURISTIC_DART_BENCHMARK"
    );
    assert.strictEqual(
      data.test.scientific_classification,
      "Observation-Based Guidance",
      "Must be classified as Observation-Based Guidance"
    );
    assert.ok(
      !data.test.result.toLowerCase().includes("probability"),
      "Result label must not present score as statistical probability"
    );
    recordPass("TEST-DART-05", "Score correctly labeled as heuristic guidance indicator, not calibrated probability");
  } catch (err) {
    recordFail("TEST-DART-05", "Score presented as uncalibrated probability", err);
  }

  // ---------------------------------------------------------------------------
  // TEST-DART-06: Official FSSAI references are accurate
  // ---------------------------------------------------------------------------
  try {
    const stdRes = await fetch(`${BASE}/adulteration/standards`);
    const stdData = await stdRes.json();

    assert.ok(stdData.success, "Standards fetch must succeed");
    assert.strictEqual(stdData.reference_url, "https://fssai.gov.in/dart/", "Standards reference URL must point to official FSSAI DART");
    assert.ok(stdData.standards.Milk, "Standards directory must contain commodities like Milk");

    const testRes = await fetch(`${BASE}/adulteration/test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testToken}`
      },
      body: JSON.stringify({ sample_name: "Milk" })
    });
    const testData = await testRes.json();
    assert.strictEqual(
      testData.test.fssai_dart_reference?.documentation_url,
      "https://fssai.gov.in/dart/",
      "Documentation URL must be official FSSAI DART portal"
    );
    recordPass("TEST-DART-06", "Official FSSAI DART URL (https://fssai.gov.in/dart/) accurately referenced");
  } catch (err) {
    recordFail("TEST-DART-06", "FSSAI DART references missing or inaccurate", err);
  }

  // ---------------------------------------------------------------------------
  // TEST-DART-07: Existing records remain readable
  // ---------------------------------------------------------------------------
  try {
    const records = await AdulterationTest.findAll({ limit: 10 });
    assert.ok(Array.isArray(records), "Historical records must be queryable");
    if (records.length > 0) {
      const rec = records[0];
      assert.ok(rec.sample_name, "Record must have sample_name");
      assert.ok(rec.confidence !== undefined, "Record must retain confidence column value");
    }
    recordPass("TEST-DART-07", `Existing historical records (${records.length} sampled) remain fully readable`);
  } catch (err) {
    recordFail("TEST-DART-07", "Failed to read historical records", err);
  }

  // ---------------------------------------------------------------------------
  // TEST-DART-08: API consumers remain compatible
  // ---------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE}/adulteration/test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testToken}`
      },
      body: JSON.stringify({ sample_name: "Paneer" })
    });
    const data = await res.json();

    // Legacy fields required by existing tests:
    assert.ok(data.test.confidence !== undefined, "Legacy 'confidence' property must exist");
    assert.ok(data.test.risk_level !== undefined, "Legacy 'risk_level' property must exist");
    assert.ok(data.test.sample_name === "Paneer", "'sample_name' must match");
    // New fields:
    assert.ok(data.test.educational_screening_score !== undefined, "New 'educational_screening_score' must exist");
    assert.strictEqual(data.test.confidence, data.test.educational_screening_score, "Both score fields must match");
    recordPass("TEST-DART-08", "Full backward compatibility maintained for legacy API consumers");
  } catch (err) {
    recordFail("TEST-DART-08", "Legacy API backward compatibility broken", err);
  }

  // ---------------------------------------------------------------------------
  // TEST-DART-09: Marathi disclaimer renders correctly
  // ---------------------------------------------------------------------------
  try {
    const mrPath = path.join(__dirname, "../frontend/src/locales/mr.json");
    const mrContent = JSON.parse(fs.readFileSync(mrPath, "utf-8"));

    const mrDisclaimer = mrContent.intelligence?.adulterationScreening?.disclaimer;
    assert.ok(mrDisclaimer, "Marathi disclaimer must be present in mr.json");
    assert.ok(
      mrDisclaimer.includes("FoodSafe AI") &&
      mrDisclaimer.includes("शैक्षणिक तपासणी मार्गदर्शन") &&
      mrDisclaimer.includes("अधिकृत प्रयोगशाळेतील चाचणी"),
      "Marathi disclaimer must contain statutory educational warnings"
    );
    recordPass("TEST-DART-09", "Marathi educational disclaimer verified and present in localization dictionary");
  } catch (err) {
    recordFail("TEST-DART-09", "Marathi disclaimer missing or invalid", err);
  }

  // ---------------------------------------------------------------------------
  // TEST-DART-10: Hindi disclaimer renders correctly
  // ---------------------------------------------------------------------------
  try {
    const hiPath = path.join(__dirname, "../frontend/src/locales/hi.json");
    const hiContent = JSON.parse(fs.readFileSync(hiPath, "utf-8"));

    const hiDisclaimer = hiContent.intelligence?.adulterationScreening?.disclaimer;
    assert.ok(hiDisclaimer, "Hindi disclaimer must be present in hi.json");
    assert.ok(
      hiDisclaimer.includes("FoodSafe AI") &&
      hiDisclaimer.includes("शैक्षिक स्क्रीनिंग मार्गदर्शन") &&
      hiDisclaimer.includes("अधिकृत प्रयोगशाला परीक्षण"),
      "Hindi disclaimer must contain statutory educational warnings"
    );
    recordPass("TEST-DART-10", "Hindi educational disclaimer verified and present in localization dictionary");
  } catch (err) {
    recordFail("TEST-DART-10", "Hindi disclaimer missing or invalid", err);
  }

  // ---------------------------------------------------------------------------
  // TEST-DART-11: English disclaimer renders correctly
  // ---------------------------------------------------------------------------
  try {
    const enPath = path.join(__dirname, "../frontend/src/locales/en.json");
    const enContent = JSON.parse(fs.readFileSync(enPath, "utf-8"));

    const enDisclaimer = enContent.intelligence?.adulterationScreening?.disclaimer;
    assert.ok(enDisclaimer, "English disclaimer must be present in en.json");
    assert.ok(
      enDisclaimer.includes("FoodSafe AI provides educational screening guidance") &&
      enDisclaimer.includes("Results do not confirm food adulteration"),
      "English disclaimer must contain canonical wording"
    );
    recordPass("TEST-DART-11", "English educational disclaimer verified and present in localization dictionary");
  } catch (err) {
    recordFail("TEST-DART-11", "English disclaimer missing or invalid", err);
  }

  // ---------------------------------------------------------------------------
  // TEST-DART-12: Adulteration result UI works on mobile
  // ---------------------------------------------------------------------------
  try {
    const uiPath = path.join(__dirname, "../frontend/src/pages/AdulterationDetection.jsx");
    const uiContent = fs.readFileSync(uiPath, "utf-8");

    assert.ok(
      uiContent.includes("repeat(auto-fit, minmax(320px, 1fr))"),
      "Responsive wrapping layout must be used for mobile compatibility"
    );
    assert.ok(
      uiContent.includes("Educational Screening Guidance Score"),
      "UI must render 'Educational Screening Guidance Score' label"
    );
    assert.ok(
      uiContent.includes("Educational Screening Disclaimer"),
      "UI must render multilingual disclaimer component"
    );
    recordPass("TEST-DART-12", "Adulteration result UI mobile responsiveness and non-misleading labels verified");
  } catch (err) {
    recordFail("TEST-DART-12", "Adulteration UI lacks mobile responsiveness or correct labels", err);
  }

  // ---------------------------------------------------------------------------
  // TEST-DART-13: Existing complaints and related workflows remain unaffected
  // ---------------------------------------------------------------------------
  try {
    // Find or create a test complaint
    let complaint = await Complaint.findOne({ order: [["id", "DESC"]] });
    if (!complaint) {
      complaint = await Complaint.create({
        complaint_id: "FSA-2026-999001",
        customer_id: 1,
        title: "Adulteration Test Link Check",
        description: "Checking relationship preservation",
        category: "Food Adulteration",
        status: "PENDING"
      });
    }

    const res = await fetch(`${BASE}/adulteration/test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testToken}`
      },
      body: JSON.stringify({
        sample_name: "Chilli Powder",
        complaint_id: complaint.id,
        notes: "Red sediment noticed"
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201, "Test creation with complaint_id must succeed");

    const saved = await AdulterationTest.findByPk(data.test.id);
    assert.strictEqual(saved.complaint_id, complaint.id, "complaint_id link must be preserved");
    recordPass("TEST-DART-13", "Complaint linking and related workflows remain completely intact");
  } catch (err) {
    recordFail("TEST-DART-13", "Complaint linking workflow broken", err);
  }

  console.log("--------------------------------------------------------------------------------");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAdulterationAccuracyTests();
