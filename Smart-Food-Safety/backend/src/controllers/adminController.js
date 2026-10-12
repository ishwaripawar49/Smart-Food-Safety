const {
  Complaint,
  Notification,
  User,
  Shop,
} = require("../models");

const { sequelize } = require("../config/database");

const {
  createComplaintNotification,
} = require("../utils/notificationHelper");

// ==========================================
// GET ALL COMPLAINTS
// ==========================================

const getAllComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.findAll({
      include: [
        { model: Shop, as: "shop", required: false }
      ],
      order: [["created_at", "DESC"]],
    });

    res.json({
      success: true,
      complaints: complaints,
    });
  } catch (error) {
    console.error("Get All Complaints Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch complaints.",
      error: error.message,
    });
  }
};

// ==========================================
// GET DASHBOARD STATISTICS
// ==========================================

const getDashboardStats = async (req, res) => {
  try {
    // --------------------------------------
    // COMPLAINT STATISTICS
    // --------------------------------------

    const totalComplaints = await Complaint.count();

    const submitted = await Complaint.count({
      where: {
        status: "SUBMITTED",
      },
    });

    const underReview = await Complaint.count({
      where: {
        status: "UNDER_REVIEW",
      },
    });

    const verified = await Complaint.count({
      where: {
        status: "VERIFIED",
      },
    });

    const investigation = await Complaint.count({
      where: {
        status: "INVESTIGATION",
      },
    });

    const resolved = await Complaint.count({
      where: {
        status: "RESOLVED",
      },
    });

    const rejected = await Complaint.count({
      where: {
        status: "REJECTED",
      },
    });

    // --------------------------------------
    // SHOP COUNT
    // --------------------------------------

    const [shopResult] = await sequelize.query(
      "SELECT COUNT(*) AS totalShops FROM shops"
    );

    const totalShops = Number(shopResult[0].totalShops);

    // --------------------------------------
    // USER COUNT
    // --------------------------------------

    const [userResult] = await sequelize.query(
      "SELECT COUNT(*) AS totalUsers FROM users"
    );

    const totalUsers = Number(userResult[0].totalUsers);

    // --------------------------------------
    // SEND RESPONSE
    // --------------------------------------

    res.json({
      success: true,

      statistics: {
        totalComplaints,
        submitted,
        underReview,
        verified,
        investigation,
        resolved,
        rejected,
        totalShops,
        totalUsers,
      },
    });
  } catch (error) {
    console.error("Dashboard Statistics Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics.",
      error: error.message,
    });
  }
};

// ==========================================
// UPDATE COMPLAINT STATUS
// ==========================================

const updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // --------------------------------------
    // ALLOWED STATUSES
    // --------------------------------------

    const allowedStatuses = [
      "SUBMITTED",
      "UNDER_REVIEW",
      "VERIFIED",
      "INVESTIGATION",
      "RESOLVED",
      "REJECTED",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid complaint status.",
      });
    }

    // --------------------------------------
    // FIND COMPLAINT
    // --------------------------------------

    const complaint = await Complaint.findByPk(id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found.",
      });
    }

    // --------------------------------------
    // SAVE PREVIOUS STATUS
    // --------------------------------------

    const previousStatus = complaint.status;

    // --------------------------------------
    // UPDATE COMPLAINT STATUS
    // --------------------------------------

    await complaint.update({
      status: status,
    });

    // ======================================
    // CUSTOMER NOTIFICATION
    // ONLY WHEN STATUS CHANGES
    // ======================================

    if (
      previousStatus !== status &&
      complaint.user_id
    ) {
      try {
        await createComplaintNotification({
          userId: complaint.user_id,
          complaintId: complaint.id,
          complaintNumber: complaint.complaint_id,
          status: status,
        });

        console.log(
          `Customer notification created for complaint ${complaint.complaint_id}`
        );
      } catch (notificationError) {
        console.error(
          "Customer Notification Error:",
          notificationError
        );
      }
    }

    // ======================================
    // AUTHORITY NOTIFICATION
    // ONLY WHEN STATUS CHANGES TO VERIFIED
    // ======================================

    if (
      status === "VERIFIED" &&
      previousStatus !== "VERIFIED"
    ) {
      try {
        // ----------------------------------
        // FIND ALL AUTHORIZED AUTHORITIES
        // ----------------------------------

        const authorities = await User.findAll({
          where: {
            role: "AUTHORIZED_AUTHORITY",
          },
        });

        // ----------------------------------
        // CREATE NOTIFICATION
        // FOR EACH AUTHORITY
        // ----------------------------------

        for (const authority of authorities) {
          await Notification.create({
            user_id: authority.id,
            complaint_id: complaint.id,
            recipient_role: "AUTHORIZED_AUTHORITY",
            title: "Verified Complaint",
            message:
              `${complaint.complaint_id} has been verified by Admin and referred to the Authority.`,
            notification_type: "VERIFIED",
            is_read: false,
          });
        }

        console.log(
          `Authority notification created for complaint ${complaint.complaint_id}`
        );
      } catch (notificationError) {
        console.error(
          "Authority Notification Error:",
          notificationError
        );
      }
    }

    // --------------------------------------
    // SEND RESPONSE
    // --------------------------------------

    res.json({
      success: true,
      message: "Complaint status updated successfully.",
      complaint: complaint,
    });
  } catch (error) {
    console.error(
      "Update Complaint Status Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to update complaint status.",
      error: error.message,
    });
  }
};

