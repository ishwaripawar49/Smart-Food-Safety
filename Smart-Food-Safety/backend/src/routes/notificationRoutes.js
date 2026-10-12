const express = require("express");

const router = express.Router();

const {
  getCustomerNotifications,
  getAuthorityNotifications,
  getAdminNotifications,
  markNotificationAsRead,
  markAllCustomerNotificationsAsRead,
  markAllNotificationsAsRead,
  markAllAdminNotificationsAsRead,
} = require("../controllers/notificationController");

const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

// ==========================================
// 1. CUSTOMER NOTIFICATIONS
// ==========================================

router.get(
  "/customer",
  authenticateToken,
  authorizeRoles("CUSTOMER"),
  getCustomerNotifications
);

router.put(
  "/customer/read-all",
  authenticateToken,
  authorizeRoles("CUSTOMER"),
  markAllCustomerNotificationsAsRead
);

// ==========================================
// 2. AUTHORITY NOTIFICATIONS
// ==========================================

router.get(
  "/authority",
  authenticateToken,
  authorizeRoles("AUTHORIZED_AUTHORITY"),
  getAuthorityNotifications
);

router.put(
  "/authority/read-all",
  authenticateToken,
  authorizeRoles("AUTHORIZED_AUTHORITY"),
  markAllNotificationsAsRead
);

// ==========================================
// 3. ADMIN NOTIFICATIONS
// ==========================================

router.get(
  "/admin",
  authenticateToken,
  authorizeRoles("ADMIN"),
  getAdminNotifications
);

router.put(
  "/admin/read-all",
  authenticateToken,
  authorizeRoles("ADMIN"),
  markAllAdminNotificationsAsRead
);

// ==========================================
// 4. MARK SINGLE NOTIFICATION AS READ
// ==========================================

router.put(
  "/:id/read",
  authenticateToken,
  markNotificationAsRead
);

module.exports = router;