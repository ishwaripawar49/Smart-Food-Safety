const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const calculateRisk = require("../utils/riskCalculator");
const { Complaint, ComplaintImage, User, Notification, Shop } = require("../models");
const { createComplaintNotification } = require("../utils/notificationHelper");
const { classifyComplaint } = require("../services/aiClassifierService");
const { checkDuplicateComplaint } = require("../services/duplicateDetectionService");
const {
  createComplaintWithRetry,
  generateComplaintId,
  ComplaintIdExhaustionError,
} = require("../services/complaintCreationService");

// ==========================================
// VALID SELLER CLASSIFICATIONS
// ==========================================
const VALID_SELLER_TYPES = [
  "Roadside Food Stall",
  "Food Cart",
  "Small Shop",
  "Restaurant",
  "Temporary Market Stall",
  "Other / Unknown"
];

// ==========================================
// CREATE COMPLAINT
// ==========================================

const createComplaint = async (req, res) => {
  try {
    const {
      shop_id,
      seller_listing_type,
      seller_type,
      reported_shop_name,
      reported_landmark,
      reported_address,
      reported_registration_number,
      category,
      product_name,
      description,
      incident_date,
      location,
      latitude,
      longitude,
      location_accuracy
    } = req.body;

    // ==========================================
    // VALIDATION: BASIC REQUIRED FIELDS
    // ==========================================

    if (!category || !description) {
      return res.status(400).json({
        success: false,
        message: "Category and description are required."
      });
    }

    // Parse coordinates if provided
    let parsedLat = null;
    let parsedLng = null;
    let parsedAccuracy = null;

    const hasLat = latitude !== undefined && latitude !== null && String(latitude).trim() !== "";
    const hasLng = longitude !== undefined && longitude !== null && String(longitude).trim() !== "";

    if (hasLat || hasLng) {
      if (!hasLat || !hasLng) {
        return res.status(400).json({
          success: false,
          message: "Both latitude and longitude must be provided together."
        });
      }

      const numLat = Number(latitude);
      const numLng = Number(longitude);

      if (!Number.isFinite(numLat) || isNaN(numLat) || numLat < -90 || numLat > 90) {
        return res.status(400).json({
          success: false,
          message: "Invalid latitude. Must be a finite number between -90 and 90."
        });
      }

      if (!Number.isFinite(numLng) || isNaN(numLng) || numLng < -180 || numLng > 180) {
        return res.status(400).json({
          success: false,
          message: "Invalid longitude. Must be a finite number between -180 and 180."
        });
      }

      parsedLat = numLat;
      parsedLng = numLng;

      if (location_accuracy !== undefined && location_accuracy !== null && String(location_accuracy).trim() !== "") {
        const numAcc = Number(location_accuracy);
        if (Number.isFinite(numAcc) && !isNaN(numAcc) && numAcc >= 0) {
          parsedAccuracy = numAcc;
        }
      }
    }

    // Determine seller listing type
    let listingType = "LISTED";
    if (seller_listing_type) {
      listingType = String(seller_listing_type).toUpperCase().trim();
    } else if (!shop_id && seller_type) {
      listingType = "UNLISTED";
    }

    let parsedShopId = null;
    let cleanSellerType = null;
    let cleanReportedShopName = null;
    let cleanReportedLandmark = null;
    let cleanReportedAddress = null;
    let cleanReportedRegNumber = null;
    let regVerificationStatus = "NOT_APPLICABLE";

    if (listingType === "UNLISTED") {
      // 1. Seller Type is required and must be valid
      if (!seller_type || !VALID_SELLER_TYPES.includes(String(seller_type).trim())) {
        return res.status(400).json({
          success: false,
          message: "Valid seller type is required for unlisted food sellers."
        });
      }
      cleanSellerType = String(seller_type).trim();

      // 2. Usable location description / landmark or coordinates is required
      const usableLocation =
        (reported_landmark || "").trim() ||
        (location || "").trim() ||
        (parsedLat !== null && parsedLng !== null ? `GPS: ${parsedLat.toFixed(5)}, ${parsedLng.toFixed(5)}` : "");
      if (!usableLocation) {
        return res.status(400).json({
          success: false,
          message: "Location description or landmark is required for unlisted food sellers."
        });
      }

      parsedShopId = null; // Strictly NULL for unlisted sellers
      cleanReportedShopName = reported_shop_name && String(reported_shop_name).trim() ? String(reported_shop_name).trim() : null;
      cleanReportedLandmark = reported_landmark && String(reported_landmark).trim() ? String(reported_landmark).trim() : (parsedLat !== null ? `Map Pin (${parsedLat.toFixed(5)}, ${parsedLng.toFixed(5)})` : null);
      cleanReportedAddress = reported_address && String(reported_address).trim() ? String(reported_address).trim() : null;
      cleanReportedRegNumber = reported_registration_number && String(reported_registration_number).trim() ? String(reported_registration_number).trim() : null;

      regVerificationStatus = cleanReportedRegNumber ? "PENDING_VERIFICATION" : "NOT_APPLICABLE";
    } else {
      // LISTED Food Establishment
      listingType = "LISTED";
      if (!shop_id || isNaN(parseInt(shop_id, 10))) {
        return res.status(400).json({
          success: false,
          message: "A valid registered shop ID is required for listed food businesses."
        });
      }

      parsedShopId = parseInt(shop_id, 10);
      const existingShop = await Shop.findByPk(parsedShopId);
      if (!existingShop) {
        return res.status(404).json({
          success: false,
          message: "Selected shop was not found in registry."
        });
      }
      regVerificationStatus = "VERIFIED_LISTED";
    }

    // ==========================================
    // AI CLASSIFICATION & RISK ANALYSIS
    // ==========================================

    const aiAnalysis = classifyComplaint(
      category,
      description,
      product_name || ""
    );

    console.log("AI Safety Classification:", aiAnalysis);

    const image = req.file;

    // ==========================================
    // DUPLICATE COMPLAINT DETECTION
    // ==========================================

    let dupCheck = { is_duplicate: false, similarity_score: 0, matched_complaint: null };
    try {
      dupCheck = await checkDuplicateComplaint({
        shop_id: parsedShopId,
        product_name,
        description,
        category,
        reported_shop_name: cleanReportedShopName,
        reported_landmark: cleanReportedLandmark
      });
    } catch (dupErr) {
      console.warn("Duplicate check warning:", dupErr.message);
    }

    let initialAdminRemark = null;
    if (dupCheck.is_duplicate && dupCheck.matched_complaint) {
      initialAdminRemark = `[AI DUPLICATE ALERT: Potential duplicate of #${dupCheck.matched_complaint.complaint_id} (${dupCheck.similarity_score}% similarity). ${aiAnalysis.ai_summary}]`;
    } else {
      initialAdminRemark = `[AI SCREENING: ${aiAnalysis.ai_summary} Recommendation: ${aiAnalysis.recommended_action}]`;
    }

    // ==========================================
    // CREATE COMPLAINT (WITH COLLISION RETRY)
    // ==========================================

    let createdResult;
    try {
      createdResult = await createComplaintWithRetry({
        user_id: req.user.id,
        shop_id: parsedShopId,
        seller_listing_type: listingType,
        seller_type: cleanSellerType,
        reported_shop_name: cleanReportedShopName,
        reported_landmark: cleanReportedLandmark,
        reported_address: cleanReportedAddress,
        reported_registration_number: cleanReportedRegNumber,
        registration_verification_status: regVerificationStatus,
        category,
        product_name: product_name ? product_name.trim() : null,
        description,
        incident_date: incident_date || null,
        location: location && location.trim() ? location.trim() : cleanReportedLandmark,
        latitude: parsedLat,
        longitude: parsedLng,
        location_accuracy: parsedAccuracy,
        status: "SUBMITTED",
        priority: aiAnalysis.priority,
        risk_score: aiAnalysis.score,
        scoring_version: aiAnalysis.scoring_version || "v2.0-explainable",
        risk_factors: JSON.stringify(aiAnalysis.contributing_factors || []),
        admin_remark: initialAdminRemark
      });
    } catch (createErr) {
      if (createErr.name === "ComplaintIdExhaustionError" || createErr.isControlled) {
        return res.status(500).json({
          success: false,
          message: "System was unable to allocate a unique complaint tracking number. Please try submitting again."
        });
      }
      throw createErr;
    }

    const complaint = createdResult.complaint;

    // ==========================================
    // SAVE UPLOADED IMAGE
    // ==========================================

    if (image) {
      await ComplaintImage.create({
        complaint_id: complaint.id,
        image_url: `/uploads/${image.filename}`
      });
    }

    // ==========================================
    // NOTIFY CUSTOMER & ADMIN
    // ==========================================

    try {
      if (req.user && req.user.id) {
        await createComplaintNotification({
          userId: req.user.id,
          complaintId: complaint.id,
          complaintNumber: complaint.complaint_id,
          status: "SUBMITTED"
        });
      }

      const admins = await User.findAll({ where: { role: "ADMIN" } });
      const sellerLabel = complaint.seller_listing_type === "UNLISTED"
        ? (complaint.reported_shop_name || complaint.seller_type || "Unlisted Seller")
        : (complaint.product_name || "Food Establishment");

      for (const admin of admins) {
        await Notification.create({
          user_id: admin.id,
          complaint_id: complaint.id,
          recipient_role: "ADMIN",
          title: complaint.seller_listing_type === "UNLISTED"
            ? "New Unlisted Vendor Complaint"
            : "New Complaint Submitted",
          message: `New complaint ${complaint.complaint_id} (${sellerLabel}): ${complaint.product_name || complaint.category} (${complaint.priority} priority).`,
          notification_type: "STATUS_UPDATE",
          is_read: false
        });
      }
    } catch (notifErr) {
      console.error("Error creating complaint submission notifications:", notifErr);
    }

    // ==========================================
    // SUCCESS RESPONSE
    // ==========================================

    return res.status(201).json({
      success: true,

      message: image
        ? "Complaint and image submitted successfully!"
        : "Complaint submitted successfully!",

      complaint: {
        id: complaint.id,
        complaint_id: complaint.complaint_id,
        seller_listing_type: complaint.seller_listing_type,
        seller_type: complaint.seller_type,
        reported_shop_name: complaint.reported_shop_name,
        reported_landmark: complaint.reported_landmark,
        reported_address: complaint.reported_address,
        reported_registration_number: complaint.reported_registration_number,
        registration_verification_status: complaint.registration_verification_status,
        shop_id: complaint.shop_id,
        category: complaint.category,
        product_name: complaint.product_name,
        location: complaint.location,
        latitude: complaint.latitude,
        longitude: complaint.longitude,
        location_accuracy: complaint.location_accuracy,
        status: complaint.status,
        priority: complaint.priority,
        risk_score: aiAnalysis.score,
        risk_level: aiAnalysis.level,
        admin_remark: complaint.admin_remark,
        ai_classification: {
          recommended_action: aiAnalysis.recommended_action,
          confidence: aiAnalysis.confidence,
          detected_factors: aiAnalysis.detected_factors
        },
        duplicate_detected: dupCheck.is_duplicate,
        potential_duplicate: dupCheck.matched_complaint
      }
    });

  } catch (error) {
    console.error("Create complaint error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to submit complaint.",
      error: error.message
    });
  }
};

