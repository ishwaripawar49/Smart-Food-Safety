/**
 * FoodSafe AI — Production Frontend Build & Preview Verification Test
 * Launches Vite Preview on production `dist/`, navigates in Chromium/Chrome,
 * tests SPA fallback on nested routes, and verifies asset loading.
 */

const { spawn } = require("child_process");
const path = require("path");
const { chromium } = require("playwright");

async function testProductionPreview() {
  console.log("======================================================================");
  console.log("FOODSAFE AI — PRODUCTION FRONTEND PREVIEW & SPA FALLBACK TEST");
  console.log("======================================================================\n");

  const PORT = 4173;
  const PREVIEW_URL = `http://localhost:${PORT}`;
  const frontendDir = path.resolve(__dirname, "frontend");

  console.log(`[STEP 1] Spawning Vite Preview server on ${PREVIEW_URL}...`);
  const previewProcess = spawn(
    "npx.cmd",
    ["vite", "preview", "--port", String(PORT), "--strictPort"],
    {
      cwd: frontendDir,
      stdio: "pipe",
      shell: true
    }
  );

  let started = false;
  previewProcess.stdout.on("data", (data) => {
    const text = data.toString();
    if (text.includes("http://localhost:") || text.includes("Local:") || text.includes("4173")) {
      started = true;
    }
  });

  // Wait for server to bind
  for (let i = 0; i < 25; i++) {
    if (started) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  await new Promise((r) => setTimeout(r, 1000));

  console.log("  ✅ Vite Preview server active.");

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"]
  });

  try {
    const page = await browser.newPage();

    // 1. Test Homepage
    console.log(`\n[STEP 2] Navigating to Production Homepage (${PREVIEW_URL})...`);
    const homeRes = await page.goto(PREVIEW_URL, { waitUntil: "networkidle" });
    console.log(`  - Status Code: ${homeRes.status()}`);
    const heading = await page.innerText("h1");
    console.log(`  - Rendered H1: "${heading.trim()}"`);
    if (homeRes.status() !== 200) throw new Error("Homepage returned non-200 status");
    console.log("  ✅ Production Homepage verified.");

    // 2. Test SPA Route fallback on nested page refresh
    console.log(`\n[STEP 3] Testing Direct Deep-Link Refresh for SPA Route (/login)...`);
    const loginRes = await page.goto(`${PREVIEW_URL}/login`, { waitUntil: "networkidle" });
    console.log(`  - Direct Refresh Status Code: ${loginRes.status()}`);
    const loginHeading = await page.innerText("h1");
    console.log(`  - Rendered H1: "${loginHeading.trim()}"`);
    if (loginRes.status() !== 200) throw new Error("SPA route direct refresh returned non-200");
    console.log("  ✅ Direct URL access and SPA fallback verified.");

    // 3. Test Production Static Assets Loading
    console.log(`\n[STEP 4] Verifying Bundled CSS and JS Asset Delivery...`);
    const stylesheetCount = await page.$$eval("link[rel='stylesheet']", (els) => els.length);
    const scriptCount = await page.$$eval("script[type='module']", (els) => els.length);
    console.log(`  - Bundled Stylesheets active: ${stylesheetCount}`);
    console.log(`  - Bundled Script modules:     ${scriptCount}`);
    if (stylesheetCount === 0 || scriptCount === 0) {
      throw new Error("Missing bundled CSS or JS assets in production build");
    }
    console.log("  ✅ Assets verified.");

    console.log("\n======================================================================");
    console.log("PRODUCTION FRONTEND PREVIEW TEST: ALL CHECKS PASSED (100%)");
    console.log("======================================================================\n");
  } finally {
    await browser.close();
    previewProcess.kill();
  }
}

testProductionPreview()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Preview Test Failed:", err);
    process.exit(1);
  });
