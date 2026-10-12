const {
  Complaint,
  AuthorityAction,
  InvestigationHistory,
  Notification,
  Shop,
  User
} = require("../models");
const { Op } = require("sequelize");
const { sequelize } = require("../config/database");

// Helper to find complaint by PK or complaint_id string
const findComplaintByIdOrNumber = async (idOrNumber) => {
  if (!idOrNumber) return null;
  const includeOptions = [
    { model: Shop, as: "shop", required: false },
    { model: AuthorityAction, as: "authorityActions", required: false }
  ];
  if (!isNaN(idOrNumber) && !String(idOrNumber).startsWith("FSA-")) {
    const comp = await Complaint.findByPk(idOrNumber, { include: includeOptions });
    if (comp) return comp;
  }
  return await Complaint.findOne({
    where: { complaint_id: idOrNumber },
    include: includeOptions
  });
};

// ==========================================
// 1. GET VERIFIED COMPLAINTS
// ==========================================

const getVerifiedComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.findAll({
      where: {
        status: "VERIFIED"
      },
      include: [
        { model: Shop, as: "shop", required: false }
      ],
      order: [["created_at", "DESC"]]
    });

    res.json({
      success: true,
      count: complaints.length,
      complaints
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch verified complaints.",
      error: error.message
    });
  }
};


// ==========================================
// 2. GET INVESTIGATION COMPLAINTS
// ==========================================

const getInvestigationComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.findAll({
      where: {
        status: "INVESTIGATION"
      },
      include: [
        { model: Shop, as: "shop", required: false }
      ],
      order: [["created_at", "DESC"]]
    });

    res.json({
      success: true,
      count: complaints.length,
      complaints
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch investigation complaints.",
      error: error.message
    });
  }
};


// ==========================================
// 3. GET AUTHORITY STATISTICS
// ==========================================

const getAuthorityStatistics = async (req, res) => {
  try {
    const totalVerified = await Complaint.count({
      where: {
        status: "VERIFIED"
      }
    });

    const underInvestigation = await AuthorityAction.count({
      where: {
        investigation_status: "UNDER_INVESTIGATION"
      }
    });

    const actionRequired = await AuthorityAction.count({
      where: {
        investigation_status: "ACTION_REQUIRED"
      }
    });

    const resolved = await AuthorityAction.count({
      where: {
        investigation_status: "RESOLVED"
      }
    });

    res.json({
      success: true,
      statistics: {
        verified: totalVerified,
        under_investigation: underInvestigation,
        action_required: actionRequired,
        resolved: resolved
      }
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch authority statistics.",
      error: error.message
    });
  }
};


// ==========================================
// 4. UPDATE INVESTIGATION
// ==========================================

const updateInvestigation = async (req, res) => {
  try {
    const { complaint_id } = req.params;

    const {
      authority_name,
      investigation_status,
      remarks
    } = req.body;

    const complaint = await findComplaintByIdOrNumber(complaint_id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found."
      });
    }

    const allowedStatuses = [
      "ASSIGNED",
      "UNDER_INVESTIGATION",
      "ACTION_REQUIRED",
      "ACTION_TAKEN",
      "RESOLVED"
    ];

    if (!allowedStatuses.includes(investigation_status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid investigation status."
      });
    }

    const authority_id = req.user?.id || null;

    const [authorityAction, created] =
      await AuthorityAction.findOrCreate({
        where: {
          complaint_id: complaint.id
        },
        defaults: {
          authority_id,
          authority_name,
          investigation_status,
          remarks
        }
      });

    if (!created) {
      await authorityAction.update({
        authority_id: authority_id || authorityAction.authority_id,
        authority_name,
        investigation_status,
        remarks
      });
    }

    // Save every investigation update in history
    await InvestigationHistory.create({
      complaint_id: complaint.id,
      authority_id,
      authority_name,
      status: investigation_status,
      remarks
    });

    // Keep complaint status synchronized
    if (investigation_status === "RESOLVED") {
      await complaint.update({
        status: "RESOLVED"
      });
    } else {
      await complaint.update({
        status: "INVESTIGATION"
      });
    }

    // Notify customer about authority investigation progress
    if (complaint.user_id) {
      try {
        await Notification.create({
          user_id: complaint.user_id,
          complaint_id: complaint.id,
          recipient_role: "CUSTOMER",
          title: investigation_status === "RESOLVED" ? "Investigation Concluded" : "Investigation Update",
          message: `Food Safety Authority updated complaint ${complaint.complaint_id}: ${investigation_status}. ${remarks || ""}`.trim(),
          notification_type: "INVESTIGATION_UPDATE",
          is_read: false,
        });
      } catch (notifErr) {
        console.error("Authority to customer notification error:", notifErr);
      }
    }

    res.json({
      success: true,
      message: "Investigation updated successfully.",
      authorityAction
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to update investigation.",
      error: error.message
    });
  }
};


// ==========================================
// 5. RECORD AUTHORITY ACTION
// ==========================================