// ==========================================
// UPDATE ADMIN REMARK
// ==========================================

const updateComplaintRemark = async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_remark } = req.body;

    // --------------------------------------
    // FIND COMPLAINT
    // --------------------------------------

    const complaint = await Complaint.findByPk(id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found.",
      });
    }

    // --------------------------------------
    // UPDATE ADMIN REMARK
    // --------------------------------------

    await complaint.update({
      admin_remark: admin_remark || "",
    });

    // --------------------------------------
    // SEND RESPONSE
    // --------------------------------------

    res.json({
      success: true,
      message: "Admin remark updated successfully.",
      complaint: complaint,
    });
  } catch (error) {
    console.error(
      "Update Admin Remark Error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to update complaint remark.",
      error: error.message,
    });
  }
};

// ==========================================
// GET ADMIN COMPREHENSIVE REPORTS
// ==========================================

const getAdminReports = async (req, res) => {
  try {
    const totalComplaints = await Complaint.count();

    // Status breakdown
    const statusCounts = await Complaint.findAll({
      attributes: [
        "status",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"]
      ],
      group: ["status"],
      raw: true
    });

    // Priority / Risk breakdown
    const priorityCounts = await Complaint.findAll({
      attributes: [
        "priority",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"]
      ],
      group: ["priority"],
      raw: true
    });

    // Category breakdown
    const categoryCounts = await Complaint.findAll({
      attributes: [
        "category",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"]
      ],
      group: ["category"],
      raw: true
    });

    // Location breakdown
    const locationCounts = await Complaint.findAll({
      attributes: [
        "location",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"]
      ],
      where: sequelize.where(sequelize.col("location"), { [require("sequelize").Op.ne]: null }),
      group: ["location"],
      order: [[sequelize.fn("COUNT", sequelize.col("id")), "DESC"]],
      limit: 10,
      raw: true
    });

    // Monthly trends
    const [monthlyResults] = await sequelize.query(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') AS month,
        COUNT(*) AS count
      FROM complaints
      WHERE created_at IS NOT NULL
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month ASC
      LIMIT 12
    `);

    // Counts for summary cards
    const resolved = await Complaint.count({ where: { status: "RESOLVED" } });
    const critical = await Complaint.count({ where: { priority: "CRITICAL" } });
    const high = await Complaint.count({ where: { priority: "HIGH" } });
    const inProgress = await Complaint.count({
      where: {
        status: {
          [require("sequelize").Op.in]: ["UNDER_REVIEW", "VERIFIED", "INVESTIGATION"]
        }
      }
    });

    const [shopResult] = await sequelize.query("SELECT COUNT(*) AS totalShops FROM shops");
    const [userResult] = await sequelize.query("SELECT COUNT(*) AS totalUsers FROM users");

    const resolutionRate = totalComplaints > 0 ? ((resolved / totalComplaints) * 100).toFixed(1) : "0.0";

    res.json({
      success: true,
      report: {
        totalComplaints,
        resolvedComplaints: resolved,
        inProgressComplaints: inProgress,
        criticalComplaints: critical,
        highRiskComplaints: high,
        resolutionRate,
        totalShops: Number(shopResult[0]?.totalShops || 0),
        totalUsers: Number(userResult[0]?.totalUsers || 0),
        statusBreakdown: statusCounts.reduce((acc, curr) => {
          acc[curr.status] = Number(curr.count);
          return acc;
        }, {}),
        priorityBreakdown: priorityCounts.reduce((acc, curr) => {
          acc[curr.priority] = Number(curr.count);
          return acc;
        }, {}),
        categoryBreakdown: categoryCounts.map(c => ({
          category: c.category,
          count: Number(c.count)
        })),
        locationBreakdown: locationCounts.map(l => ({
          location: l.location,
          count: Number(l.count)
        })),
        monthlyTrends: monthlyResults.map(m => ({
          month: m.month,
          count: Number(m.count)
        }))
      }
    });
  } catch (error) {
    console.error("Admin Reports Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate admin reports.",
      error: error.message
    });
  }
};

// ==========================================
// EXPORT FUNCTIONS
// ==========================================

module.exports = {
  getAllComplaints,
  getDashboardStats,
  updateComplaintStatus,
  updateComplaintRemark,
  getAdminReports,
};