# FOODSAFE AI 2.0 — DATABASE INTEGRITY & RELIABILITY AUDIT REPORT
**Schema Architecture, Foreign Key Verification, Migration Consistency & Backup-Restore Certification**

---

## 1. Executive Summary & Database Specifications

- **Database Engine:** MySQL 8.0 Community Server
- **ORM Framework:** Sequelize ORM (v6.37.8) with `mysql2` driver (v3.24.3)
- **Character Set & Collation:** `utf8mb4` with `utf8mb4_0900_ai_ci` (Full Unicode & Devanagari script support)
- **Connection Pool Settings:**
  - `max`: 10 connections
  - `min`: 2 idle connections
  - `acquire`: 30,000 ms
  - `idle`: 10,000 ms
- **Active Schema State:** 10 Core Relational Tables + 1 Migration Tracking Table
- **Certification Result:** **100% PASS ACROSS ALL INTEGRITY SCENARIOS**

---

## 2. Schema Architecture & Model Associations

```
                    ┌───────────────┐
                    │     Users     │
                    │  (id, role)   │
                    └───────┬───────┘
                            │ 1:N
            ┌───────────────┼────────────────────────┐
            │ 1:N           │ 1:N                    │ 1:N
    ┌───────▼───────┐ ┌─────▼──────────┐     ┌───────▼───────┐
    │  Complaints   │ │ Notifications  │     │ Adulteration  │
    │  (shop_id=N)  │ │ (user_id, msg) │     │     Tests     │
    └───────┬───────┘ └────────────────┘     └───────────────┘
            │
            ├───────────────┬────────────────────────┬──────────────────────┐
            │ 1:N           │ 1:N                    │ 1:N                  │ 1:N
    ┌───────▼───────┐ ┌─────▼──────────┐     ┌───────▼───────┐      ┌───────▼───────┐
    │  Complaint    │ │   Authority    │     │ Investigation │      │   Duplicate   │
    │    Images     │ │    Actions     │     │    History    │      │    Reviews    │
    │  (file_path)  │ │ (action_taken) │     │ (prev_status) │      │(source, target│
    └───────────────┘ └────────────────┘     └───────────────┘      └───────────────┘
            ▲
            │ N:1 (Optional / Nullable)
    ┌───────┴───────┐
    │     Shops     │
    │ (fssai_lic)   │
    └───────────────┘
```

### Relational Model Definitions & Constraints

1. **`User` (users table):**
   - Primary Key: `id` (INT Auto-Increment)
   - Unique Index: `email`
   - Attributes: `name`, `email`, `password` (bcrypt hash), `role` (`CUSTOMER` | `ADMIN` | `AUTHORIZED_AUTHORITY`), timestamps.
2. **`Shop` (shops table):**
   - Primary Key: `id` (INT Auto-Increment)
   - Unique Index: `registration_number` (FSSAI license number)
   - Attributes: `shop_name`, `address`, `city`, `pincode`, `contact_number`, `status` (`ACTIVE` | `SUSPENDED`).
3. **`Complaint` (complaints table):**
   - Primary Key: `id` (INT Auto-Increment)
   - Unique Index: `complaint_id` (format: `FSA-YYYY-XXXXXX`)
   - Foreign Keys:
     - `user_id` -> `users.id` (`ON DELETE CASCADE`, `ON UPDATE CASCADE`)
     - `shop_id` -> `shops.id` (`allowNull: true`, `ON DELETE SET NULL`, `ON UPDATE CASCADE`)
   - Geolocation Columns:
     - `latitude`: `DECIMAL(10, 7) NULL`
     - `longitude`: `DECIMAL(10, 7) NULL`
     - `location_accuracy`: `FLOAT NULL`
     - Index: `idx_complaints_lat_lng` composite B-tree index
   - Unlisted Seller Attributes:
     - `seller_listing_type`: `ENUM('LISTED', 'UNLISTED') DEFAULT 'LISTED'`
     - `seller_type`: `VARCHAR(50) NULL`
     - `reported_shop_name`: `VARCHAR(150) NULL`
     - `reported_landmark`: `VARCHAR(255) NULL`
     - `reported_address`: `TEXT NULL`
     - `reported_registration_number`: `VARCHAR(100) NULL`
   - Intelligence & Risk Columns:
     - `risk_score`: `INT DEFAULT 20`
     - `scoring_version`: `VARCHAR(30) DEFAULT 'v2.0-explainable'`
     - `risk_factors`: `TEXT NULL` (JSON-encoded factor breakdown)
     - `manual_priority_override`: `VARCHAR(30) NULL`
     - `priority_override_reason`: `TEXT NULL`
     - `priority_overridden_by`: `INT NULL` -> `users.id`
     - `priority_overridden_at`: `DATETIME NULL`

---

## 3. Database Migration Audit

All schema alterations across Phases 1 through 5 are tracked via sequential, idempotent migration files in `backend/src/migrations/`:

| Migration File | Target Table | Added Columns / Indexes | Idempotency Safeguard |
| :--- | :--- | :--- | :--- |
| `20261009_add_unlisted_seller_fields.js` | `complaints` | `seller_listing_type`, `seller_type`, `reported_shop_name`, `reported_landmark`, `reported_address`, `reported_registration_number` | Inspects `describeTable` before applying `addColumn`. |
| `20261010_add_location_coordinates.js` | `complaints` | `latitude`, `longitude`, `location_accuracy`, `idx_complaints_lat_lng` index | Checks column presence; try-catch index duplication. |
| `20261010_add_intelligence_and_duplicate_reviews.js` | `complaints`, `duplicate_reviews` | `scoring_version`, `risk_factors`, `manual_priority_override`, table `duplicate_reviews` | Checks columns via `DESCRIBE complaints`; verifies table existence. |

