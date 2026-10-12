const { body, param, validationResult } = require("express-validator");

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    return res.status(400).json({
      success: false,
      message: firstError.msg || "Invalid request parameters.",
      errors: errors.array(),
    });
  }
  next();
};

const validateRegister = [
  body("name").trim().notEmpty().withMessage("Full name is required."),
  body("email").trim().isEmail().withMessage("Valid email address is required."),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long."),
  handleValidationErrors,
];

const validateLogin = [
  body("email").trim().isEmail().withMessage("Valid email address is required."),
  body("password").notEmpty().withMessage("Password is required."),
  handleValidationErrors,
];

const VALID_SELLER_TYPES = [
  "Roadside Food Stall",
  "Food Cart",
  "Small Shop",
  "Restaurant",
  "Temporary Market Stall",
  "Other / Unknown",
];

const validateComplaint = [
  body("category")
    .trim()
    .notEmpty()
    .withMessage("Complaint category is required."),
  body("description")
    .trim()
    .isLength({ min: 5 })
    .withMessage("Complaint description must be at least 5 characters."),
  body("seller_listing_type")
    .optional({ nullable: true, checkFalsy: true })
    .custom((val) => {
      const normalized = String(val).toUpperCase().trim();
      if (normalized !== "LISTED" && normalized !== "UNLISTED") {
        throw new Error("Invalid seller listing type. Must be LISTED or UNLISTED.");
      }
      return true;
    }),
  body("seller_type")
    .optional({ nullable: true, checkFalsy: true })
    .custom((val, { req }) => {
      if (val && !VALID_SELLER_TYPES.includes(val.trim())) {
        throw new Error("Invalid seller type. Must be an approved vendor classification.");
      }
      return true;
    }),
  body("latitude")
    .optional({ nullable: true, checkFalsy: false })
    .custom((val, { req }) => {
      if (val === null || val === undefined || val === "") return true;
      const num = Number(val);
      if (!Number.isFinite(num) || isNaN(num) || num < -90 || num > 90) {
        throw new Error("Invalid latitude. Must be a finite number between -90 and 90.");
      }
      const lng = req.body.longitude;
      if (lng === undefined || lng === null || lng === "") {
        throw new Error("Both latitude and longitude must be provided together.");
      }
      return true;
    }),
  body("longitude")
    .optional({ nullable: true, checkFalsy: false })
    .custom((val, { req }) => {
      if (val === null || val === undefined || val === "") return true;
      const num = Number(val);
      if (!Number.isFinite(num) || isNaN(num) || num < -180 || num > 180) {
        throw new Error("Invalid longitude. Must be a finite number between -180 and 180.");
      }
      const lat = req.body.latitude;
      if (lat === undefined || lat === null || lat === "") {
        throw new Error("Both latitude and longitude must be provided together.");
      }
      return true;
    }),
  handleValidationErrors,
];

const validateStatusUpdate = [
  body("status")
    .isIn([
      "SUBMITTED",
      "UNDER_REVIEW",
      "VERIFIED",
      "INVESTIGATION",
      "RESOLVED",
      "REJECTED",
    ])
    .withMessage("Invalid complaint status."),
  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  validateRegister,
  validateLogin,
  validateComplaint,
  validateStatusUpdate,
};
