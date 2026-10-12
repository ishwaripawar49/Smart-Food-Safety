# FOODSAFE AI 2.0 — APPLICATION SECURITY AUDIT REPORT
**Defensive Application Security Testing, Vulnerability Assessment & Hardening Verification**

---

## 1. Audit Scope & Methodology

- **Target System:** FoodSafe AI 2.0 Web Application & REST APIs
- **Date of Audit:** October 10, 2026
- **Auditor:** Application Security Engineer & Full-Stack Security Architect
- **Environment:** Isolated Local Staging Environment
- **Assessment Scope:**
  1. Authentication Architecture & Session Security
  2. Role-Based Access Control (RBAC) & Privilege Escalation Defenses
  3. Insecure Direct Object Reference (IDOR) Mitigations
  4. Input Validation, Injection Defenses & Upload Security
  5. Security Headers, CORS, Cryptography & Secret Protection
  6. Privacy & Data Minimization in Analytics Payloads

---

## 2. Authentication & Authorization Audit

### 2.1 Role-Based Access Control (RBAC) Matrix

| Resource / Endpoint | HTTP Method | Public / Unauth | Customer | Admin | Authorized Authority | Audit Finding |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `/api/auth/register` | POST | Allowed | Allowed | N/A | N/A | Password hashed with `bcryptjs` (salt rounds: 10). |
| `/api/auth/login` | POST | Allowed | Allowed | Allowed | Allowed | Issues HS256 JWT containing `{ id, role }`. |
| `/api/complaints` | POST | 401 Blocked | Allowed | Allowed | Allowed | Validates mandatory category & seller details. |
| `/api/complaints/my` | GET | 401 Blocked | Scoped (Own) | 403 Blocked | 403 Blocked | Strict ownership filter (`where: { user_id }`). |
| `/api/complaints/:id` | GET | 401 Blocked | Scoped (Own) | Full | Full (Assigned) | IDOR protected: Customer B returns 403 on Customer A. |
| `/api/complaints/:id/images/:imgId` | GET | 401 Blocked | Scoped (Own) | Allowed | Allowed | Evidence protected: direct static access disabled. |
| `/api/admin/*` | ALL | 401 Blocked | 403 Blocked | Allowed | 403 Blocked | Strict role check (`req.user.role === 'ADMIN'`). |
| `/api/authority/*` | ALL | 401 Blocked | 403 Blocked | 403 Blocked | Allowed | Strict role check (`req.user.role === 'AUTHORIZED_AUTHORITY'`).|
| `/api/intelligence/*` | ALL | 401 Blocked | 403 Blocked | Allowed | Allowed | Restricted to verified oversight roles. |

### 2.2 Token Lifecycle & Session Handling
- **Algorithm:** HMAC SHA-256 (`jsonwebtoken`).
- **Signature Integrity:** Tampered or invalid JWT signatures immediately trigger `401 Unauthorized` with `JsonWebTokenError` caught and logged without exposing stack traces.
- **Expiration Enforcement:** Tokens verified with explicit expiration (`1d`); expired tokens return `401 Unauthorized` with `TokenExpiredError`.
- **Secret Hygiene:** `JWT_SECRET` loaded exclusively from environment variables.
- **Credential Storage:** Passwords never stored in plaintext; hashed with bcrypt before persistence. Password hashes are excluded from user projection queries.

---

## 3. IDOR (Insecure Direct Object Reference) Protection

Defensive tests verified object-level authorization across all entities:

1. **Complaint Dossiers (`/api/complaints/:id`):**
   - Customer A creates complaint #FSA-2026-235953.
   - Customer B (authenticated with valid token) attempts access to complaint #FSA-2026-235953.
   - **Result:** Server executes ownership check:
     ```javascript
     if (req.user.role === "CUSTOMER" && complaint.user_id !== req.user.id) {
       return res.status(403).json({ success: false, message: "Unauthorized access to complaint." });
     }
     ```
   - **Verification:** Returns `403 Forbidden`. Customer B cannot read Customer A's complaint.

2. **Evidence Image Streaming (`/api/complaints/:id/images/:imgId`):**
   - Direct static access to the `uploads/` directory is completely disabled in Express (`app.use('/uploads', ...)` was intentionally removed).
   - All image retrieval passes through the authenticated controller route.
   - Customer B attempting to stream Customer A's uploaded evidence receives `403 Forbidden`.
   - Admin and assigned Authority receive `200 OK` with streamed binary image data.

3. **Complaint Tracking (`/api/complaints/track/:complaintId`):**
   - Public tracking endpoint accepts the generated FoodSafe ID.
   - **Data Minimization:** Sensitive citizen PII (citizen phone number, email address, password hash, and complainant user ID) is strictly stripped from tracking responses. Only public grievance metadata (category, seller name, landmark, status milestones, and resolution summary) is returned.

4. **Investigation Records & Authority Actions:**
   - Authority enforcement logs (`/api/authority/actions/:id`) cannot be modified or deleted by Customers or Administrators.
   - Only authorized enforcement officers can submit investigation progress updates.

---

## 4. Input Validation & Injection Defenses

