
const express = require("express");
console.log("COMPLAINT ROUTES LOADED");
const router = express.Router();

const {
  createComplaint,
  getComplaint,
  getMyComplaints,
  getCustomerStatistics,
  uploadComplaintImages,
  checkComplaintDuplicate,
  getComplaintImage,
} = require("../controllers/complaintController");

const upload = require("../middleware/uploadMiddleware");
const authenticateToken = require("../middleware/authMiddleware");
const { validateComplaint } = require("../middleware/validationMiddleware");
const rateLimit = require("../middleware/rateLimitMiddleware");

const complaintSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many complaint submissions from this client. Please try again later."
});

const trackLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: "Too many status tracking queries. Please wait a moment."
});

// ==========================================
// CREATE COMPLAINT + FOOD IMAGE
// ==========================================
// POST /api/complaints

router.post(
  "/",
  complaintSubmitLimiter,
  authenticateToken,
  upload.single("food_image"),
  upload.validateUploadedFile,
  validateComplaint,
  createComplaint
);

// ==========================================
// CHECK DUPLICATE COMPLAINT
// ==========================================
// POST /api/complaints/check-duplicate

router.post(
  "/check-duplicate",
  authenticateToken,
  checkComplaintDuplicate
);

// ==========================================
// GET MY COMPLAINTS
// ==========================================
// GET /api/complaints/my

router.get(
  "/my",
  authenticateToken,
  getMyComplaints
);

// ==========================================
// GET MY COMPLAINT STATISTICS
// ==========================================
// GET /api/complaints/my/statistics

router.get(
  "/my/statistics",
  authenticateToken,
  getCustomerStatistics
);

// ==========================================
// GET COMPLAINT DETAILS
// ==========================================
// GET /api/complaints/FSA-2026-000108

router.get(
  "/:complaintId",
  trackLimiter,
  authenticateToken,
  getComplaint
);

// ==========================================
// UPLOAD ADDITIONAL FOOD IMAGES
// ==========================================
// POST /api/complaints/13/images

router.post(
  "/:id/images",
  authenticateToken,
  upload.array("food_images", 5),
  upload.validateUploadedFile,
  uploadComplaintImages
);

// ==========================================
// GET PROTECTED EVIDENCE IMAGE
// ==========================================
// GET /api/complaints/:complaintId/images/:imageId

router.get(
  "/:complaintId/images/:imageId",
  authenticateToken,
  getComplaintImage
);

module.exports = router;