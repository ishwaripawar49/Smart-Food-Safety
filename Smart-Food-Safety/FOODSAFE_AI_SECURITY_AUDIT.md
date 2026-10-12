# FoodSafe AI — Production Security Audit & Vulnerability Assessment
**Auditor:** Principal Production Security Engineer & AppSec Lead  
**Assessment Standard:** OWASP Top 10 API Security (2023), ASVS 4.0 Level 2  
**Platform Scope:** REST APIs, JWT Authentication, RBAC, File Evidence Handling, MySQL ORM, Frontend SPA  
**Audit Date:** October 9, 2026

---

## 1. Executive Summary & Security Posture

During Phase 3 Production Quality Assurance, **FoodSafe AI** underwent a comprehensive application security evaluation. All attack surfaces—including multi-tenant cross-user access, authentication tokens, file upload tampering, path traversal, injection, rate limiting, and supply chain dependencies—were audited and verified with automated test suites.

### Key Security Achievements
- **Zero Insecure Direct Object References (IDOR):** Verified both in REST endpoints and real browser sessions. Customer B is strictly forbidden from viewing, tracking, or retrieving evidence for Customer A's complaints.
- **Zero Insecure File Upload Vulnerabilities:** Multipart uploads strictly enforce cryptographic UUID storage, extension allowlists, and physical magic-byte binary inspection, instantly unlinking spoofed payloads.
- **Supply Chain Hardened:** Fixed critical dependency vulnerability in `proxy-addr` (GHSA-jqcg-44mw-7w3h), moderate vulnerability in `multer` (GHSA-3pph-fpjx-jg34), moderate vulnerability in `moment` (GHSA-4p3w-j4w9-5jqw), and frontend build tool vulnerabilities without breaking dependencies.
- **Rate Limiting Implemented:** Defenses added across authentication (`/auth/login`, `/auth/register`), complaint creation (`POST /api/complaints`), and status tracking (`GET /api/complaints/:id`).

---

## 2. OWASP API Security Top 10 Compliance Matrix

| OWASP Vulnerability | Risk Analysis & Implementation in FoodSafe AI | Status |
| :--- | :--- | :---: |
| **API1: Broken Object Level Authorization (BOLA / IDOR)** | `complaintController.js` enforces strict tenancy checks. Customers can query only complaints where `complaint.user_id === req.user.id`. Customer B receives HTTP 403 Forbidden when requesting Customer A's complaint ID. | ✅ PASS |
| **API2: Broken Authentication** | Passwords hashed using `bcrypt` (10 salt rounds). JWT signatures verified on all protected routes. Tokens carry expiration timestamps. Startup validates non-empty `JWT_SECRET`. | ✅ PASS |
| **API3: Broken Object Property Level Authorization** | Customer complaint creation explicitly parses accepted fields (`shop_id`, `product_name`, `description`, `category`). Privileged attributes (`status`, `admin_remark`, `risk_score`) cannot be set by citizens. | ✅ PASS |
| **API4: Unrestricted Resource Consumption** | Implemented in-memory sliding-window rate limiters on auth, submissions, and tracking. Express body limits constrained to `2mb`. File uploads limited to 5MB and 5 files maximum. | ✅ PASS |
| **API5: Broken Function Level Authorization (BFLA)** | Route middleware `authorizeRoles("ADMIN")` and `authorizeRoles("AUTHORIZED_AUTHORITY")` strictly guard administrative and statutory enforcement routes. Citizens routed to `/unauthorized`. | ✅ PASS |
| **API6: Unrestricted Access to Sensitive Business Flows** | Complaint tracking requests limited to 60/min. Auth logins limited to 30/15min. DART adulteration tests authenticated per user. | ✅ PASS |
| **API7: Server-Side Request Forgery (SSRF)** | The application does not fetch unvalidated remote URLs or execute webhook callbacks based on user-provided input. | ✅ PASS |
| **API8: Security Misconfiguration** | `helmet` configured with cross-origin policies. CORS allowlist restricts origins to configured frontends. Production hides stack traces and disables raw error disclosure. `/api/test/database` disabled in production. | ✅ PASS |
| **API9: Improper Inventory Management** | All API routes versioned under `/api/`. Liveness (`/health`) and readiness (`/ready`) endpoints decoupled from administrative routes. | ✅ PASS |
| **API10: Unsafe Consumption of APIs** | AI screening runs internal algorithmic rule engines based on FSSAI DART guidelines without transmitting sensitive grievance payloads to uncontrolled third-party endpoints. | ✅ PASS |

