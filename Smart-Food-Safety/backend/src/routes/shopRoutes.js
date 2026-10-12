const express = require("express");
const router = express.Router();

const {
  getAllShops,
  getShopById,
  createShop,
  updateShop,
  deleteShop,
} = require("../controllers/shopController");

const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

// List all shops (Customer, Admin, Authority)
router.get("/", authenticateToken, getAllShops);

// Get single shop
router.get("/:id", authenticateToken, getShopById);

// Admin-only management
router.post("/", authenticateToken, authorizeRoles("ADMIN"), createShop);
router.put("/:id", authenticateToken, authorizeRoles("ADMIN"), updateShop);
router.delete("/:id", authenticateToken, authorizeRoles("ADMIN"), deleteShop);

module.exports = router;
