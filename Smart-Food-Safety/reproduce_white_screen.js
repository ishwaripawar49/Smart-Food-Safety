const { chromium } = require("playwright");

async function reproduce() {
  console.log("======================================================================");
  console.log("REPRODUCING AUTHORITY INVESTIGATIONS WHITE SCREEN ERROR");
  console.log("======================================================================");

  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleLogs = [];
  const pageErrors = [];
  const networkLogs = [];

  page.on("console", (msg) => {
    const text = `[BROWSER CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`;
    consoleLogs.push(text);
    console.log(text);
  });

  page.on("pageerror", (err) => {
    const text = `[BROWSER RUNTIME ERROR] ${err.name}: ${err.message}\nStack: ${err.stack}`;
    pageErrors.push(text);
    console.error(text);
  });

  page.on("response", async (response) => {
    if (response.url().includes("/api/")) {
      networkLogs.push({
        url: response.url(),
        status: response.status(),
      });
      console.log(`[NETWORK ${response.status()}] ${response.url()}`);
    }
  });

  try {
    console.log("\n1. Navigating to Authority Login: http://localhost:5173/authority-login");
    await page.goto("http://localhost:5173/authority-login", { waitUntil: "networkidle" });

    console.log("2. Entering credentials: authority@foodsafety.com / 123456");
    await page.fill('input[type="email"], input[name="email"]', "authority@foodsafety.com");
    await page.fill('input[type="password"], input[name="password"]', "123456");
    await page.click('button[type="submit"]');

    console.log("3. Waiting for navigation to dashboard...");
    await page.waitForURL("**/authority-dashboard", { timeout: 10000 });
    console.log("   Successfully landed on Authority Dashboard!");

    console.log("4. Navigating to Authority Investigations: /authority/investigations...");
    await page.goto("http://localhost:5173/authority/investigations", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    const screenshotPath = "before_fix_investigations.png";
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`5. Captured screenshot: ${screenshotPath}`);

    // Check page HTML
    const content = await page.content();
    const bodyText = await page.evaluate(() => document.body.innerText.trim());
    console.log("\nPage text length:", bodyText.length);
    console.log("Page text sample:", bodyText.slice(0, 200));

    console.log("\n======================================================================");
    console.log("DIAGNOSIS SUMMARY:");
    console.log("Page Errors Count:", pageErrors.length);
    if (pageErrors.length > 0) {
      console.log("ACTUAL RUNTIME ERRORS CAUSING WHITE SCREEN:");
      pageErrors.forEach((e) => console.log(e));
    }
    console.log("======================================================================");
  } catch (error) {
    console.error("Test execution error:", error);
  } finally {
    await browser.close();
  }
}

reproduce();
