const express = require("express");
const router = express.Router();

const {
  getHotspots,
  getDuplicateQueue,
  reviewDuplicate,
  getExplainableRisk,
  overridePriority,
  getIntelligenceOverview,
  getTrends,
} = require("../controllers/intelligenceController");

const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

// All intelligence endpoints require authentication and authorized role
const requireAuthorizedReviewer = [
  authenticateToken,
  authorizeRoles("ADMIN", "AUTHORIZED_AUTHORITY"),
];

// 1. Hotspot Geographic Analytics
router.get("/hotspots", ...requireAuthorizedReviewer, getHotspots);

// 2. Executive Intelligence Overview
router.get("/overview", ...requireAuthorizedReviewer, getIntelligenceOverview);

// 3. Trends and Aggregations
router.get("/trends", ...requireAuthorizedReviewer, getTrends);

// 4. Duplicate Complaint Review Queue
router.get("/duplicates", ...requireAuthorizedReviewer, getDuplicateQueue);
router.post("/duplicates/review", ...requireAuthorizedReviewer, reviewDuplicate);

// 5. Explainable Risk Prioritization & Overrides
router.get("/risk/:id", ...requireAuthorizedReviewer, getExplainableRisk);
router.post("/risk/:id/override", ...requireAuthorizedReviewer, overridePriority);

module.exports = router;
