/**
 * FoodSafe AI — Production Load & Latency Performance Test Suite
 * Measures real latency percentiles (P50, P95, P99), throughput (RPS), error rates,
 * and memory utilization under controlled concurrent load.
 */

require("dotenv").config();
const http = require("http");
const path = require("path");

const BASE_URL = process.env.API_URL || "http://localhost:5000";

// Make a single HTTP request and record latency
function makeRequest(path, token = null) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL);
    const start = process.hrtime.bigint();

    const headers = {
      "User-Agent": "FoodSafe-LoadTester/1.0",
      Accept: "application/json"
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const req = http.request(
      url,
      {
        method: "GET",
        headers,
        timeout: 5000
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          const durationNs = process.hrtime.bigint() - start;
          const durationMs = Number(durationNs) / 1_000_000;
          resolve({
            statusCode: res.statusCode,
            durationMs,
            success: res.statusCode >= 200 && res.statusCode < 400
          });
        });
      }
    );

    req.on("error", (err) => {
      const durationNs = process.hrtime.bigint() - start;
      const durationMs = Number(durationNs) / 1_000_000;
      resolve({
        statusCode: 0,
        error: err.message,
        durationMs,
        success: false
      });
    });

    req.end();
  });
}

// Calculate statistical percentiles
function calculateStats(latencies) {
  if (latencies.length === 0) return { p50: 0, p95: 0, p99: 0, mean: 0, min: 0, max: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const getP = (p) => sorted[Math.min(Math.floor((p / 100) * sorted.length), sorted.length - 1)];
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  return {
    min: Number(sorted[0].toFixed(2)),
    p50: Number(getP(50).toFixed(2)),
    p95: Number(getP(95).toFixed(2)),
    p99: Number(getP(99).toFixed(2)),
    max: Number(sorted[sorted.length - 1].toFixed(2)),
    mean: Number((sum / sorted.length).toFixed(2))
  };
}

// Obtain auth tokens for testing
async function login(email, password) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({ email, password });
    const url = new URL("/api/auth/login", BASE_URL);

    const req = http.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload)
        }
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            const data = JSON.parse(body);
            resolve(data.token || null);
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.write(payload);
    req.end();
  });
}

