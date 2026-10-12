const express = require("express");

const router = express.Router();

const {
  registerUser,
  loginUser
} = require("../controllers/authController");

const authenticateToken = require("../middleware/authMiddleware");
const rateLimit = require("../middleware/rateLimitMiddleware");
const {
  validateRegister,
  validateLogin
} = require("../middleware/validationMiddleware");

// Rate limit: 20 attempts per 15 minutes for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many authentication attempts. Please try again after 15 minutes."
});

// Customer Registration
router.post("/register", authLimiter, validateRegister, registerUser);

// Login
router.post("/login", authLimiter, validateLogin, loginUser);

// Protected test route
router.get("/me", authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: "Authentication successful.",
    user: req.user
  });
});

module.exports = router;