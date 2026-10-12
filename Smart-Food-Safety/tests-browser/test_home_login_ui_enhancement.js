const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const BASE_FRONTEND = "http://localhost:5175";
const BASE_BACKEND = "http://localhost:5000/api";
const SCREENSHOTS_DIR = path.join(__dirname, "screenshots");

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

let passedTests = 0;
let failedTests = 0;
const resultsLog = [];

function recordResult(testId, passed, message, details = "") {
  if (passed) {
    console.log(`  ✅ [${testId}] PASSED: ${message}`);
    passedTests++;
    resultsLog.push({ id: testId, status: "PASSED", message, details });
  } else {
    console.error(`  ❌ [${testId}] FAILED: ${message}`);
    if (details) console.error(`     Details: ${details}`);
    failedTests++;
    resultsLog.push({ id: testId, status: "FAILED", message, details });
  }
}

async function runTestSuite() {
  console.log(`\n======================================================================`);
  console.log(`FOODSAFE AI 2.0 — HOME & LOGIN PAGE PREMIUM UI VERIFICATION SUITE`);
  console.log(`Platform: Local Google Chrome via Playwright runner`);
  console.log(`Frontend: ${BASE_FRONTEND} | Backend: ${BASE_BACKEND}`);
  console.log(`======================================================================\n`);

  let browser;
  try {
    try {
      browser = await chromium.launch({
        channel: "chrome",
        headless: true,
      });
      console.log(`[SETUP] Google Chrome launched successfully (${browser.version()}).\n`);
    } catch (err) {
      browser = await chromium.launch({
        executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        headless: true,
      });
      console.log(`[SETUP] Chrome launched via explicit path (${browser.version()}).\n`);
    }

    recordResult("SETUP-BROWSER", !!browser, "Local Chrome launched successfully");

    const page = await browser.newPage();
    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // ----------------------------------------------------
    // TEST 1: HOME PAGE DESKTOP VERIFICATION (1440px)
    // ----------------------------------------------------
    console.log("\n[TEST SUITE 1] HOME PAGE DESKTOP UI VERIFICATION");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_FRONTEND}/`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    // Verify Hero elements
    const heroHeading = await page.textContent(".hero-headline");
    recordResult(
      "HOME-HERO-HEADING",
      heroHeading && heroHeading.includes("Safer Food for") && heroHeading.includes("Healthier Communities"),
      "Hero heading matches approved 'Safer Food for Healthier Communities'",
      heroHeading
    );

    const heroDesc = await page.textContent(".hero-desc");
    recordResult(
      "HOME-HERO-DESC",
      heroDesc && heroDesc.includes("Report food safety concerns"),
      "Hero description explains community food safety goals",
      heroDesc
    );

    // Check CTAs
    const reportBtn = await page.$("#hero-report-btn");
    const easyBtn = await page.$("#hero-easy-complaint-btn");
    recordResult("HOME-CTA-REPORT", !!reportBtn, "Primary CTA '#hero-report-btn' (Report Food Problem) is present");
    recordResult("HOME-CTA-EASY", !!easyBtn, "Secondary CTA '#hero-easy-complaint-btn' (FoodSafe Easy) is present");

    // Check Hero Produce Basket Visual
    const heroBasketImg = await page.$(".hero-produce-img");
    const heroImgLoaded = await page.evaluate((el) => el && el.complete && el.naturalWidth > 0, heroBasketImg);
    recordResult("HOME-HERO-IMG", heroImgLoaded, "Hero produce basket image loaded successfully without broken assets");

    // Check Floating Badges
    const floatBadges = await page.$$(".hero-float-card");
    recordResult("HOME-FLOAT-BADGES", floatBadges.length >= 2, `Hero floating badges present (found ${floatBadges.length})`);

    // Screenshot Desktop Home
    const desktopHomeScreenshot = path.join(SCREENSHOTS_DIR, "home_page_desktop_1440px.png");
    await page.screenshot({ path: desktopHomeScreenshot, fullPage: false });
    console.log(`  📸 Screenshot saved: ${desktopHomeScreenshot}`);

    // ----------------------------------------------------
    // TEST 2: 4 ENHANCED FEATURE CARDS
    // ----------------------------------------------------
    console.log("\n[TEST SUITE 2] FOUR ENHANCED FEATURE CARDS");
    const feature1 = await page.$("#feat-file-complaint");
    const feature2 = await page.$("#feat-add-location");
    const feature3 = await page.$("#feat-use-voice");
    const feature4 = await page.$("#feat-create-change");

    recordResult("FEATURE-1-COMPLAINT", !!feature1, "Card 1: 'File a Complaint' is present");
    recordResult("FEATURE-2-LOCATION", !!feature2, "Card 2: 'Add Location' (GPS/Maps) is present");
    recordResult("FEATURE-3-VOICE", !!feature3, "Card 3: 'Use Your Voice' (Speech recognition) is present");
    recordResult("FEATURE-4-CHANGE", !!feature4, "Card 4: 'Help Create Change' is present");

    // ----------------------------------------------------
    // TEST 3: WHY FOODSAFE AI SECTION & COLLAGE
    // ----------------------------------------------------
    console.log("\n[TEST SUITE 3] WHY FOODSAFE AI SECTION & COLLAGE");
    const whySection = await page.$(".why-section");
    recordResult("WHY-SECTION-EXISTS", !!whySection, "Why FoodSafe AI informational section is present");

    const collageImg = await page.$(".why-img");
    const collageLoaded = await page.evaluate((el) => el && el.complete && el.naturalWidth > 0, collageImg);
    recordResult("WHY-COLLAGE-IMG", collageLoaded, "Food variety collage image (vegetables, milk, grains, spices) loaded successfully");

    const foodTags = await page.$$eval(".why-food-tag", (tags) => tags.map((t) => t.textContent.trim()));
    recordResult(
      "WHY-FOOD-TAGS",
      foodTags.includes("Fresh Vegetables") && foodTags.includes("Pure Milk") && foodTags.includes("Whole Grains") && foodTags.includes("Natural Spices"),
      "Collage includes 4 food categories (Vegetables, Milk, Grains, Spices)",
      foodTags.join(", ")
    );

    const pillars = await page.$$eval(".why-pillar-body h4", (els) => els.map((e) => e.textContent.trim()));
    recordResult(
      "WHY-4-PILLARS",
      pillars.includes("Report Unsafe Food") &&
        pillars.includes("Support Food Safety Review") &&
        pillars.includes("Explainable AI Insights") &&
        pillars.includes("Healthier Communities"),
      "Why section contains all 4 key benefit pillars",
      pillars.join(", ")
    );

    const disclaimer = await page.$(".why-disclaimer-card");
    recordResult("WHY-DISCLAIMER", !!disclaimer, "Independent platform triage disclaimer note is clearly displayed");

    // ----------------------------------------------------
    // TEST 4: LOGIN PAGE DESKTOP SPLIT-SCREEN (1440px)
    // ----------------------------------------------------
    console.log("\n[TEST SUITE 4] LOGIN PAGE SPLIT-SCREEN VERIFICATION");
    await page.goto(`${BASE_FRONTEND}/login`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    // Left Panel Checks
    const brandPanel = await page.$(".login-brand-panel");
    const brandHeading = await page.$eval(".login-brand-content h1", (el) => el.textContent.replace(/\s+/g, " ").trim());
    recordResult(
      "LOGIN-LEFT-HEADING",
      brandHeading && brandHeading.includes("Safe Food Brighter Communities"),
      "Left panel displays 'Safe Food Brighter Communities' headline",
      brandHeading
    );

    const brandSubtext = await page.$eval(".login-brand-content p", (el) => el.textContent.trim());
    recordResult(
      "LOGIN-LEFT-SUBTEXT",
      brandSubtext && brandSubtext.includes("Together, we can identify food safety concerns"),
      "Left panel displays approved supporting community message",
      brandSubtext
    );

    // Right Panel Checks
    const formPanel = await page.$(".login-form-panel");
    recordResult("LOGIN-RIGHT-PANEL", !!formPanel, "Right panel clean white card is present");

    // STRICT GUARANTEE: NO Google OAuth Button
    const googleBtn = await page.$("button:has-text('Google'), button:has-text('Sign in with Google'), .google-btn");
    recordResult("LOGIN-NO-GOOGLE-OAUTH", !googleBtn, "Verified NO non-functional Google login button exists");

    // Check Role Selector Tabs
    const roleBtns = await page.$$eval(".login-form-inner button[type='button']", (btns) =>
      btns.map((b) => b.textContent.trim()).filter((t) => t.length > 0)
    );
    recordResult(
      "LOGIN-ROLE-TABS",
      roleBtns.some((t) => t.includes("Citizen")) && roleBtns.some((t) => t.includes("Administrator")) && roleBtns.some((t) => t.includes("FSSAI Authority")),
      "Role selector tabs present: Citizen, Administrator, FSSAI Authority",
      roleBtns.join(" | ")
    );

    // Check Demo Credentials Auto-Fill
    const fillDemoBtn = await page.$("button:has-text('Fill demo credentials')");
    recordResult("LOGIN-DEMO-FILL-BTN", !!fillDemoBtn, "'Fill demo credentials' helper button is present");

    await fillDemoBtn.click();
    await page.waitForTimeout(100);
    const filledEmail = await page.$eval("#login-email", (el) => el.value);
    const filledPassword = await page.$eval("#login-password", (el) => el.value);
    recordResult(
      "LOGIN-DEMO-FILL-VALUES",
      filledEmail === "customer@test.com" && filledPassword === "test123",
      `Demo fill populated customer credentials correctly (${filledEmail})`
    );

    // Password Visibility Toggle
    const passInputType1 = await page.$eval("#login-password", (el) => el.type);
    const toggleBtn = await page.$(".password-toggle");
    await toggleBtn.click();
    const passInputType2 = await page.$eval("#login-password", (el) => el.type);
    await toggleBtn.click();
    const passInputType3 = await page.$eval("#login-password", (el) => el.type);
    recordResult(
      "LOGIN-PASSWORD-TOGGLE",
      passInputType1 === "password" && passInputType2 === "text" && passInputType3 === "password",
      "Password show/hide toggle toggles input between 'password' and 'text'"
    );

    // Screenshot Desktop Login
    const desktopLoginScreenshot = path.join(SCREENSHOTS_DIR, "login_page_desktop_1440px.png");
    await page.screenshot({ path: desktopLoginScreenshot, fullPage: false });
    console.log(`  📸 Screenshot saved: ${desktopLoginScreenshot}`);

    // ----------------------------------------------------
    // TEST 5: AUTHENTICATION FLOWS & ROLE REDIRECTION
    // ----------------------------------------------------
    console.log("\n[TEST SUITE 5] AUTHENTICATION & REDIRECTION FLOWS");

    // Invalid Credentials Test
    await page.fill("#login-email", "nonexistent@user.com");
    await page.fill("#login-password", "wrongpassword123");
    await page.click("#login-submit-btn");
    await page.waitForTimeout(500);
    const errorNotice = await page.$(".alert-error");
    recordResult("AUTH-INVALID-CREDENTIALS", !!errorNotice, "Invalid credentials correctly display error notification");

    // Customer Login Test
    await page.fill("#login-email", "customer@test.com");
    await page.fill("#login-password", "test123");
    await page.click("#login-submit-btn");
    await page.waitForURL("**/customer-dashboard", { timeout: 6000 });
    const isCustomerDash = page.url().includes("/customer-dashboard");
    recordResult("AUTH-CUSTOMER-LOGIN", isCustomerDash, `Customer login authenticated and redirected to /customer-dashboard (URL: ${page.url()})`);

    // Admin Login Test
    await page.goto(`${BASE_FRONTEND}/login`);
    await page.waitForTimeout(300);
    // Switch role tab to Administrator
    const adminTab = await page.$("button:has-text('Administrator')");
    await adminTab.click();
    const fillAdminBtn = await page.$("button:has-text('Fill demo credentials')");
    await fillAdminBtn.click();
    await page.click("#login-submit-btn");
    await page.waitForURL("**/admin-dashboard", { timeout: 6000 });
    const isAdminDash = page.url().includes("/admin-dashboard");
    recordResult("AUTH-ADMIN-LOGIN", isAdminDash, `Administrator login authenticated and redirected to /admin-dashboard (URL: ${page.url()})`);

    // Authority Login Test
    await page.goto(`${BASE_FRONTEND}/login`);
    await page.waitForTimeout(300);
    const authTab = await page.$("button:has-text('FSSAI Authority')");
    await authTab.click();
    const fillAuthBtn = await page.$("button:has-text('Fill demo credentials')");
    await fillAuthBtn.click();
    await page.click("#login-submit-btn");
    await page.waitForURL("**/authority-dashboard", { timeout: 6000 });
    const isAuthorityDash = page.url().includes("/authority-dashboard");
    recordResult("AUTH-AUTHORITY-LOGIN", isAuthorityDash, `Authority login authenticated and redirected to /authority-dashboard (URL: ${page.url()})`);

    // ----------------------------------------------------
    // TEST 6: RESPONSIVE AUDIT ACROSS 7 VIEWPORTS
    // ----------------------------------------------------
    console.log("\n[TEST SUITE 6] RESPONSIVE AUDIT ACROSS 7 VIEWPORTS");
    // Clear session for clean responsive testing of public pages
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    const viewports = [
      { name: "320px (Mobile Small)", width: 320, height: 600 },
      { name: "360px (Mobile Compact)", width: 360, height: 640 },
      { name: "390px (iPhone Standard)", width: 390, height: 844 },
      { name: "430px (iPhone Plus/Max)", width: 430, height: 932 },
      { name: "768px (Tablet Portrait)", width: 768, height: 1024 },
      { name: "1024px (Tablet Landscape)", width: 1024, height: 768 },
      { name: "1440px (Desktop Wide)", width: 1440, height: 900 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // Check Home page at this viewport
      await page.goto(`${BASE_FRONTEND}/`, { waitUntil: "networkidle" });
      const homeOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      recordResult(
        `RESPONSIVE-HOME-${vp.width}PX`,
        !homeOverflow,
        `Home page at ${vp.name} [${vp.width}px]: No horizontal overflow`
      );

      // Check Login page at this viewport
      await page.goto(`${BASE_FRONTEND}/login`, { waitUntil: "networkidle" });
      const loginOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      recordResult(
        `RESPONSIVE-LOGIN-${vp.width}PX`,
        !loginOverflow,
        `Login page at ${vp.name} [${vp.width}px]: No horizontal overflow`
      );

      // Capture Mobile Screenshots at 390px
      if (vp.width === 390) {
        const mobileLoginScreenshot = path.join(SCREENSHOTS_DIR, "login_page_mobile_390px.png");
        await page.screenshot({ path: mobileLoginScreenshot, fullPage: false });
        console.log(`  📸 Screenshot saved: ${mobileLoginScreenshot}`);

        await page.goto(`${BASE_FRONTEND}/`, { waitUntil: "networkidle" });
        const mobileHomeScreenshot = path.join(SCREENSHOTS_DIR, "home_page_mobile_390px.png");
        await page.screenshot({ path: mobileHomeScreenshot, fullPage: false });
        console.log(`  📸 Screenshot saved: ${mobileHomeScreenshot}`);
      }
    }

    // ----------------------------------------------------
    // TEST 7: CONSOLE ERROR CHECK
    // ----------------------------------------------------
    console.log("\n[TEST SUITE 7] BROWSER CONSOLE INTEGRITY");
    const criticalErrors = consoleErrors.filter(
      (err) =>
        !err.includes("favicon") &&
        !err.includes("Download the React DevTools") &&
        !err.includes("401") &&
        !err.includes("Invalid email or password")
    );
    recordResult("CONSOLE-ERRORS", criticalErrors.length === 0, `No critical browser console errors detected (count: ${criticalErrors.length})`, criticalErrors.join("\n"));

    await browser.close();
  } catch (fatalErr) {
    console.error("FATAL SUITE ERROR:", fatalErr);
    recordResult("SUITE-FATAL", false, fatalErr.message, fatalErr.stack);
    if (browser) await browser.close();
  }

  console.log(`\n======================================================================`);
  console.log(`TEST SUMMARY: ${passedTests} PASSED / ${failedTests} FAILED`);
  console.log(`======================================================================\n`);

  fs.writeFileSync(
    path.join(__dirname, "home_login_ui_results.json"),
    JSON.stringify({ passedTests, failedTests, resultsLog }, null, 2)
  );

  return { passedTests, failedTests };
}

runTestSuite().then(({ failedTests }) => {
  process.exit(failedTests > 0 ? 1 : 0);
});
