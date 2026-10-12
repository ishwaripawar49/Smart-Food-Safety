const express = require("express");

const router = express.Router();

const {
  getAllComplaints,
  getDashboardStats,
  updateComplaintStatus,
  updateComplaintRemark,
  getAdminReports
} = require("../controllers/adminController");

const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");
const { validateStatusUpdate } = require("../middleware/validationMiddleware");

// ================= ADMIN PROTECTED ROUTES =================

// Get all complaints
router.get(
  "/complaints",
  authenticateToken,
  authorizeRoles("ADMIN"),
  getAllComplaints
);

// Get dashboard statistics
router.get(
  "/statistics",
  authenticateToken,
  authorizeRoles("ADMIN"),
  getDashboardStats
);

// Get comprehensive reports
router.get(
  "/reports",
  authenticateToken,
  authorizeRoles("ADMIN"),
  getAdminReports
);

// Update complaint status
router.put(
  "/complaints/:id/status",
  authenticateToken,
  authorizeRoles("ADMIN"),
  validateStatusUpdate,
  updateComplaintStatus
);

// Update complaint remark
router.put(
  "/complaints/:id/remark",
  authenticateToken,
  authorizeRoles("ADMIN"),
  updateComplaintRemark
);

module.exports = router;