async function runLoadTests() {
  console.log("======================================================================");
  console.log("FOODSAFE AI — PRODUCTION BACKEND PERFORMANCE & LOAD BENCHMARK");
  console.log(`Target Service: ${BASE_URL}`);
  console.log("======================================================================\n");

  const initialMem = process.memoryUsage();
  console.log(`Initial Process Memory (RSS): ${(initialMem.rss / 1024 / 1024).toFixed(2)} MB`);

  console.log("\n[AUTH] Authenticating test service roles...");
  const adminToken = await login("admin@foodsafety.gov", "admin123");
  const authOfficerToken = await login("authority@foodsafety.com", "123456");
  const customerToken = await login("customer@test.com", "test123");

  console.log(`  - Admin Authenticated:    ${adminToken ? "YES" : "NO"}`);
  console.log(`  - Authority Authenticated: ${authOfficerToken ? "YES" : "NO"}`);
  console.log(`  - Customer Authenticated:  ${customerToken ? "YES" : "NO"}`);

  // Test endpoints to benchmark
  const testEndpoints = [
    { name: "Liveness Check (/health)", path: "/health", token: null },
    { name: "Readiness Check (/ready)", path: "/ready", token: null },
    { name: "Shops Directory (/api/shops)", path: "/api/shops", token: customerToken },
    { name: "Customer Grievances (/api/complaints/my)", path: "/api/complaints/my", token: customerToken },
    { name: "Admin Dashboard Stats (/api/admin/statistics)", path: "/api/admin/statistics", token: adminToken },
    { name: "Admin Reports & Analytics (/api/admin/reports)", path: "/api/admin/reports", token: adminToken },
    { name: "Authority Verified Complaints (/api/authority/complaints)", path: "/api/authority/complaints", token: authOfficerToken }
  ];

  console.log("\n--- BENCHMARK 1: SINGLE-ENDPOINT LATENCY PROFILES (30 WARM SAMPLES EACH) ---");
  const endpointResults = {};

  for (const ep of testEndpoints) {
    const latencies = [];
    let successes = 0;
    for (let i = 0; i < 30; i++) {
      const res = await makeRequest(ep.path, ep.token);
      if (res.success) successes++;
      latencies.push(res.durationMs);
    }
    const stats = calculateStats(latencies);
    endpointResults[ep.name] = { ...stats, successRate: (successes / 30) * 100 };

    console.log(
      `  • ${ep.name.padEnd(42)} | Mean: ${String(stats.mean).padStart(5)}ms | P50: ${String(stats.p50).padStart(5)}ms | P95: ${String(stats.p95).padStart(5)}ms | P99: ${String(stats.p99).padStart(5)}ms | Success: ${endpointResults[ep.name].successRate}%`
    );
  }

  // --- BENCHMARK 2: CONCURRENT LOAD TESTING ---
  console.log("\n--- BENCHMARK 2: CONCURRENT THROUGHPUT & SATURATION TESTING ---");

  const concurrencyTiers = [
    { concurrency: 10, totalRequests: 100, label: "Tier 1: Moderate User Activity (10 concurrent users)" },
    { concurrency: 25, totalRequests: 250, label: "Tier 2: Peak Hour Load (25 concurrent users)" },
    { concurrency: 50, totalRequests: 500, label: "Tier 3: Stress Concurrency Spike (50 concurrent users)" }
  ];

  const concurrencyResults = [];

  for (const tier of concurrencyTiers) {
    console.log(`\nExecuting ${tier.label}...`);
    const allLatencies = [];
    let completed = 0;
    let failed = 0;

    const overallStart = Date.now();

    // Pool worker queue
    const queue = [];
    for (let i = 0; i < tier.totalRequests; i++) {
      const ep = testEndpoints[i % testEndpoints.length];
      queue.push(ep);
    }

    async function worker() {
      while (queue.length > 0) {
        const ep = queue.shift();
        const res = await makeRequest(ep.path, ep.token);
        if (res.success) {
          completed++;
        } else {
          failed++;
        }
        allLatencies.push(res.durationMs);
      }
    }

    const workers = [];
    for (let c = 0; c < tier.concurrency; c++) {
      workers.push(worker());
    }
    await Promise.all(workers);

    const overallDuration = (Date.now() - overallStart) / 1000;
    const rps = (tier.totalRequests / overallDuration).toFixed(2);
    const stats = calculateStats(allLatencies);
    const errorRate = ((failed / tier.totalRequests) * 100).toFixed(2);

    const tierSummary = {
      concurrency: tier.concurrency,
      totalRequests: tier.totalRequests,
      durationSec: Number(overallDuration.toFixed(2)),
      rps: Number(rps),
      errorRate: Number(errorRate),
      ...stats
    };
    concurrencyResults.push(tierSummary);

    console.log(`  - Total Completed: ${completed} / ${tier.totalRequests} (Failed: ${failed})`);
    console.log(`  - Total Duration:  ${overallDuration.toFixed(2)}s`);
    console.log(`  - Throughput:      ${rps} req/sec`);
    console.log(`  - Error Rate:      ${errorRate}%`);
    console.log(`  - Latencies:       Mean: ${stats.mean}ms | P50: ${stats.p50}ms | P95: ${stats.p95}ms | P99: ${stats.p99}ms | Max: ${stats.max}ms`);
  }

  const finalMem = process.memoryUsage();
  console.log(`\nFinal Process Memory (RSS):   ${(finalMem.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Memory Delta:                 ${((finalMem.rss - initialMem.rss) / 1024 / 1024).toFixed(2)} MB`);

  console.log("\n======================================================================");
  console.log("PERFORMANCE BENCHMARK COMPLETE");
  console.log("======================================================================\n");

  const report = {
    timestamp: new Date().toISOString(),
    endpointResults,
    concurrencyResults,
    memory: {
      initialRssMb: Number((initialMem.rss / 1024 / 1024).toFixed(2)),
      finalRssMb: Number((finalMem.rss / 1024 / 1024).toFixed(2)),
      deltaMb: Number(((finalMem.rss - initialMem.rss) / 1024 / 1024).toFixed(2))
    }
  };

  const fs = require("fs");
  fs.writeFileSync(path.resolve(__dirname, "../foodsafe_performance_results.json"), JSON.stringify(report, null, 2));

  return report;
}

runLoadTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Load test error:", err);
    process.exit(1);
  });
