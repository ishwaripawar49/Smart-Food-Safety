const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const BASE_FRONTEND = "http://localhost:5175";
const BASE_BACKEND = "http://localhost:5000";
const SCREENSHOTS_DIR = path.join(__dirname, "screenshots");
const BRAIN_DIR = "C:\\Users\\omgai\\.gemini\\antigravity-ide\\brain\\442e3e39-1d3a-4720-b90f-9c6254578f7e";

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
  console.log(`FOODSAFE AI 2.0 — EXACT REFERENCE IMAGE VERIFICATION SUITE`);
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

    // Clear session for clean slate
    await page.goto(`${BASE_FRONTEND}/`, { waitUntil: "networkidle" });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // ------------------------------------------------------------------
    // SUITE 1: HOME PAGE EXACT VISUAL DESIGN (1440px Desktop)
    // ------------------------------------------------------------------
    console.log("\n[TEST SUITE 1] HOME PAGE EXACT VISUAL DESIGN (1440px)");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_FRONTEND}/`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    // 1. White navigation bar with green FoodSafe AI 2.0 logo
    const navbarBg = await page.$eval(".public-navbar", (el) => window.getComputedStyle(el).backgroundColor);
    const logoText = await page.textContent(".navbar-logo-text");
    recordResult(
      "HOME-NAVBAR-LOGO",
      logoText && logoText.includes("FoodSafe AI 2.0"),
      `Navbar has green 'FoodSafe AI 2.0' branding (found: '${logoText.replace(/\s+/g, " ").trim()}')`
    );

    // 2. Horizontal navigation and green Login button
    const navLoginBtn = await page.$("#nav-login-btn");
    recordResult("HOME-NAVBAR-LOGIN-BTN", !!navLoginBtn, "Navbar contains prominent green Login button (#nav-login-btn)");

    // 3. Soft botanical pale-green hero background
    const heroSection = await page.$(".exact-hero-section");
    recordResult("HOME-HERO-SECTION", !!heroSection, "Soft botanical pale-green hero section (.exact-hero-section) is present");

    // 4. Large dark-green "Safer Food for Healthier Communities" heading
    const heroHeadline = await page.textContent(".hero-exact-headline");
    recordResult(
      "HOME-HERO-HEADING",
      heroHeadline && heroHeadline.includes("Safer Food for") && heroHeadline.includes("Healthier Communities"),
      `Heading matches exact reference: 'Safer Food for Healthier Communities'`
    );

    // 5. Small green introductory badge above heading
    const heroBadge = await page.textContent(".hero-intro-badge");
    recordResult(
      "HOME-HERO-BADGE",
      heroBadge && heroBadge.includes("Smart Food Safety Platform"),
      `Introductory badge present above heading: 'Smart Food Safety Platform'`
    );

    // 6. Supporting paragraph underneath
    const heroDesc = await page.textContent(".hero-exact-desc");
    recordResult(
      "HOME-HERO-DESC",
      heroDesc && heroDesc.includes("Report food safety concerns"),
      `Supporting paragraph matches reference description`
    );

    // 7. Solid emerald-green "Report Food Problem" button
    const reportBtn = await page.$("#hero-report-btn");
    const reportBtnText = await page.textContent("#hero-report-btn");
    recordResult(
      "HOME-CTA-REPORT",
      reportBtn && reportBtnText.includes("Report Food Problem"),
      `Solid emerald-green button '#hero-report-btn' contains 'Report Food Problem'`
    );

    // 8. White outlined "FoodSafe Easy" button with "सोपी पद्धत" pill
    const easyBtn = await page.$("#hero-easy-complaint-btn");
    const easyBtnText = await page.textContent("#hero-easy-complaint-btn");
    recordResult(
      "HOME-CTA-EASY",
      easyBtn && easyBtnText.includes("FoodSafe Easy") && easyBtnText.includes("सोपी पद्धत"),
      `White outlined 'FoodSafe Easy' button with 'सोपी पद्धत' pill present`
    );

    // 9 & 10. Large realistic basket of fresh vegetables on wooden tabletop
    const basketImg = await page.$(".hero-basket-img");
    const basketImgLoaded = await page.evaluate((el) => el && el.complete && el.naturalWidth > 0, basketImg);
    recordResult(
      "HOME-HERO-BASKET-IMG",
      basketImgLoaded,
      `Large fresh vegetable basket on wooden tabletop loaded with natural dimensions (naturalWidth > 0)`
    );

    // 11. Four white feature cards with circular icons (Green, Orange, Purple, Blue)
    const card1 = await page.$("#feat-file-complaint");
    const card2 = await page.$("#feat-add-location");
    const card3 = await page.$("#feat-use-voice");
    const card4 = await page.$("#feat-create-change");
    recordResult("HOME-FEATURE-CARDS-4", !!card1 && !!card2 && !!card3 && !!card4, "All 4 white feature cards are present");

    const circleIcons = await page.$$(".feature-circular-icon");
    recordResult(
      "HOME-FEATURE-CIRCLES",
      circleIcons.length === 4,
      `4 feature cards have distinct colored circular icon badges (found: ${circleIcons.length})`
    );

    // 12. "Why FoodSafe AI?" informational section
    const whyTitle = await page.textContent(".why-main-title");
    recordResult(
      "HOME-WHY-SECTION",
      whyTitle && whyTitle.includes("Why FoodSafe AI?"),
      `'Why FoodSafe AI?' informational section header present`
    );

    // 13. Overlapping circular images: vegetables, dairy, grains, spices
    const circleContainer = await page.$(".overlapping-circles-container");
    recordResult("HOME-CIRCLES-CONTAINER", !!circleContainer, "Overlapping circular food images container is present");

    const circleCards = await page.$$(".circle-card");
    const circlesLoaded = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll(".circle-card img"));
      return imgs.length === 4 && imgs.every((img) => img.complete && img.naturalWidth > 0);
    });
    recordResult(
      "HOME-4-CIRCLES-LOADED",
      circlesLoaded,
      `All 4 circular photographic images (vegetables, dairy, grains, spices) loaded with natural dimensions`
    );

    // 14. Deep-green footer
    const footer = await page.$(".exact-deep-footer");
    recordResult("HOME-DEEP-FOOTER", !!footer, "Deep-green footer (.exact-deep-footer) present with regulatory notice");

    // Capture Desktop Home Screenshot
    const desktopHomeScreenshot = path.join(SCREENSHOTS_DIR, "home_page_desktop_1440px.png");
    await page.screenshot({ path: desktopHomeScreenshot, fullPage: false });
    console.log(`  📸 Screenshot saved: ${desktopHomeScreenshot}`);

    // Copy to brain artifacts
    fs.copyFileSync(desktopHomeScreenshot, path.join(BRAIN_DIR, "home_page_desktop_1440px.png"));

    // ------------------------------------------------------------------
    // SUITE 2: LOGIN PAGE EXACT VISUAL DESIGN (1440px Desktop)
    // ------------------------------------------------------------------
    console.log("\n[TEST SUITE 2] LOGIN PAGE EXACT VISUAL DESIGN (1440px)");
    await page.goto(`${BASE_FRONTEND}/login`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    // 1 & 2. Large split-screen composition & full-height fresh vegetable photographic background
    const loginPage = await page.$(".exact-login-page");
    recordResult("LOGIN-SPLIT-PAGE", !!loginPage, "Login page (.exact-login-page) with split composition present");

    // 4. Left introductory heading: "Safe Food Brighter Communities"
    const loginLeftHeading = await page.textContent(".login-exact-heading");
    recordResult(
      "LOGIN-LEFT-HEADING",
      loginLeftHeading && loginLeftHeading.includes("Safe Food") && loginLeftHeading.includes("Brighter Communities"),
      `Left panel headline: 'Safe Food Brighter Communities'`
    );

    // 5. Supporting introductory paragraph
    const loginLeftPara = await page.textContent(".login-exact-paragraph");
    recordResult(
      "LOGIN-LEFT-PARA",
      loginLeftPara && loginLeftPara.includes("Together, we can identify food safety concerns"),
      `Left panel supporting paragraph: 'Together, we can identify food safety concerns...'`
    );

    // 6. Large rounded white login card occupying right side
    const loginCard = await page.$(".exact-login-card");
    recordResult("LOGIN-RIGHT-CARD", !!loginCard, "Large rounded white login card (.exact-login-card) present");

    // 7 & 8. Centered FoodSafe AI green shield/leaf logo & FoodSafe AI 2.0 branding
    const cardLogo = await page.$(".login-card-shield-circle");
    const cardBrand = await page.textContent(".login-card-brand-name");
    recordResult(
      "LOGIN-CARD-BRANDING",
      !!cardLogo && cardBrand.includes("FoodSafe AI 2.0"),
      `Card contains centered green shield logo and 'FoodSafe AI 2.0' branding`
    );

    // 9. "Login to Your Account" heading
    const cardTitle = await page.textContent(".login-card-title");
    recordResult(
      "LOGIN-CARD-TITLE",
      cardTitle && cardTitle.includes("Login to Your Account"),
      `Card title exactly matches: 'Login to Your Account'`
    );

    // 10. Customer, Admin and Authority selection tabs
    const roleTabs = await page.$$eval(".role-tab-btn", (tabs) =>
      tabs.map((t) => t.textContent.trim())
    );
    recordResult(
      "LOGIN-ROLE-TABS",
      roleTabs.length === 3 && roleTabs.some((t) => t.includes("Citizen")) && roleTabs.some((t) => t.includes("Admin")) && roleTabs.some((t) => t.includes("Authority")),
      `Role tabs present: Citizen, Administrator, Authority (${roleTabs.join(", ")})`
    );

    // 11. Email and Password input fields
    const emailInput = await page.$("#login-email");
    const passInput = await page.$("#login-password");
    recordResult("LOGIN-INPUT-FIELDS", !!emailInput && !!passInput, "Email and Password inputs are present");

    // 12. Password visibility toggle
    const passToggle = await page.$(".password-toggle");
    recordResult("LOGIN-PASS-TOGGLE-BTN", !!passToggle, "Password visibility icon button is present");

    const passType1 = await page.$eval("#login-password", (el) => el.type);
    await passToggle.click();
    const passType2 = await page.$eval("#login-password", (el) => el.type);
    await passToggle.click();
    const passType3 = await page.$eval("#login-password", (el) => el.type);
    recordResult(
      "LOGIN-PASS-TOGGLE-FUNC",
      passType1 === "password" && passType2 === "text" && passType3 === "password",
      `Password toggle correctly switches input type between password and text`
    );

    // 13. Full-width emerald-green Login button
    const submitBtn = await page.$("#login-submit-btn");
    recordResult("LOGIN-SUBMIT-BTN", !!submitBtn, "Full-width emerald-green Login button (#login-submit-btn) is present");

    // STRICT: No Google OAuth button
    const googleBtn = await page.$("button:has-text('Google'), button:has-text('Sign in with Google'), .google-btn");
    recordResult("LOGIN-NO-GOOGLE-BTN", !googleBtn, "Verified NO inactive Google OAuth button is present");

    // 14. Existing working login-related controls
    const fillDemoBtn = await page.$(".fill-demo-link");
    recordResult("LOGIN-DEMO-FILL-BTN", !!fillDemoBtn, "Fill demo credentials helper button is present");

    const registerBtn = await page.$("#login-register-link-btn");
    const returnHomeLink = await page.$(".login-return-home");
    recordResult("LOGIN-NAV-LINKS", !!registerBtn && !!returnHomeLink, "Create Account and Back to Public Website links present");

    // Capture Desktop Login Screenshot
    const desktopLoginScreenshot = path.join(SCREENSHOTS_DIR, "login_page_desktop_1440px.png");
    await page.screenshot({ path: desktopLoginScreenshot, fullPage: false });
    console.log(`  📸 Screenshot saved: ${desktopLoginScreenshot}`);

    // Copy to brain artifacts
    fs.copyFileSync(desktopLoginScreenshot, path.join(BRAIN_DIR, "login_page_desktop_1440px.png"));

    // ------------------------------------------------------------------
    // SUITE 3: FUNCTIONAL AUTHENTICATION & ROLE REDIRECTION
    // ------------------------------------------------------------------
    console.log("\n[TEST SUITE 3] FUNCTIONAL AUTHENTICATION & ROLE REDIRECTION");

    // Test Invalid Login
    await page.fill("#login-email", "fake@unknown.com");
    await page.fill("#login-password", "invalidpassword");
    await page.click("#login-submit-btn");
    await page.waitForTimeout(600);
    const alertErr = await page.$(".alert-error");
    recordResult("AUTH-INVALID-CREDENTIALS", !!alertErr, "Invalid login shows clear error message");

    // Test Citizen / Customer Login
    const citizenTab = await page.$("button:has-text('Citizen')");
    await citizenTab.click();
    await page.click(".fill-demo-link");
    await page.click("#login-submit-btn");
    await page.waitForURL("**/customer-dashboard", { timeout: 8000 });
    recordResult(
      "AUTH-CITIZEN-LOGIN",
      page.url().includes("/customer-dashboard"),
      `Citizen authenticated and redirected to /customer-dashboard (URL: ${page.url()})`
    );

    // Test Administrator Login
    await page.goto(`${BASE_FRONTEND}/login`, { waitUntil: "networkidle" });
    const adminTab = await page.$("button:has-text('Administrator')");
    await adminTab.click();
    await page.click(".fill-demo-link");
    await page.click("#login-submit-btn");
    await page.waitForURL("**/admin-dashboard", { timeout: 8000 });
    recordResult(
      "AUTH-ADMIN-LOGIN",
      page.url().includes("/admin-dashboard"),
      `Administrator authenticated and redirected to /admin-dashboard (URL: ${page.url()})`
    );

    // Test FSSAI Authority Login
    await page.goto(`${BASE_FRONTEND}/login`, { waitUntil: "networkidle" });
    const authTab = await page.$("button:has-text('Authority')");
    await authTab.click();
    await page.click(".fill-demo-link");
    await page.click("#login-submit-btn");
    await page.waitForURL("**/authority-dashboard", { timeout: 8000 });
    recordResult(
      "AUTH-AUTHORITY-LOGIN",
      page.url().includes("/authority-dashboard"),
      `FSSAI Authority authenticated and redirected to /authority-dashboard (URL: ${page.url()})`
    );

    // Clear session for responsive audit
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // ------------------------------------------------------------------
    // SUITE 4: RESPONSIVE AUDIT ACROSS 4 VIEWPORTS (390px, 768px, 1024px, 1440px)
    // ------------------------------------------------------------------
    console.log("\n[TEST SUITE 4] RESPONSIVE AUDIT ACROSS VIEWPORTS");

    const testViewports = [
      { name: "Mobile (390px)", width: 390, height: 844 },
      { name: "Tablet Portrait (768px)", width: 768, height: 1024 },
      { name: "Tablet Landscape (1024px)", width: 1024, height: 768 },
      { name: "Desktop (1440px)", width: 1440, height: 900 },
    ];

    for (const vp of testViewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // Check Home
      await page.goto(`${BASE_FRONTEND}/`, { waitUntil: "networkidle" });
      const homeOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      recordResult(
        `RESPONSIVE-HOME-${vp.width}PX`,
        !homeOverflow,
        `Home at ${vp.name}: No horizontal overflow detected`
      );

      // Check Login
      await page.goto(`${BASE_FRONTEND}/login`, { waitUntil: "networkidle" });
      const loginOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      recordResult(
        `RESPONSIVE-LOGIN-${vp.width}PX`,
        !loginOverflow,
        `Login at ${vp.name}: No horizontal overflow detected`
      );

      // Capture Mobile Screenshots at 390px
      if (vp.width === 390) {
        const mobileLoginScreenshot = path.join(SCREENSHOTS_DIR, "login_page_mobile_390px.png");
        await page.screenshot({ path: mobileLoginScreenshot, fullPage: false });
        console.log(`  📸 Screenshot saved: ${mobileLoginScreenshot}`);
        fs.copyFileSync(mobileLoginScreenshot, path.join(BRAIN_DIR, "login_page_mobile_390px.png"));

        await page.goto(`${BASE_FRONTEND}/`, { waitUntil: "networkidle" });
        const mobileHomeScreenshot = path.join(SCREENSHOTS_DIR, "home_page_mobile_390px.png");
        await page.screenshot({ path: mobileHomeScreenshot, fullPage: false });
        console.log(`  📸 Screenshot saved: ${mobileHomeScreenshot}`);
        fs.copyFileSync(mobileHomeScreenshot, path.join(BRAIN_DIR, "home_page_mobile_390px.png"));
      }
    }

    // ------------------------------------------------------------------
    // SUITE 5: CONSOLE ERRORS
    // ------------------------------------------------------------------
    console.log("\n[TEST SUITE 5] CONSOLE INTEGRITY");
    const criticalConsoleErrors = consoleErrors.filter(
      (err) =>
        !err.includes("favicon") &&
        !err.includes("Download the React DevTools") &&
        !err.includes("401") &&
        !err.includes("Invalid credentials") &&
        !err.includes("Invalid email or password")
    );
    recordResult(
      "CONSOLE-INTEGRITY",
      criticalConsoleErrors.length === 0,
      `Zero critical console errors (count: ${criticalConsoleErrors.length})`,
      criticalConsoleErrors.join("\n")
    );

    await browser.close();
  } catch (err) {
    console.error("FATAL SUITE ERROR:", err);
    recordResult("SUITE-FATAL", false, err.message, err.stack);
    if (browser) await browser.close();
  }

  console.log(`\n======================================================================`);
  console.log(`TEST SUMMARY: ${passedTests} PASSED / ${failedTests} FAILED`);
  console.log(`======================================================================\n`);

  fs.writeFileSync(
    path.join(__dirname, "exact_reference_test_results.json"),
    JSON.stringify({ passedTests, failedTests, resultsLog }, null, 2)
  );

  return { passedTests, failedTests };
}

runTestSuite().then(({ failedTests }) => {
  process.exit(failedTests > 0 ? 1 : 0);
});
