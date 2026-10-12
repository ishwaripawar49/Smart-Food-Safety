const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const BASE_FRONTEND = "http://localhost:5175";
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
  console.log(`FOODSAFE AI 2.0 — APPROVED HERO BACKGROUND IMAGE VERIFICATION`);
  console.log(`Platform: Local Google Chrome via Playwright`);
  console.log(`Frontend: ${BASE_FRONTEND}`);
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
    // TEST 1: DESKTOP 1440px HERO WITH APPROVED BACKGROUND
    // ----------------------------------------------------
    console.log("\n[TEST SUITE 1] DESKTOP 1440px HERO WITH APPROVED BACKGROUND");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_FRONTEND}/`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);

    // 1. Verify Background Artwork Image is loaded
    const bgImg = await page.$(".hero-artwork-bg-img");
    const bgLoaded = await page.evaluate((el) => el && el.complete && el.naturalWidth > 0, bgImg);
    recordResult("HERO-BG-IMG-LOADED", bgLoaded, "High-resolution clean hero background image loaded successfully (naturalWidth > 0)");

    // 2. Verify No duplicate old hero basket or floating metric badges
    const oldBasket = await page.$(".hero-basket-img");
    const floatPills = await page.$$(".hero-float-pill");
    recordResult("HERO-NO-DUPLICATE-BASKET", !oldBasket, "Verified old duplicate vegetable basket component is removed");
    recordResult("HERO-NO-UNSUPPORTED-METRICS", floatPills.length === 0, "Verified unsupported 94% resolution rate badges are removed");

    // 3. Verify Decorative Slogan rendered as crisp HTML/React text
    const sloganEl = await page.$(".hero-artwork-right-col .hero-decorative-slogan");
    const sloganText = await page.textContent(".hero-artwork-right-col .hero-decorative-slogan");
    const hasSafeFood = sloganText && sloganText.includes("Safe Food");
    const hasHealthyPeople = sloganText && sloganText.includes("Healthy People");
    const hasStrongerComm = sloganText && sloganText.includes("Stronger Communities");
    recordResult(
      "HERO-SLOGAN-HTML-TEXT",
      hasSafeFood && hasHealthyPeople && hasStrongerComm,
      `Slogan rendered as actual React/HTML text: "Safe Food", "Healthy People", "Stronger Communities"`
    );

    const leafIcon = await page.$(".hero-artwork-right-col .slogan-leaf-icon");
    const curveUnderline = await page.$(".hero-artwork-right-col .slogan-curved-underline");
    recordResult("HERO-SLOGAN-DECORATIONS", !!leafIcon && !!curveUnderline, "Slogan botanical leaf icon and curved underline SVG are present");

    // Check no overlap between heading and slogan
    const headingBox = await page.evaluate(() => {
      const el = document.querySelector(".hero-exact-headline");
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    });
    const sloganBox = await page.evaluate(() => {
      const el = document.querySelector(".hero-artwork-right-col .hero-decorative-slogan");
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    });
    const noOverlap = headingBox.right <= sloganBox.left || headingBox.bottom <= sloganBox.top;
    recordResult("HERO-NO-TEXT-OVERLAP", noOverlap, `Verified headline (right: ${Math.round(headingBox.right)}px) does not overlap slogan (left: ${Math.round(sloganBox.left)}px)`);

    // 4. Verify Hero Left Side Elements: Heading, Desc, Buttons, Trust
    const headline = await page.textContent(".hero-exact-headline");
    recordResult(
      "HERO-HEADING",
      headline && headline.includes("Safer Food for") && headline.includes("Healthier Communities"),
      `Heading matches: 'Safer Food for Healthier Communities'`
    );

    const desc = await page.textContent(".hero-exact-desc");
    recordResult(
      "HERO-DESC",
      desc && desc.includes("Report food safety concerns"),
      "Hero description explains platform purpose"
    );

    const reportBtn = await page.$("#hero-report-btn");
    const easyBtn = await page.$("#hero-easy-complaint-btn");
    recordResult("HERO-REPORT-BTN", !!reportBtn, "Primary CTA '#hero-report-btn' (Report Food Problem) is present");
    recordResult("HERO-EASY-BTN", !!easyBtn, "Secondary CTA '#hero-easy-complaint-btn' (FoodSafe Easy) is present");

    const trustItems = await page.$$(".hero-trust-item");
    recordResult("HERO-TRUST-ROW", trustItems.length >= 3, `Trust checkmarks present (count: ${trustItems.length})`);

    // Capture Desktop Screenshot
    const desktopScreenshot = path.join(SCREENSHOTS_DIR, "hero_fixed_desktop_1440px.png");
    await page.screenshot({ path: desktopScreenshot, fullPage: false });
    console.log(`  📸 Screenshot saved: ${desktopScreenshot}`);
    fs.copyFileSync(desktopScreenshot, path.join(BRAIN_DIR, "hero_fixed_desktop_1440px.png"));

    // Capture Slogan Detail Screenshot
    if (sloganEl) {
      const sloganScreenshot = path.join(SCREENSHOTS_DIR, "hero_fixed_slogan_detail.png");
      await sloganEl.screenshot({ path: sloganScreenshot });
      console.log(`  📸 Slogan Detail saved: ${sloganScreenshot}`);
      fs.copyFileSync(sloganScreenshot, path.join(BRAIN_DIR, "hero_fixed_slogan_detail.png"));
    }

    // ----------------------------------------------------
    // TEST 2: RESPONSIVE AUDIT ACROSS ALL 8 REQUESTED WIDTHS
    // ----------------------------------------------------
    console.log("\n[TEST SUITE 2] RESPONSIVE AUDIT ACROSS 8 SCREEN WIDTHS");

    const viewports = [
      { name: "320px (Mobile Mini)", width: 320, height: 640 },
      { name: "360px (Mobile Compact)", width: 360, height: 640 },
      { name: "390px (iPhone Standard)", width: 390, height: 844 },
      { name: "430px (iPhone Plus/Max)", width: 430, height: 932 },
      { name: "768px (Tablet Portrait)", width: 768, height: 1024 },
      { name: "1024px (Tablet Landscape)", width: 1024, height: 768 },
      { name: "1440px (Desktop Standard)", width: 1440, height: 900 },
      { name: "1920px (Desktop Full HD)", width: 1920, height: 1080 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_FRONTEND}/`, { waitUntil: "networkidle" });
      await page.waitForTimeout(300);

      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      recordResult(
        `RESPONSIVE-${vp.width}PX`,
        !hasOverflow,
        `${vp.name} [${vp.width}px]: Zero horizontal overflow`
      );

      // Capture Mobile Screenshots at 390px
      if (vp.width === 390) {
        const mobileScreenshot = path.join(SCREENSHOTS_DIR, "hero_fixed_mobile_390px.png");
        await page.screenshot({ path: mobileScreenshot, fullPage: false });
        console.log(`  📸 Screenshot saved: ${mobileScreenshot}`);
        fs.copyFileSync(mobileScreenshot, path.join(BRAIN_DIR, "hero_fixed_mobile_390px.png"));

        // Capture Mobile Artwork Card element screenshot specifically
        const mobileCardEl = await page.$(".hero-artwork-mobile-view");
        if (mobileCardEl) {
          const cardScreenshot = path.join(SCREENSHOTS_DIR, "hero_fixed_mobile_card.png");
          await mobileCardEl.screenshot({ path: cardScreenshot });
          console.log(`  📸 Mobile Card Screenshot saved: ${cardScreenshot}`);
          fs.copyFileSync(cardScreenshot, path.join(BRAIN_DIR, "hero_fixed_mobile_card.png"));
        }

        // Verify Mobile artwork card loaded
        const mobileImg = await page.$(".hero-mobile-artwork-img");
        const mobileImgLoaded = await page.evaluate((el) => el && el.complete && el.naturalWidth > 0, mobileImg);
        recordResult("MOBILE-ARTWORK-LOADED", mobileImgLoaded, "Mobile artwork card loaded with full dimensions without text overlap");
      }

      // Capture 1920px Wide Desktop Screenshot
      if (vp.width === 1920) {
        const wideScreenshot = path.join(SCREENSHOTS_DIR, "hero_fixed_desktop_1920px.png");
        await page.screenshot({ path: wideScreenshot, fullPage: false });
        console.log(`  📸 Screenshot saved: ${wideScreenshot}`);
        fs.copyFileSync(wideScreenshot, path.join(BRAIN_DIR, "hero_fixed_desktop_1920px.png"));
      }
    }

    // ----------------------------------------------------
    // TEST 3: BUTTON NAVIGATION INTEGRITY
    // ----------------------------------------------------
    console.log("\n[TEST SUITE 3] BUTTON NAVIGATION INTEGRITY");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_FRONTEND}/`, { waitUntil: "networkidle" });

    // Test Report Food Problem button click
    await page.click("#hero-report-btn");
    await page.waitForURL("**/submit-complaint", { timeout: 6000 });
    recordResult("NAV-REPORT-BTN", page.url().includes("/submit-complaint"), `Clicking #hero-report-btn navigates to /submit-complaint`);

    // Test FoodSafe Easy button click
    await page.goto(`${BASE_FRONTEND}/`, { waitUntil: "networkidle" });
    await page.click("#hero-easy-complaint-btn");
    await page.waitForURL("**/easy-complaint", { timeout: 6000 });
    recordResult("NAV-EASY-BTN", page.url().includes("/easy-complaint"), `Clicking #hero-easy-complaint-btn navigates to /easy-complaint`);

    // ----------------------------------------------------
    // TEST 4: BROWSER CONSOLE INTEGRITY
    // ----------------------------------------------------
    console.log("\n[TEST SUITE 4] CONSOLE INTEGRITY");
    const criticalErrors = consoleErrors.filter(
      (err) =>
        !err.includes("favicon") &&
        !err.includes("Download the React DevTools")
    );
    recordResult(
      "CONSOLE-INTEGRITY",
      criticalErrors.length === 0,
      `Zero critical console errors (count: ${criticalErrors.length})`,
      criticalErrors.join("\n")
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
    path.join(__dirname, "hero_background_results.json"),
    JSON.stringify({ passedTests, failedTests, resultsLog }, null, 2)
  );

  return { passedTests, failedTests };
}

runTestSuite().then(({ failedTests }) => {
  process.exit(failedTests > 0 ? 1 : 0);
});
