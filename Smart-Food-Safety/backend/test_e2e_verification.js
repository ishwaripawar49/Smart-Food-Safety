require("dotenv").config();

async function runE2E() {
  const BASE = "http://localhost:5000/api";
  console.log("======================================================================");
  console.log("FOODSAFE AI 2.0 — END-TO-END SYSTEM VERIFICATION SUITE");
  console.log("Testing Live Backend: http://localhost:5000");
  console.log("======================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, desc) {
    if (condition) {
      console.log(`  ✅ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${desc}`);
      failed++;
    }
  }

  // 1. Health & Readiness
  console.log("--- 1. SERVER HEALTH & READINESS ---");
  const healthRes = await fetch("http://localhost:5000/health");
  const healthData = await healthRes.json();
  assert(healthRes.ok && healthData.status === "UP", "Health endpoint returns UP");

  const readyRes = await fetch("http://localhost:5000/ready");
  const readyData = await readyRes.json();
  assert(readyRes.ok && readyData.status === "READY" && readyData.database === "CONNECTED", "Readiness endpoint confirms DB CONNECTED");

  // 2. Customer Portal
  console.log("\n--- 2. CUSTOMER PORTAL APIs ---");
  const custLogin = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "customer@test.com", password: "test123" }),
  });
  const custData = await custLogin.json();
  assert(custLogin.ok && custData.token, "Customer login (customer@test.com / test123)");
  const custToken = custData.token;

  const custMe = await fetch(`${BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${custToken}` },
  });
  const meData = await custMe.json();
  assert(custMe.ok && meData.user.role === "CUSTOMER", "Customer session validation (/auth/me)");

  const shopsRes = await fetch(`${BASE}/shops`, {
    headers: { Authorization: `Bearer ${custToken}` },
  });
  const shopsData = await shopsRes.json();
  assert(shopsRes.ok && Array.isArray(shopsData.shops) && shopsData.shops.length > 0, "Fetch active shops directory");

  const myComplaintsRes = await fetch(`${BASE}/complaints/my`, {
    headers: { Authorization: `Bearer ${custToken}` },
  });
  const myComplaintsData = await myComplaintsRes.json();
  assert(myComplaintsRes.ok && Array.isArray(myComplaintsData.complaints), "Customer complaints list (/api/complaints/my)");

  const custNotifsRes = await fetch(`${BASE}/notifications/customer`, {
    headers: { Authorization: `Bearer ${custToken}` },
  });
  const custNotifsData = await custNotifsRes.json();
  assert(custNotifsRes.ok && Array.isArray(custNotifsData.notifications), "Customer notifications (/api/notifications/customer)");

  const dartStandardsRes = await fetch(`${BASE}/adulteration/standards`, {
    headers: { Authorization: `Bearer ${custToken}` },
  });
  const dartData = await dartStandardsRes.json();
  assert(dartStandardsRes.ok && dartData.standards && typeof dartData.standards === "object", "DART test standards directory (/api/adulteration/standards)");

  // 3. Admin Portal
  console.log("\n--- 3. ADMIN PORTAL APIs ---");
  const adminLogin = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@foodsafety.com", password: "admin123" }),
  });
  const adminData = await adminLogin.json();
  assert(adminLogin.ok && adminData.token, "Admin login (admin@foodsafety.com / admin123)");
  const adminToken = adminData.token;

  const adminStats = await fetch(`${BASE}/admin/statistics`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const statsData = await adminStats.json();
  assert(adminStats.ok && statsData.statistics && typeof statsData.statistics.totalComplaints === "number", "Admin dashboard statistics (/api/admin/statistics)");

  const adminComplaints = await fetch(`${BASE}/admin/complaints`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminComplaintsData = await adminComplaints.json();
  assert(adminComplaints.ok && Array.isArray(adminComplaintsData.complaints), "Admin complaints management (/api/admin/complaints)");

  const adminReports = await fetch(`${BASE}/admin/reports`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const reportsData = await adminReports.json();
  assert(adminReports.ok && reportsData.report, "Admin analytics and reports (/api/admin/reports)");

  const adminNotifs = await fetch(`${BASE}/notifications/admin`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminNotifsData = await adminNotifs.json();
  assert(adminNotifs.ok && Array.isArray(adminNotifsData.notifications), "Admin notifications (/api/notifications/admin)");

  // Intelligence routes
  const hotspotsRes = await fetch(`${BASE}/intelligence/hotspots`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const hotspotsData = await hotspotsRes.json();
  assert(hotspotsRes.ok && hotspotsData.data && Array.isArray(hotspotsData.data.clusters), "Intelligence: Hotspot map clusters (/api/intelligence/hotspots)");

  const dupsRes = await fetch(`${BASE}/intelligence/duplicates`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const dupsData = await dupsRes.json();
  assert(dupsRes.ok && Array.isArray(dupsData.data), "Intelligence: Duplicate detection clusters (/api/intelligence/duplicates)");

  const overviewRes = await fetch(`${BASE}/intelligence/overview`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const overviewData = await overviewRes.json();
  assert(overviewRes.ok && overviewData.data && typeof overviewData.data.total_complaints === "number", "Intelligence: Overview metrics (/api/intelligence/overview)");

  const trendsRes = await fetch(`${BASE}/intelligence/trends`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const trendsData = await trendsRes.json();
  assert(trendsRes.ok && trendsData.data && trendsData.data.by_category, "Intelligence: Trend analysis (/api/intelligence/trends)");

  // 4. Authority Portal
  console.log("\n--- 4. AUTHORIZED AUTHORITY PORTAL APIs ---");
  const authLogin = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "authority@foodsafety.com", password: "123456" }),
  });
  const authLoginData = await authLogin.json();
  assert(authLogin.ok && authLoginData.token, "Authority login (authority@foodsafety.com / 123456)");
  const authHeader = { Authorization: `Bearer ${authLoginData.token}` };

  const authVerified = await fetch(`${BASE}/authority/complaints`, { headers: authHeader });
  const authVerifiedData = await authVerified.json();
  assert(authVerified.ok && Array.isArray(authVerifiedData.complaints), "Authority verified complaints (/api/authority/complaints)");

  const authCases = await fetch(`${BASE}/authority/cases`, { headers: authHeader });
  const authCasesData = await authCases.json();
  assert(authCases.ok && Array.isArray(authCasesData.cases), "Authority case directory (/api/authority/cases)");

  const authInvests = await fetch(`${BASE}/authority/investigations`, { headers: authHeader });
  const authInvestsData = await authInvests.json();
  assert(authInvests.ok && Array.isArray(authInvestsData.complaints), "Authority active investigations (/api/authority/investigations)");

  const authStats = await fetch(`${BASE}/authority/statistics`, { headers: authHeader });
  const authStatsData = await authStats.json();
  assert(authStats.ok && authStatsData.statistics, "Authority enforcement statistics (/api/authority/statistics)");

  const authReports = await fetch(`${BASE}/authority/reports`, { headers: authHeader });
  const authReportsData = await authReports.json();
  assert(authReports.ok && authReportsData.statistics, "Authority reports summary (/api/authority/reports)");

  const authNotifs = await fetch(`${BASE}/notifications/authority`, { headers: authHeader });
  const authNotifsData = await authNotifs.json();
  assert(authNotifs.ok && Array.isArray(authNotifsData.notifications), "Authority notifications queue (/api/notifications/authority)");

  // 5. Audit Trail & History Verification
  console.log("\n--- 5. AUDIT TRAIL & INVESTIGATION HISTORY PERSISTENCE ---");
  if (authCasesData.cases.length > 0) {
    const testComplaintId = authCasesData.cases[0].id;
    const historyRes = await fetch(`${BASE}/authority/complaints/${testComplaintId}/history`, { headers: authHeader });
    const historyData = await historyRes.json();
    assert(historyRes.ok && Array.isArray(historyData.history), `Investigation audit trail history for complaint #${testComplaintId} (/history)`);
  }

  console.log("\n======================================================================");
  console.log(`E2E TEST COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log("======================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runE2E().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