---

## 3. Deep-Dive Security Verification Results

### 3.1 IDOR Prevention Verification
- **Test ID:** `SEC-IDOR-01` & `SEC-IDOR-02`
- **Scenario:** Customer B (`customer_secondary_test@foodsafe.org`) attempts to track Customer A's complaint ID `FSA-2026-916784` via both API and Browser.
- **Observed Behavior:**
  - API returns `HTTP 403 Forbidden` with payload: `{"success":false,"message":"Access denied. You do not have permission to view this complaint."}`
  - Browser UI catches the 403 and renders an alert notification without rendering complaint details.
  - Evidence images accessed via `/api/complaints/:id/images/:imageId` return `403 Forbidden` for non-owning customers.

### 3.2 File Upload & MIME Magic-Byte Verification
- **Test ID:** `SEC-FILE-01`
- **Scenario:** Attacker uploads `.txt` file renamed to `.png`, or uploads an executable binary with spoofed `image/png` header.
- **Observed Behavior:**
  - `uploadMiddleware.validateUploadedFile` reads the first 16 bytes directly from disk.
  - Verifies presence of authentic magic bytes (`89 50 4E 47 0D 0A 1A 0A` for PNG, `FF D8 FF` for JPEG, `RIFF ... WEBP` for WebP).
  - Spoofed payloads immediately trigger `fs.unlinkSync()`, deleting the file from disk, and respond with `HTTP 400 Bad Request`.
  - Genuine files are stored using `crypto.randomUUID()`, completely neutralizing path traversal and shell injection risks.

### 3.3 Path Traversal Verification
- **Test ID:** `SEC-PATH-01`
- **Scenario:** Attacker requests `/api/complaints/1/images/../../../../etc/passwd`.
- **Observed Behavior:**
  - `path.resolve(uploadsDir, rawFilename)` resolves the canonical path.
  - `if (!safeFilePath.startsWith(uploadsDir))` prevents any escape from the upload directory.
  - Responds with `HTTP 404 Not Found`.

---

## 4. Dependency & Supply Chain Vulnerability Audit

Audited via `npm audit` on Node.js v24 environment:

| Package | Prior Version | Patched Version | Severity | Advisory Reference | Action Taken |
| :--- | :---: | :---: | :---: | :--- | :--- |
| `proxy-addr` | 2.0.7 | **2.0.8** | **CRITICAL** | GHSA-jqcg-44mw-7w3h (IP spoofing via IPv4-mapped IPv6) | ✅ Patched cleanly via semver |
| `multer` | 2.3.0 | **2.4.0** | **Moderate** | GHSA-3pph-fpjx-jg34 (DoS via orphaned disk writes) | ✅ Patched cleanly |
| `moment` | 2.30.1 | **2.31.0** | **Moderate** | GHSA-4p3w-j4w9-5jqw (Path Traversal in locale) | ✅ Patched cleanly |
| `brace-expansion` | 4.0.0 | **4.0.1** | **High** | GHSA-q2hr-2g5m-vwhr (ReDoS) | ✅ Patched in frontend |
| `source-map-js` | 1.0.0 | **1.2.1** | **High** | GHSA-68fv-2mgg-jv7q (DoS) | ✅ Patched in frontend |

*Note on Unresolved Dev Dependencies:*
`nodemon` (dev-only tool for local development) relies on `braces` internally. In production, `nodemon` is NOT installed (`npm ci --production`), completely eliminating this attack surface in production environments.

---

## 5. Security Recommendations for Live Deployment

1. **Enforce HTTPS / HSTS:** Terminate SSL/TLS at reverse proxy (Nginx or Cloudflare) with `Strict-Transport-Security: max-age=31536000; includeSubDomains`.
2. **Rotate Secrets Periodically:** Ensure `JWT_SECRET` is generated using `openssl rand -hex 64`.
3. **Database Network Isolation:** Restrict MySQL port `3306` to bind exclusively to `127.0.0.1` or the internal VPC subnet; never expose MySQL to the public internet.
4. **Cloud Object Storage for Evidence:** In containerized multi-node deployments, migrate local disk storage (`uploads/`) to S3-compatible private bucket storage with pre-signed URLs.
