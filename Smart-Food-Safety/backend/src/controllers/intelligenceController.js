const { Complaint, Shop, ComplaintSimilarityReview, User } = require("../models");
const { Op } = require("sequelize");
const { getHotspotAnalytics } = require("../services/hotspotAnalyticsService");
const {
  scanAndQueuePotentialDuplicates,
  recordDuplicateReview,
  evaluateComplaintPairSimilarity,
} = require("../services/duplicateDetectionService");
const {
  classifyComplaint,
  SCORING_VERSION,
} = require("../services/aiClassifierService");

/**
 * Helper: Find complaint by primary key or public complaint_id string
 */
async function findComplaintByIdentifier(identifier) {
  if (!identifier) return null;
  const isNumeric = /^\d+$/.test(String(identifier));
  if (isNumeric) {
    const c = await Complaint.findByPk(identifier, {
      include: [{ model: Shop, as: "shop" }],
    });
    if (c) return c;
  }
  return await Complaint.findOne({
    where: { complaint_id: String(identifier) },
    include: [{ model: Shop, as: "shop" }],
  });
}

/**
 * 1. GET /api/intelligence/hotspots
 * Retrieves spatially aggregated complaint clusters with privacy protections
 */
async function getHotspots(req, res) {
  try {
    const defaultThreshold = parseInt(process.env.MIN_HOTSPOT_GROUP_SIZE, 10) || 5;
    const { days = "all", category = "", status = "", minThreshold } = req.query;

    const parsedThreshold = minThreshold !== undefined ? parseInt(minThreshold, 10) : defaultThreshold;
    const analytics = await getHotspotAnalytics({
      days,
      category,
      status,
      minThreshold: isNaN(parsedThreshold) || parsedThreshold < 1 ? defaultThreshold : parsedThreshold,
    });

    return res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error("Error generating hotspot analytics:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate food safety hotspot analytics.",
      error: error.message,
    });
  }
}

/**
 * 2. GET /api/intelligence/duplicates
 * Retrieves potential duplicate pairs for administrative and investigative review
 */
async function getDuplicateQueue(req, res) {
  try {
    const { status = "PENDING", limit = 50, rescan = false } = req.query;
    const maxLimit = Math.min(parseInt(limit, 10) || 50, 100);

    // If requested or if reviews table is empty, run candidate scanner
    const existingCount = await ComplaintSimilarityReview.count();
    if (rescan === "true" || rescan === true || existingCount === 0) {
      await scanAndQueuePotentialDuplicates({ limit: maxLimit });
    }

    const whereConditions = {};
    if (status && status.toUpperCase() !== "ALL") {
      whereConditions.review_status = status.toUpperCase();
    }

    const reviews = await ComplaintSimilarityReview.findAll({
      where: whereConditions,
      include: [
        {
          model: Complaint,
          as: "source_complaint",
          attributes: [
            "id",
            "complaint_id",
            "shop_id",
            "seller_listing_type",
            "seller_type",
            "reported_shop_name",
            "reported_landmark",
            "category",
            "product_name",
            "description",
            "latitude",
            "longitude",
            "status",
            "priority",
            "risk_score",
            "created_at",
          ],
          include: [{ model: Shop, as: "shop", attributes: ["id", "shop_name", "address", "license_number"] }],
        },
        {
          model: Complaint,
          as: "target_complaint",
          attributes: [
            "id",
            "complaint_id",
            "shop_id",
            "seller_listing_type",
            "seller_type",
            "reported_shop_name",
            "reported_landmark",
            "category",
            "product_name",
            "description",
            "latitude",
            "longitude",
            "status",
            "priority",
            "risk_score",
            "created_at",
          ],
          include: [{ model: Shop, as: "shop", attributes: ["id", "shop_name", "address", "license_number"] }],
        },
        {
          model: User,
          as: "reviewer",
          attributes: ["id", "name", "role"],
        },
      ],
      order: [["similarity_score", "DESC"], ["created_at", "DESC"]],
      limit: maxLimit,
    });

    return res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (error) {
    console.error("Error retrieving duplicate review queue:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve potential duplicate queue.",
      error: error.message,
    });
  }
}

/**
 * 3. POST /api/intelligence/duplicates/review
 * Records an authorized human review decision (RELATED, UNRELATED, DISMISSED)
 */
