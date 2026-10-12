const { Notification } = require("../models");
const { Op } = require("sequelize");

// ==========================================
// 1. GET CUSTOMER NOTIFICATIONS
// ==========================================

const getCustomerNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await Notification.findAll({
      where: {
        user_id: userId,
        recipient_role: "CUSTOMER",
      },
      order: [["created_at", "DESC"]],
    });

    res.json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error(
      "GET CUSTOMER NOTIFICATIONS ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer notifications.",
      error: error.message,
    });
  }
};

// ==========================================
// 2. GET AUTHORITY NOTIFICATIONS
// ==========================================

const getAuthorityNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await Notification.findAll({
      where: {
        user_id: userId,
        recipient_role: "AUTHORIZED_AUTHORITY",
      },
      order: [["created_at", "DESC"]],
    });

    res.json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error(
      "GET AUTHORITY NOTIFICATIONS ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch authority notifications.",
      error: error.message,
    });
  }
};

// ==========================================
// 3. MARK ONE NOTIFICATION AS READ
// ==========================================

const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const role = req.user.role;

    const whereClause = { id: id };
    if (role === "ADMIN") {
      whereClause[Op.or] = [
        { recipient_role: "ADMIN" },
        { user_id: userId },
      ];
    } else {
      whereClause.user_id = userId;
    }

    const notification = await Notification.findOne({
      where: whereClause,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    await notification.update({
      is_read: true,
    });

    res.json({
      success: true,
      message: "Notification marked as read.",
      notification,
    });
  } catch (error) {
    console.error(
      "MARK NOTIFICATION READ ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to update notification.",
      error: error.message,
    });
  }
};

// ==========================================
// 4. MARK ALL CUSTOMER NOTIFICATIONS AS READ
// ==========================================

const markAllCustomerNotificationsAsRead = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;

    await Notification.update(
      {
        is_read: true,
      },
      {
        where: {
          user_id: userId,
          recipient_role: "CUSTOMER",
          is_read: false,
        },
      }
    );

    res.json({
      success: true,
      message:
        "All customer notifications marked as read.",
    });
  } catch (error) {
    console.error(
      "MARK ALL CUSTOMER NOTIFICATIONS ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to mark customer notifications as read.",
    });
  }
};

// ==========================================
// 5. MARK ALL AUTHORITY NOTIFICATIONS AS READ
// ==========================================

const markAllNotificationsAsRead = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;

    await Notification.update(
      {
        is_read: true,
      },
      {
        where: {
          user_id: userId,
          recipient_role:
            "AUTHORIZED_AUTHORITY",
          is_read: false,
        },
      }
    );

    res.json({
      success: true,
      message:
        "All authority notifications marked as read.",
    });
  } catch (error) {
    console.error(
      "MARK ALL AUTHORITY NOTIFICATIONS ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to mark authority notifications as read.",
    });
  }
};

// ==========================================
// 6. GET ADMIN NOTIFICATIONS
// ==========================================

const getAdminNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await Notification.findAll({
      where: {
        [Op.or]: [
          { recipient_role: "ADMIN" },
          { user_id: userId, recipient_role: "ADMIN" }
        ]
      },
      order: [["created_at", "DESC"]],
      limit: 100
    });

    res.json({
      success: true,
      count: notifications.length,
      notifications
    });
  } catch (error) {
    console.error("GET ADMIN NOTIFICATIONS ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch admin notifications.",
      error: error.message
    });
  }
};

// ==========================================
// 7. MARK ALL ADMIN NOTIFICATIONS AS READ
// ==========================================

const markAllAdminNotificationsAsRead = async (req, res) => {
  try {
    await Notification.update(
      { is_read: true },
      {
        where: {
          recipient_role: "ADMIN",
          is_read: false
        }
      }
    );

    res.json({
      success: true,
      message: "All admin notifications marked as read."
    });
  } catch (error) {
    console.error("MARK ALL ADMIN NOTIFICATIONS ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark admin notifications as read.",
      error: error.message
    });
  }
};

module.exports = {
  getCustomerNotifications,
  getAuthorityNotifications,
  getAdminNotifications,
  markNotificationAsRead,
  markAllCustomerNotificationsAsRead,
  markAllNotificationsAsRead,
  markAllAdminNotificationsAsRead,
};