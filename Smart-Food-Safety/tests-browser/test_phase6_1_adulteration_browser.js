const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const BASE_FRONTEND = "http://localhost:5175";
const SCREENSHOTS_DIR = path.join(__dirname, "screenshots");

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const jwt = require(path.join(__dirname, "../backend/node_modules/jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || "smart_food_safety_jwt_secret_2026";

async function verifyAdulterationUIInBrowser() {
  console.log("\n======================================================================");
  console.log("FOODSAFE AI 2.0 — PHASE 6.1 ADULTERATION BROWSER VERIFICATION");
  console.log("Platform: Real Google Chrome via Playwright");
  console.log("Target: " + BASE_FRONTEND + "/adulteration-detection");
  console.log("======================================================================\n");

  let browser;
  let passed = 0;
  let failed = 0;

  function record(id, ok, msg) {
    if (ok) {
      console.log(`  ✅ [${id}] PASSED: ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ [${id}] FAILED: ${msg}`);
      failed++;
    }
  }

  try {
    browser = await chromium.launch({ channel: "chrome", headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    const realToken = jwt.sign(
      { id: 1, email: "citizen@foodsafe.test", role: "CUSTOMER", name: "Citizen User" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Authenticate as citizen in localStorage
    await page.goto(BASE_FRONTEND + "/login", { waitUntil: "domcontentloaded" });
    await page.evaluate((tok) => {
      localStorage.setItem("token", tok);
      localStorage.setItem("user", JSON.stringify({ id: 1, name: "Citizen User", role: "CUSTOMER", email: "citizen@foodsafe.test" }));
    }, realToken);

    await page.goto(BASE_FRONTEND + "/adulteration-detection", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("h1.page-title", { timeout: 10000 });

    // 1. Check title & badge
    const titleText = await page.textContent("h1.page-title");
    record("UI-TITLE", titleText.includes("Food Adulteration Educational Screening"), "Page title accurately displays 'Food Adulteration Educational Screening'");

    // 2. Check score label
    const content = await page.content();
    record("UI-SCORE-LABEL", content.includes("Educational Screening Guidance Score"), "Reliability index relabeled to 'Educational Screening Guidance Score'");
    record("UI-HEURISTIC-NOTE", content.includes("Heuristic benchmark based on observed test factors"), "Score subtext clarifies heuristic nature and non-calibrated probability");

    // 3. Check official FSSAI DART link
    const dartLink = await page.$("a[href='https://fssai.gov.in/dart/']");
    record("UI-FSSAI-LINK", !!dartLink, "Official FSSAI DART reference URL (https://fssai.gov.in/dart/) present on page");

    // 4. Check English disclaimer by default
    const disclaimerCard = await page.$(".card:has-text('Educational Screening Disclaimer')");
    record("UI-DISCLAIMER-CARD", !!disclaimerCard, "Prominent educational disclaimer card rendered");

    const disclaimerInitial = await disclaimerCard.textContent();
    record("UI-DISCLAIMER-EN", disclaimerInitial.includes("FoodSafe AI provides educational screening guidance"), "English educational disclaimer active by default");

    // 5. Switch to Marathi disclaimer
    await page.click("button:has-text('मराठी')");
    await page.waitForTimeout(200);
    const disclaimerMarathi = await disclaimerCard.textContent();
    record("UI-DISCLAIMER-MR", disclaimerMarathi.includes("शैक्षणिक तपासणी मार्गदर्शन") && disclaimerMarathi.includes("अधिकृत प्रयोगशाळेतील चाचणी"), "Marathi educational disclaimer renders upon clicking 'मराठी'");

    // 6. Switch to Hindi disclaimer
    await page.click("button:has-text('हिंदी')");
    await page.waitForTimeout(200);
    const disclaimerHindi = await disclaimerCard.textContent();
    record("UI-DISCLAIMER-HI", disclaimerHindi.includes("शैक्षिक स्क्रीनिंग मार्गदर्शन") && disclaimerHindi.includes("अधिकृत प्रयोगशाला परीक्षण"), "Hindi educational disclaimer renders upon clicking 'हिंदी'");

    // 7. Verify mobile layout at 375px
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    record("UI-MOBILE-NO-OVERFLOW", scrollWidth <= clientWidth + 2, `Mobile viewport (375px) has zero horizontal overflow (scrollWidth: ${scrollWidth}, clientWidth: ${clientWidth})`);

    // Screenshot
    const screenshotPath = path.join(SCREENSHOTS_DIR, "adulteration_screening_phase6_1.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`\n  📸 Captured screenshot: ${screenshotPath}`);

    record("UI-SCREENSHOT", fs.existsSync(screenshotPath), "Saved full-page browser screenshot of hardened adulteration screening interface");

  } catch (err) {
    console.error("Browser verification error:", err);
    failed++;
  } finally {
    if (browser) await browser.close();
  }

  console.log("\n======================================================================");
  console.log(`ADULTERATION BROWSER SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log("======================================================================\n");

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

verifyAdulterationUIInBrowser();