async function reviewDuplicate(req, res) {
  try {
    const { review_id, source_complaint_id, target_complaint_id, review_status, review_notes = "" } = req.body;

    const validStatuses = ["RELATED", "UNRELATED", "DISMISSED"];
    const normalizedStatus = String(review_status || "").toUpperCase().trim();

    if (!validStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review status. Must be one of: RELATED, UNRELATED, DISMISSED.",
      });
    }

    if (!review_id && (!source_complaint_id || !target_complaint_id)) {
      return res.status(400).json({
        success: false,
        message: "Either review_id or both source_complaint_id and target_complaint_id are required.",
      });
    }

    const reviewRecord = await recordDuplicateReview({
      reviewId: review_id,
      sourceComplaintId: source_complaint_id,
      targetComplaintId: target_complaint_id,
      reviewStatus: normalizedStatus,
      reviewerId: req.user ? req.user.id : null,
      reviewNotes: String(review_notes).trim(),
    });

    return res.status(200).json({
      success: true,
      message: `Duplicate review recorded as ${normalizedStatus}. Complaints remain independently preserved.`,
      data: reviewRecord,
    });
  } catch (error) {
    console.error("Error recording duplicate review:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to record duplicate review decision.",
      error: error.message,
    });
  }
}

/**
 * 4. GET /api/intelligence/risk/:id
 * Returns explainable risk factors, breakdown, and uncertainty statement for a complaint
 */
async function getExplainableRisk(req, res) {
  try {
    const { id } = req.params;
    const complaint = await findComplaintByIdentifier(id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found.",
      });
    }

    // Recompute or format explainable classification
    const classification = classifyComplaint(
      complaint.category,
      complaint.description,
      complaint.product_name || ""
    );

    // If already stored in DB, check if factors match
    let storedFactors = [];
    if (complaint.risk_factors) {
      try {
        storedFactors = JSON.parse(complaint.risk_factors);
      } catch (e) {
        storedFactors = classification.contributing_factors;
      }
    } else {
      storedFactors = classification.contributing_factors;
    }

    const effectivePriority = complaint.manual_priority_override || complaint.priority || classification.priority;

    let overrideInfo = null;
    if (complaint.manual_priority_override) {
      let reviewer = null;
      if (complaint.priority_overridden_by) {
        reviewer = await User.findByPk(complaint.priority_overridden_by, {
          attributes: ["id", "name", "role"],
        });
      }
      overrideInfo = {
        is_overridden: true,
        original_priority: classification.priority,
        effective_priority: complaint.manual_priority_override,
        reason: complaint.priority_override_reason,
        overridden_by: reviewer,
        overridden_at: complaint.priority_overridden_at,
      };
    }

    return res.status(200).json({
      success: true,
      data: {
        complaint_id: complaint.complaint_id,
        id: complaint.id,
        category: complaint.category,
        product_name: complaint.product_name,
        seller_listing_type: complaint.seller_listing_type,
        reported_shop_name: complaint.reported_shop_name,
        calculated_score: complaint.risk_score !== null ? complaint.risk_score : classification.score,
        priority: effectivePriority,
        calculated_priority: classification.priority,
        scoring_version: complaint.scoring_version || SCORING_VERSION,
        contributing_factors: storedFactors,
        explanation_summary: classification.explanation_summary,
        uncertainty_limitations: classification.uncertainty_limitations,
        recommended_action: classification.recommended_action,
        override_info: overrideInfo,
      },
    });
  } catch (error) {
    console.error("Error retrieving explainable risk:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve explainable risk analysis.",
      error: error.message,
    });
  }
}

/**
 * 5. POST /api/intelligence/risk/:id/override
 * Allows authorized reviewers to record a documented manual priority override
 */
