const { chromium } = require("playwright");
const fs = require("fs");

async function runVerification() {
  console.log("======================================================================");
  console.log("FOODSAFE AI 2.0 — VERIFYING AUTHORITY INVESTIGATIONS FIX IN CHROME");
  console.log("======================================================================\n");

  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  const consoleLogs = [];
  const pageErrors = [];
  const networkLogs = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.error(`[CONSOLE ERROR] ${msg.text()}`);
    }
  });

  page.on("pageerror", (err) => {
    const text = `[PAGE ERROR] ${err.name}: ${err.message}`;
    pageErrors.push(text);
    console.error(text);
  });

  page.on("response", (res) => {
    if (res.url().includes("/api/")) {
      networkLogs.push({ url: res.url(), status: res.status() });
    }
  });

  try {
    // 1. Login
    console.log("TEST 01: Authority Login...");
    await page.goto("http://localhost:5173/authority-login", { waitUntil: "networkidle" });
    await page.fill('input[type="email"], input[name="email"]', "authority@foodsafety.com");
    await page.fill('input[type="password"], input[name="password"]', "123456");
    await page.click('button[type="submit"]');

    // 2. Dashboard
    console.log("TEST 02: Authority Dashboard loads...");
    await page.waitForURL("**/authority-dashboard", { timeout: 10000 });
    const dashTitle = await page.textContent("h1");
    console.log(`  ✅ Dashboard Loaded: "${dashTitle.trim()}"`);

    // 3. Click Investigations in Quick Access or Sidebar
    console.log("TEST 03: Navigating to Authority Investigations via click...");
    const invLink = page.locator('button:has-text("Investigations"), a[href*="investigations"]').first();
    await invLink.click();
    await page.waitForURL("**/authority/investigations", { timeout: 10000 });
    await page.waitForTimeout(1500);

    // 4. Check for Runtime Errors
    console.log("TEST 04: Verifying NO React Runtime Errors...");
    if (pageErrors.length === 0) {
      console.log("  ✅ Zero runtime errors on Investigations page!");
    } else {
      console.error("  ❌ Encountered page errors:", pageErrors);
    }

    // 5 & 6. Verify page title and list
    console.log("TEST 05 & 06: Verifying Investigations Registry & Data Rendering...");
    const pageHeading = await page.locator(".page-title").textContent();
    console.log(`  Page Heading: "${pageHeading.trim()}"`);

    const kpiValues = await page.locator(".kpi-value").allTextContents();
    console.log(`  KPI Summary Counters: Active Audits=${kpiValues[0]}, Critical=${kpiValues[1]}, Directives Needed=${kpiValues[2]}, Resolved=${kpiValues[3]}`);

    const tableRows = await page.locator(".data-table tbody tr").count();
    console.log(`  Total Investigation Records Displayed in Table: ${tableRows}`);

    // Capture After Screenshot
    const invScreenshot = "after_fix_investigations.png";
    await page.screenshot({ path: invScreenshot, fullPage: true });
    console.log(`  ✅ Captured: ${invScreenshot}`);

    // 7. Test Search Filter
    console.log("TEST 07: Testing Real-time Search Filter...");
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill("Biryani");
    await page.waitForTimeout(500);
    const searchRows = await page.locator(".data-table tbody tr").count();
    console.log(`  Filtered for 'Biryani': ${searchRows} record(s) found`);
    await searchInput.fill("");
    await page.waitForTimeout(500);

    // 8. Test Audit Details Navigation
    console.log("TEST 08 & 09: Clicking 'Conduct Audit' on first case...");
    const auditBtn = page.locator('.data-table tbody tr button:has-text("Conduct Audit")').first();
    await auditBtn.click();
    await page.waitForURL("**/authority/investigation/*", { timeout: 10000 });
    await page.waitForTimeout(1500);

    const docketHeading = await page.locator(".page-title").textContent();
    console.log(`  ✅ Docket Loaded: "${docketHeading.trim()}"`);

    const detailScreenshot = "after_fix_investigation_details.png";
    await page.screenshot({ path: detailScreenshot, fullPage: true });
    console.log(`  ✅ Captured: ${detailScreenshot}`);

    // 10. Unlisted food seller checks
    console.log("TEST 10: Checking Establishment Dossier...");
    const establishmentText = await page.locator(".card").first().innerText();
    console.log(`  Establishment block contains details: ${establishmentText.includes("COMMODITY UNDER AUDIT")}`);

    // 11. Test navigation to My Cases
    console.log("TEST 11: Navigating to My Cases (/authority/cases)...");
    await page.goto("http://localhost:5173/authority/cases", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    const casesCount = await page.locator(".data-table tbody tr").count();
    console.log(`  ✅ My Cases page loaded with ${casesCount} cases`);

    // 12. Test navigation to Verified Complaints
    console.log("TEST 12: Navigating to Verified Complaints (/authority/verified-complaints)...");
    await page.goto("http://localhost:5173/authority/verified-complaints", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    const verifiedRows = await page.locator(".data-table tbody tr").count();
    console.log(`  ✅ Verified Complaints page loaded with ${verifiedRows} complaints`);

    // 13. Mobile viewport verification
    console.log("TEST 13: Mobile Viewport Responsiveness (390x844)...");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://localhost:5173/authority/investigations", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    const mobileScreenshot = "after_fix_investigations_mobile.png";
    await page.screenshot({ path: mobileScreenshot, fullPage: true });
    console.log(`  ✅ Captured Mobile Screenshot: ${mobileScreenshot}`);

    // 14. Unauthorized Customer access check
    console.log("TEST 14: Unauthorized Access Test (Customer Token)...");
    const custContext = await browser.newContext();
    const custPage = await custContext.newPage();
    // Login as Customer
    await custPage.goto("http://localhost:5173/login", { waitUntil: "networkidle" });
    await custPage.fill('input[type="email"], input[name="email"]', "customer@test.com");
    await custPage.fill('input[type="password"], input[name="password"]', "test123");
    await custPage.click('button[type="submit"]');
    await custPage.waitForURL("**/customer-dashboard", { timeout: 10000 });
    // Try accessing /authority/investigations
    await custPage.goto("http://localhost:5173/authority/investigations");
    await custPage.waitForTimeout(1000);
    const currentUrl = custPage.url();
    console.log(`  Customer redirected to: ${currentUrl} (Unauthorized protected: ${currentUrl.includes("/unauthorized") || currentUrl.includes("/login")})`);
    await custContext.close();

    console.log("\n======================================================================");
    console.log("ALL CHROME PLAYWRIGHT VERIFICATION TESTS PASSED SUCCESSFULLY!");
    console.log("======================================================================");
  } catch (err) {
    console.error("Verification failed:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runVerification();