// ==========================================
// GET MY COMPLAINTS
// ==========================================
// GET /api/complaints/my
// ==========================================

const getMyComplaints = async (req, res) => {
  try {
    // User ID comes from JWT token
    const userId = req.user.id;

    console.log("Fetching complaints for user:", userId);

    const complaints = await Complaint.findAll({
      where: {
        user_id: userId
      },
      include: [
        { model: Shop, as: "shop", required: false }
      ],
      order: [["created_at", "DESC"]]
    });

    return res.json({
      success: true,
      count: complaints.length,
      complaints: complaints
    });

  } catch (error) {
    console.error("Get my complaints error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch your complaints.",
      error: error.message
    });
  }
};

// ==========================================
// GET CUSTOMER STATISTICS
// ==========================================
// GET /api/complaints/my/statistics
// ==========================================

const getCustomerStatistics = async (req, res) => {
  try {
    const userId = req.user.id;

    const total = await Complaint.count({
      where: {
        user_id: userId
      }
    });

    const submitted = await Complaint.count({
      where: {
        user_id: userId,
        status: "SUBMITTED"
      }
    });

    const underReview = await Complaint.count({
      where: {
        user_id: userId,
        status: "UNDER_REVIEW"
      }
    });

    const verified = await Complaint.count({
      where: {
        user_id: userId,
        status: "VERIFIED"
      }
    });

    const investigation = await Complaint.count({
      where: {
        user_id: userId,
        status: "INVESTIGATION"
      }
    });

    const resolved = await Complaint.count({
      where: {
        user_id: userId,
        status: "RESOLVED"
      }
    });

    const rejected = await Complaint.count({
      where: {
        user_id: userId,
        status: "REJECTED"
      }
    });

    return res.json({
      success: true,
      statistics: {
        total,
        submitted,
        underReview,
        verified,
        investigation,
        resolved,
        rejected
      }
    });

  } catch (error) {
    console.error(
      "Get customer statistics error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer statistics.",
      error: error.message
    });
  }
};