const recordAuthorityAction = async (req, res) => {
  try {
    const { complaint_id } = req.params;

    const {
      authority_name,
      action_type,
      remarks
    } = req.body;

    const complaint = await findComplaintByIdOrNumber(complaint_id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found."
      });
    }

    const authority_id = req.user?.id || null;

    const [authorityAction, created] =
      await AuthorityAction.findOrCreate({
        where: {
          complaint_id: complaint.id
        },
        defaults: {
          authority_id,
          authority_name,
          action_type,
          remarks,
          investigation_status: "ACTION_TAKEN",
          action_date: new Date()
        }
      });

    if (!created) {
      await authorityAction.update({
        authority_id: authority_id || authorityAction.authority_id,
        authority_name,
        action_type,
        remarks,
        investigation_status: "ACTION_TAKEN",
        action_date: new Date()
      });
    }

    // Add action to investigation history
    await InvestigationHistory.create({
      complaint_id: complaint.id,
      authority_id,
      authority_name,
      status: "ACTION_TAKEN",
      remarks: remarks
    });

    // Move complaint into investigation stage
    await complaint.update({
      status: "INVESTIGATION"
    });

    // Notify customer about authority enforcement action
    if (complaint.user_id) {
      try {
        await Notification.create({
          user_id: complaint.user_id,
          complaint_id: complaint.id,
          recipient_role: "CUSTOMER",
          title: "Authority Enforcement Action Taken",
          message: `Official action recorded for ${complaint.complaint_id}: ${action_type}. ${remarks || ""}`.trim(),
          notification_type: "ACTION_TAKEN",
          is_read: false,
        });
      } catch (notifErr) {
        console.error("Authority action to customer notification error:", notifErr);
      }
    }

    res.json({
      success: true,
      message: "Authority action recorded successfully.",
      authorityAction
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to record authority action.",
      error: error.message
    });
  }
};


// ==========================================
// 6. GET INVESTIGATION HISTORY
// ==========================================

const getInvestigationHistory = async (req, res) => {
  try {
    const { complaint_id } = req.params;

    const complaint = await findComplaintByIdOrNumber(complaint_id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found."
      });
    }

    const history = await InvestigationHistory.findAll({
      where: {
        complaint_id: complaint.id
      },
      order: [["created_at", "ASC"]]
    });

    res.json({
      success: true,
      complaint_id: complaint.complaint_id,
      history
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch investigation history.",
      error: error.message
    });
  }
};

// ==========================================
// 7. GET AUTHORITY CASES (FULL LIST)
// ==========================================

const getAuthorityCases = async (req, res) => {
  try {
    const cases = await Complaint.findAll({
      where: {
        status: {
          [Op.in]: ["VERIFIED", "INVESTIGATION", "RESOLVED", "ACTION_TAKEN"]
        }
      },
      include: [
        { model: Shop, as: "shop", required: false },
        { model: AuthorityAction, as: "authorityActions", required: false }
      ],
      order: [["updated_at", "DESC"]]
    });

    res.json({
      success: true,
      count: cases.length,
      cases
    });
  } catch (error) {
    console.error("GET AUTHORITY CASES ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch authority cases.",
      error: error.message
    });
  }
};

// ==========================================
// 8. GET AUTHORITY REPORTS
// ==========================================

const getAuthorityReports = async (req, res) => {
  try {
    const totalVerified = await Complaint.count({ where: { status: "VERIFIED" } });
    const underInvestigation = await AuthorityAction.count({ where: { investigation_status: "UNDER_INVESTIGATION" } });
    const actionRequired = await AuthorityAction.count({ where: { investigation_status: "ACTION_REQUIRED" } });
    const resolved = await AuthorityAction.count({ where: { investigation_status: "RESOLVED" } });
    const totalActions = await AuthorityAction.count();

    const actionTypes = await AuthorityAction.findAll({
      attributes: [
        "action_type",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"]
      ],
      where: {
        action_type: { [Op.ne]: null }
      },
      group: ["action_type"],
      raw: true
    });

    const statusBreakdown = await Complaint.findAll({
      attributes: [
        "status",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"]
      ],
      where: {
        status: { [Op.in]: ["VERIFIED", "INVESTIGATION", "RESOLVED", "ACTION_TAKEN"] }
      },
      group: ["status"],
      raw: true
    });

    const recentActions = await AuthorityAction.findAll({
      limit: 10,
      order: [["created_at", "DESC"]],
      include: [
        {
          model: Complaint,
          attributes: ["complaint_id", "product_name", "category", "priority"]
        }
      ]
    });

    res.json({
      success: true,
      statistics: {
        verified: totalVerified,
        under_investigation: underInvestigation,
        action_required: actionRequired,
        resolved: resolved,
        total_actions: totalActions
      },
      actionBreakdown: actionTypes,
      statusBreakdown: statusBreakdown,
      recentActions
    });
  } catch (error) {
    console.error("GET AUTHORITY REPORTS ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch authority reports.",
      error: error.message
    });
  }
};

// ==========================================
// EXPORT CONTROLLERS
// ==========================================

module.exports = {
  getVerifiedComplaints,
  getInvestigationComplaints,
  getAuthorityStatistics,
  updateInvestigation,
  recordAuthorityAction,
  getInvestigationHistory,
  getAuthorityCases,
  getAuthorityReports
};