### 4.1 SQL Injection Protection
- **ORM:** 100% of database access is conducted through Sequelize ORM model abstractions.
- **Parameterized Queries:** All dynamic parameters, search filters, and query options are automatically sanitized and passed via parameterized placeholders (`?`).
- **Raw SQL Sanitization:** Where raw SQL is used (e.g., in analytics aggregation), column aliases and replacements use strict parameter binding (`replacements: { ... }`) or fixed string identifiers.
- **Verification:** Penetration payloads (`' OR '1'='1`, `'; DROP TABLE complaints; --`) passed in `product_name`, `landmark`, and `category` fields are safely escaped as literal strings.

### 4.2 Cross-Site Scripting (XSS) Defenses
- **React Context:** React JSX auto-escapes rendered text content by default, preventing reflected HTML/JS execution.
- **Rich Content:** No user-submitted input is injected via `dangerouslySetInnerHTML`.
- **Server Sanitization:** Express request bodies are validated with `express-validator` and stripped of illegal characters.

### 4.3 File Upload Security & MIME Spoofing
Evidence uploads are defended by a multi-layered validation pipeline in `backend/src/middleware/uploadMiddleware.js`:
1. **File Extension Whitelist:** Only `.jpg`, `.jpeg`, `.png`, and `.webp` extensions permitted. All other extensions (`.exe`, `.php`, `.sh`, `.txt`, `.html`) are rejected with `400 Validation Error`.
2. **MIME Type Validation:** `file.mimetype` verified against image MIME types (`image/jpeg`, `image/png`, `image/webp`).
3. **Cryptographic Magic Byte Verification:** Uploaded file headers are verified against authentic binary signatures (e.g. `89 50 4E 47` for PNG, `FF D8 FF` for JPEG). Spoofed files (e.g., text files renamed to `.png`) are immediately caught and deleted from the temporary staging disk.
4. **Filename Sanitization:** Uploaded files are renamed using cryptographically random UUIDs (`${uuidv4()}${ext}`), neutralizing path traversal attacks (`../../etc/passwd`).
5. **Payload Size Limit:** Uploads strictly capped at 5 MB per file.

### 4.4 Geolocation Boundary Validation
Coordinates submitted via GPS or map marker undergo strict mathematical boundary checking in `backend/src/utils/coordinateValidator.js`:
- Latitude must be a valid float in `[-90.0, 90.0]`.
- Longitude must be a valid float in `[-180.0, 180.0]`.
- Legitimate zero coordinates (`0.0, 0.0`) are handled properly without being treated as falsy or null.
- Out-of-bounds coordinates (e.g. `lat: 120.5`) are rejected with `400 Validation Error`.

---

## 5. Security Configuration & Infrastructure Hardening

### 5.1 HTTP Security Headers & Helmet
`helmet` is configured in `backend/src/app.js` with:
- `Cross-Origin-Resource-Policy: cross-origin` (permitting evidence image streaming across frontend port).
- `X-Content-Type-Options: nosniff`.
- `X-Frame-Options: SAMEORIGIN` (mitigating clickjacking).
- `Strict-Transport-Security` (recommended for production HTTPS reverse proxy).
- `app.disable("x-powered-by")` explicitly executed to prevent server technology fingerprinting.

### 5.2 Production CORS Configuration
**Defect Resolved (FS-BUG-603):**
The development CORS regex (`/^http:\/\/(localhost|127\.0\.0\.1):(3000|517[3-9])$/`) was hardened to ensure that in production environments (`NODE_ENV === "production"`), only origins configured via `process.env.FRONTEND_URL` or `process.env.ALLOWED_ORIGINS` are accepted. Development localhost ports are strictly disallowed in production mode.

### 5.3 Cryptographic Randomness for Identifiers
**Defect Resolved (FS-BUG-602):**
Replaced pseudo-random `Math.random()` in `generateComplaintId` with Node.js `crypto.randomInt(100000, 1000000)`, preventing tracking ID prediction and PRNG sequence collisions.

### 5.4 Secret & Credential Protection
- `.env` files are excluded from version control via `.gitignore`.
- Database dumps (`*.sql`, `*.dump`, `pre_phase1_backup.sql`) are strictly ignored.
- Customer uploaded images (`backend/src/uploads/*`) are excluded from Git to prevent customer PII leakage.
- Database passwords, JWT secret tokens, and session credentials are never logged to console or included in error responses.

---

## 6. Security Audit Findings & Resolution Summary

| Vulnerability / Risk | Severity | Status | Resolution / Safeguard |
| :--- | :---: | :---: | :--- |
| **CORS Overly Permissive in Production** | Medium | **FIXED** | Gated localhost regex behind `NODE_ENV !== "production"`; strict whitelist in prod. |
| **Weak PRNG in Tracking ID Generation** | Low | **FIXED** | Migrated `Math.random()` to `crypto.randomInt()`. |
| **Fake Confidence Randomness in AI Screening** | Medium | **FIXED** | Replaced `Math.random()` with deterministic FSSAI DART scoring + factor points. |
| **Uploaded Evidence Tracked in Git** | High | **FIXED** | Added `backend/src/uploads/*` to `.gitignore`. |
| **Misleading Statutory FSSAI Claims** | Low | **FIXED** | Removed false authority statements; added official FoSCoS portal links. |
| **Singleton Hotspot Cluster Privacy Leak** | Medium | **FIXED** | Enforced minimum cluster threshold of 2 reports across map analytics. |

---

## 7. Security Certification

All critical and high severity security risks have been resolved and defensively verified.

**Security Audit Result:** **CERTIFIED SECURE FOR STAGING**