// ==========================================
// GET COMPLAINT BY DATABASE ID OR COMPLAINT ID
// ==========================================

const getComplaint = async (req, res) => {
  try {
    const { complaintId } = req.params;

    console.log(
      "Requested complaint:",
      complaintId
    );

    let complaint;

    // ==========================================
    // NUMBER → DATABASE ID
    // ==========================================

    if (!isNaN(complaintId) && !String(complaintId).startsWith("FSA-")) {
      complaint = await Complaint.findByPk(complaintId, {
        include: [{ model: Shop, as: "shop", required: false }]
      });
    }

    // ==========================================
    // TEXT → COMPLAINT ID
    // ==========================================

    else {
      complaint = await Complaint.findOne({
        where: {
          complaint_id: complaintId
        },
        include: [{ model: Shop, as: "shop", required: false }]
      });
    }

    // ==========================================
    // NOT FOUND
    // ==========================================

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found."
      });
    }

    // ==========================================
    // DATA OWNERSHIP CHECK
    // Customers can ONLY view complaints that belong to them.
    // Admins and Authorized Authorities retain access to all complaints.
    // ==========================================
    if (req.user && req.user.role === "CUSTOMER") {
      if (complaint.user_id && complaint.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You do not have permission to view this complaint."
        });
      }
    }

    // ==========================================
    // FIND IMAGES
    // ==========================================

    const images = await ComplaintImage.findAll({
      where: {
        complaint_id: complaint.id
      }
    });

    const complaintData =
      complaint.toJSON();

    complaintData.images = images.map((image) => {
      const img = image.toJSON();
      img.authenticated_url = `/api/complaints/${complaint.id}/images/${image.id}`;
      return img;
    });

    // ==========================================
    // CALCULATE RISK LEVEL
    // ==========================================

    if (
      complaintData.risk_score !== null &&
      complaintData.risk_score !== undefined
    ) {
      const score = Number(
        complaintData.risk_score
      );

      if (score >= 75) {
        complaintData.risk_level =
          "CRITICAL";
      } else if (score >= 50) {
        complaintData.risk_level =
          "HIGH";
      } else if (score >= 30) {
        complaintData.risk_level =
          "MEDIUM";
      } else {
        complaintData.risk_level =
          "LOW";
      }
    } else {
      complaintData.risk_level = "LOW";
    }

    // ==========================================
    // SUCCESS
    // ==========================================

    return res.json({
      success: true,
      complaint: complaintData,
      images: complaintData.images
    });

  } catch (error) {
    console.error(
      "Get complaint error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get complaint.",
      error: error.message
    });
  }
};