async function overridePriority(req, res) {
  try {
    const { id } = req.params;
    const { manual_priority, override_reason } = req.body;

    const validPriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
    const normalizedPriority = String(manual_priority || "").toUpperCase().trim();

    if (!validPriorities.includes(normalizedPriority)) {
      return res.status(400).json({
        success: false,
        message: "Invalid priority. Must be one of: LOW, MEDIUM, HIGH, CRITICAL.",
      });
    }

    if (!override_reason || !String(override_reason).trim()) {
      return res.status(400).json({
        success: false,
        message: "Documented override reason is required for priority modifications.",
      });
    }

    const complaint = await findComplaintByIdentifier(id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found.",
      });
    }

    const previousPriority = complaint.priority;
    complaint.manual_priority_override = normalizedPriority;
    complaint.priority = normalizedPriority;
    complaint.priority_override_reason = String(override_reason).trim();
    complaint.priority_overridden_by = req.user ? req.user.id : null;
    complaint.priority_overridden_at = new Date();

    const reviewerTag = req.user ? `${req.user.name || "User"} (${req.user.role})` : "Authorized Officer";
    const auditRemark = `\n[PRIORITY OVERRIDE: Changed from ${previousPriority} to ${normalizedPriority} by ${reviewerTag}. Rationale: ${String(override_reason).trim()}]`;
    complaint.admin_remark = complaint.admin_remark ? `${complaint.admin_remark}${auditRemark}` : auditRemark.trim();

    await complaint.save();

    return res.status(200).json({
      success: true,
      message: `Priority successfully updated to ${normalizedPriority} with documented rationale.`,
      data: {
        complaint_id: complaint.complaint_id,
        effective_priority: complaint.priority,
        manual_priority_override: complaint.manual_priority_override,
        override_reason: complaint.priority_override_reason,
        overridden_at: complaint.priority_overridden_at,
      },
    });
  } catch (error) {
    console.error("Error overriding complaint priority:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to record manual priority override.",
      error: error.message,
    });
  }
}

/**
 * 6. GET /api/intelligence/overview
 * Executive summary KPI metrics for decision support
 */
async function getIntelligenceOverview(req, res) {
  try {
    const totalComplaints = await Complaint.count();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const complaintsLast7Days = await Complaint.count({
      where: { created_at: { [Op.gte]: sevenDaysAgo } },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const complaintsLast30Days = await Complaint.count({
      where: { created_at: { [Op.gte]: thirtyDaysAgo } },
    });

    const complaintsWithCoords = await Complaint.count({
      where: {
        latitude: { [Op.ne]: null },
        longitude: { [Op.ne]: null },
      },
    });

    const pendingDuplicates = await ComplaintSimilarityReview.count({
      where: { review_status: "PENDING" },
    });

    const highPriorityQueue = await Complaint.count({
      where: {
        priority: { [Op.in]: ["HIGH", "CRITICAL"] },
        status: { [Op.in]: ["SUBMITTED", "UNDER_REVIEW", "INVESTIGATION"] },
      },
    });

    const verifiedFindings = await Complaint.count({
      where: { status: { [Op.in]: ["VERIFIED", "RESOLVED"] } },
    });

    return res.status(200).json({
      success: true,
      data: {
        total_complaints: totalComplaints,
        complaints_last_7_days: complaintsLast7Days,
        complaints_last_30_days: complaintsLast30Days,
        complaints_with_coordinates: complaintsWithCoords,
        pending_duplicate_suggestions: pendingDuplicates,
        high_priority_queue: highPriorityQueue,
        verified_findings_count: verifiedFindings,
      },
    });
  } catch (error) {
    console.error("Error retrieving intelligence overview:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve intelligence overview.",
      error: error.message,
    });
  }
}

/**
 * 7. GET /api/intelligence/trends
 * Aggregated category, resolution, and temporal trends
 */
async function getTrends(req, res) {
  try {
    const categories = await Complaint.findAll({
      attributes: [
        "category",
        [Complaint.sequelize.fn("COUNT", Complaint.sequelize.col("id")), "count"],
      ],
      group: ["category"],
      raw: true,
    });

    const statuses = await Complaint.findAll({
      attributes: [
        "status",
        [Complaint.sequelize.fn("COUNT", Complaint.sequelize.col("id")), "count"],
      ],
      group: ["status"],
      raw: true,
    });

    const sellerListingTypes = await Complaint.findAll({
      attributes: [
        "seller_listing_type",
        [Complaint.sequelize.fn("COUNT", Complaint.sequelize.col("id")), "count"],
      ],
      group: ["seller_listing_type"],
      raw: true,
    });

    return res.status(200).json({
      success: true,
      data: {
        by_category: categories.map((c) => ({ category: c.category || "Uncategorized", count: parseInt(c.count, 10) })),
        by_status: statuses.map((s) => ({ status: s.status, count: parseInt(s.count, 10) })),
        by_seller_type: sellerListingTypes.map((l) => ({ listing_type: l.seller_listing_type || "LISTED", count: parseInt(l.count, 10) })),
      },
    });
  } catch (error) {
    console.error("Error retrieving intelligence trends:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve intelligence trends.",
      error: error.message,
    });
  }
}

module.exports = {
  getHotspots,
  getDuplicateQueue,
  reviewDuplicate,
  getExplainableRisk,
  overridePriority,
  getIntelligenceOverview,
  getTrends,
};
