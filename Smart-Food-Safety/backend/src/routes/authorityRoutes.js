const express = require("express");

const router = express.Router();

const {
  getVerifiedComplaints,
  getInvestigationComplaints,
  getAuthorityStatistics,
  updateInvestigation,
  recordAuthorityAction,
  getInvestigationHistory,
  getAuthorityCases,
  getAuthorityReports
} = require("../controllers/authorityController");

const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

// ======================================================
// AUTHORIZED AUTHORITY PROTECTED ROUTES
// ======================================================

// 1. Get verified complaints
router.get(
  "/complaints",
  authenticateToken,
  authorizeRoles("AUTHORIZED_AUTHORITY"),
  getVerifiedComplaints
);

// 2. Get investigation complaints
router.get(
  "/investigations",
  authenticateToken,
  authorizeRoles("AUTHORIZED_AUTHORITY"),
  getInvestigationComplaints
);

// 3. Get authority statistics
router.get(
  "/statistics",
  authenticateToken,
  authorizeRoles("AUTHORIZED_AUTHORITY"),
  getAuthorityStatistics
);

// 4. Get authority cases (all active cases for authority)
router.get(
  "/cases",
  authenticateToken,
  authorizeRoles("AUTHORIZED_AUTHORITY"),
  getAuthorityCases
);

// 5. Get authority reports
router.get(
  "/reports",
  authenticateToken,
  authorizeRoles("AUTHORIZED_AUTHORITY"),
  getAuthorityReports
);

// 6. Update investigation
router.put(
  "/complaints/:complaint_id/investigation",
  authenticateToken,
  authorizeRoles("AUTHORIZED_AUTHORITY"),
  updateInvestigation
);

// 7. Record authority action
router.post(
  "/complaints/:complaint_id/action",
  authenticateToken,
  authorizeRoles("AUTHORIZED_AUTHORITY"),
  recordAuthorityAction
);

// 8. Get investigation history
router.get(
  "/complaints/:complaint_id/history",
  authenticateToken,
  authorizeRoles("AUTHORIZED_AUTHORITY"),
  getInvestigationHistory
);

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;