// ==========================================
// UPLOAD COMPLAINT IMAGES
// ==========================================

const uploadComplaintImages = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const complaint =
      await Complaint.findByPk(id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found."
      });
    }

    // ==========================================
    // DATA OWNERSHIP CHECK
    // Customers can only upload images for their own complaints.
    // ==========================================
    if (req.user && req.user.role === "CUSTOMER") {
      if (complaint.user_id && complaint.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You can only upload images for your own complaints."
        });
      }
    }

    if (
      !req.files ||
      req.files.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please upload at least one image."
      });
    }

    const images = [];

    for (const file of req.files) {
      const image =
        await ComplaintImage.create({
          complaint_id: complaint.id,
          image_url:
            `/uploads/${file.filename}`
        });

      images.push(image);
    }

    return res.status(201).json({
      success: true,
      message:
        "Images uploaded successfully.",
      images
    });

  } catch (error) {
    console.error(
      "Upload images error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Image upload failed.",
      error: error.message
    });
  }
};

// ==========================================
// CHECK DUPLICATE COMPLAINTS
// ==========================================

const checkComplaintDuplicate = async (req, res) => {
  try {
    const {
      shop_id,
      product_name,
      description,
      category,
      reported_shop_name,
      reported_landmark
    } = req.body;

    const parsedShopId =
      shop_id && !isNaN(parseInt(shop_id, 10))
        ? parseInt(shop_id, 10)
        : null;

    const result = await checkDuplicateComplaint({
      shop_id: parsedShopId,
      product_name,
      description,
      category,
      reported_shop_name,
      reported_landmark
    });

    return res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error("CHECK COMPLAINT DUPLICATE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check complaint duplicates.",
      error: error.message
    });
  }
};

