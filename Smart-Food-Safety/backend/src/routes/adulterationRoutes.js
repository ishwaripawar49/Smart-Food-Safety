const express = require("express");
const router = express.Router();

const {
  runAdulterationTest,
  getAdulterationTests,
  getAdulterationStandards
} = require("../controllers/adulterationController");

const authenticateToken = require("../middleware/authMiddleware");

// 1. Get FSSAI DART standards (public or authenticated)
router.get("/standards", getAdulterationStandards);

// 2. Run adulteration test / screening
router.post("/test", authenticateToken, runAdulterationTest);

// 3. Get past adulteration test results
router.get("/tests", authenticateToken, getAdulterationTests);

module.exports = router;