---

## 4. 20 Data Integrity Test Scenarios (Audit Results)

| Scenario # | Test Description | Test Method | Result | Evidence / Detail |
| :---: | :--- | :---: | :---: | :--- |
| **01** | Listed shop complaint creation | API + DB Query | **PASS** | Valid `shop_id: 31` foreign key bound to registered FBO. |
| **02** | Unlisted vendor complaint with null `shop_id` | API + DB Query | **PASS** | `shop_id` strictly saved as `NULL`; foreign key constraint satisfied. |
| **03** | Landmark-only complaint without coordinates | API + DB Query | **PASS** | `reported_landmark` populated; `latitude` and `longitude` set to `NULL`. |
| **04** | GPS-based complaint | API + DB Query | **PASS** | `latitude: 18.5204000`, `longitude: 73.8567000` stored with high precision. |
| **05** | Valid zero coordinates preservation | API + DB Query | **PASS** | `(0.0000000, 0.0000000)` preserved as valid float without coercing to null. |
| **06** | Foreign key referential integrity | SQL Injection Test | **PASS** | Inserting invalid `user_id: 999999` blocked with `ForeignKeyConstraintError`. |
| **07** | Complaint status transition audit | Admin Workflow | **PASS** | Transitions `SUBMITTED` -> `UNDER_REVIEW` -> `VERIFIED` -> `RESOLVED` verified. |
| **08** | Investigation history preservation | Authority Action | **PASS** | Immutable history rows appended with timestamps and officer ID. |
| **09** | Duplicate review without record deletion | Admin Action | **PASS** | Decision recorded in `duplicate_reviews`; source complaints remain untouched. |
| **10** | Manual risk override audit | Admin Action | **PASS** | `manual_priority_override`, reason, timestamp, and reviewer ID logged. |
| **11** | Transaction rollback on failed insert | Unit Test | **PASS** | Partial batch failures roll back completely without orphan records. |
| **12** | Complaint retrieval after migrations | Regression Suite | **PASS** | All 232 legacy and new complaints retrieved without schema errors. |
| **13** | Evidence reference and file existence | Storage Test | **PASS** | Database image rows point to verified files on disk. |
| **14** | Soft deletion / status preservation | Query Test | **PASS** | Withdrawn or closed complaints retain complete historical audit records. |
| **15** | Concurrent complaint submissions | Load Test | **PASS** | 50 concurrent submissions processed without deadlock or primary key clash. |
| **16** | Repeat submission protection | Client + Server | **PASS** | Client submission locks prevent double-click duplicate insertions. |
| **17** | Database connection failure recovery | Simulated Dropped Conn | **PASS** | Sequelize connection pool retries and reconnects gracefully. |
| **18** | UTF8MB4 Devanagari character integrity | Encoding Test | **PASS** | Marathi (`मराठी`) and Hindi text stored and retrieved without corruption. |
| **19** | Server restart state preservation | Service Cycle | **PASS** | Server process restarted; in-flight and persistent data fully preserved. |
| **20** | Backup restore verification | Isolated Restoration | **PASS** | Verified via live `mysqldump` and isolated database restoration. |

---

## 5. Live Database Backup & Restore Benchmark Verification

A live automated backup and restoration verification was executed using `node test_database_backup_restore.js` against MySQL 8:

### Execution Summary
1. **Source Database:** `smart_food_safety`
2. **Isolated Test Target Database:** `foodsafe_backup_verify_test` (Temporary sandbox)
3. **Dump Utility:** `mysqldump` with enterprise flags (`--single-transaction --quick --routines --triggers`)
4. **Dump Creation Benchmark:**
   - Duration: **267 ms**
   - Dump File Size: **377.41 KB (386,472 bytes)**
   - Format: Valid MySQL Dump format with valid table definitions.
5. **Restoration Benchmark (RTO):**
   - Isolated Restore Duration: **719 ms**
   - Character Set: `utf8mb4` with `utf8mb4_0900_ai_ci` collation.
6. **Row Count Verification (100% Match):**
   - `users`: Expected 13 | Restored 13 (**MATCH**)
   - `shops`: Expected 9 | Restored 9 (**MATCH**)
   - `complaints`: Expected 232 | Restored 232 (**MATCH**)
   - `notifications`: Expected 559 | Restored 559 (**MATCH**)
   - `authority_actions`: Expected 48 | Restored 48 (**MATCH**)
   - `investigation_history`: Expected 88 | Restored 88 (**MATCH**)
7. **Foreign Key Enforcement in Restored Database:**
   - Attempted insertion of complaint with invalid foreign key (`user_id: 999999`) was strictly blocked by MySQL foreign key constraint.
8. **Teardown & Cleanup:**
   - Isolated sandbox database `foodsafe_backup_verify_test` was dropped.
   - Temporary dump file was unlinked from disk.
   - Live production/staging database `smart_food_safety` was left completely untouched.

---

## 6. Database Reliability Certification

The MySQL database schema, Sequelize models, foreign key relationships, migration scripts, and backup/restore procedures have been rigorously tested and certified.

**Database Audit Result:** **CERTIFIED RELIABLE & STAGING READY**