// ==========================================
// GET PROTECTED COMPLAINT IMAGE / EVIDENCE
// ==========================================
const getComplaintImage = async (req, res) => {
  try {
    const { complaintId, imageId } = req.params;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required."
      });
    }

    let complaint;
    if (!isNaN(complaintId) && !String(complaintId).startsWith("FSA-")) {
      complaint = await Complaint.findByPk(complaintId);
    } else {
      complaint = await Complaint.findOne({ where: { complaint_id: complaintId } });
    }

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found."
      });
    }

    // Role & ownership check
    if (req.user.role === "CUSTOMER") {
      if (complaint.user_id && complaint.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You do not have permission to view evidence for this complaint."
        });
      }
    } else if (req.user.role !== "ADMIN" && req.user.role !== "AUTHORIZED_AUTHORITY") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Unauthorized role."
      });
    }

    const imageRecord = await ComplaintImage.findOne({
      where: {
        id: imageId,
        complaint_id: complaint.id
      }
    });

    if (!imageRecord) {
      return res.status(404).json({
        success: false,
        message: "Complaint image record not found."
      });
    }

    const rawFilename = path.basename(imageRecord.image_url);
    const uploadsDir = path.resolve(__dirname, "../uploads");
    const safeFilePath = path.resolve(uploadsDir, rawFilename);

    // Path traversal & existence check
    if (!safeFilePath.startsWith(uploadsDir) || !fs.existsSync(safeFilePath)) {
      return res.status(404).json({
        success: false,
        message: "Image evidence file not found on disk."
      });
    }

    const ext = path.extname(safeFilePath).toLowerCase();
    const mimeMap = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp"
    };
    const contentType = mimeMap[ext] || "application/octet-stream";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
    res.setHeader("X-Content-Type-Options", "nosniff");

    const stream = fs.createReadStream(safeFilePath);
    stream.on("error", (err) => {
      console.error("Image stream error:", err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: "Error reading image file." });
      }
    });
    return stream.pipe(res);
  } catch (error) {
    console.error("GET COMPLAINT IMAGE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve complaint evidence.",
      error: error.message
    });
  }
};

// ==========================================
// EXPORT ALL FUNCTIONS
// ==========================================

module.exports = {
  createComplaint,
  getMyComplaints,
  getCustomerStatistics,
  getComplaint,
  uploadComplaintImages,
  checkComplaintDuplicate,
  getComplaintImage
};