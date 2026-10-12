const { Complaint, Shop, ComplaintSimilarityReview } = require("../models");
const { Op } = require("sequelize");

/**
 * Common Indian Street Food and Grocery Multilingual Product Synonyms
 */
const MULTILINGUAL_PRODUCT_MAP = {
  vadapav: ["vadapav", "vada pav", "wada pav", "वडापाव", "वडा पाव"],
  milk: ["milk", "doodh", "dudh", "दूध", "दुध"],
  paneer: ["paneer", "panir", "पनीर"],
  samosa: ["samosa", "समोसा"],
  bhel: ["bhel", "bhelpuri", "bhel puri", "भेल", "भेळ", "भेळपुरी"],
  panipuri: ["panipuri", "pani puri", "golgappa", "golgappe", "पाणीपुरी", "पानीपुरी", "गोलगप्पे"],
  tea: ["tea", "chai", "chaha", "चहा", "चाय"],
  biryani: ["biryani", "biryany", "बिर्याणी", "बिरयानी"],
  sweets: ["sweet", "sweets", "mithai", "मिठाई", "पेढा"],
  oil: ["oil", "edible oil", "cooking oil", "तेल", "खाद्यतेल"],
  juice: ["juice", "रस", "ज्यूस"],
};

/**
 * Stop words for stall and shop name normalization
 */
const SHOP_STOP_WORDS = new Set([
  "centre",
  "center",
  "stall",
  "cart",
  "thela",
  "thele",
  "hotel",
  "dhaba",
  "shop",
  "corner",
  "fast",
  "food",
  "bhandar",
  "canteen",
  "depot",
  "point",
  "house",
  "गाडी",
  "दुकान",
  "हॉटेल",
  "सेंटर",
]);

/**
 * Normalize seller name by removing noise words, punctuation, and extra spaces
 */
function normalizeSellerName(name = "") {
  if (!name || typeof name !== "string") return "";
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((w) => w.replace(/ji$/i, ""))
    .filter((w) => w.length > 1 && !SHOP_STOP_WORDS.has(w))
    .join(" ")
    .trim();
}

/**
 * Normalize product names using multilingual synonym dictionaries
 */
function normalizeProductName(prod = "") {
  if (!prod || typeof prod !== "string") return "";
  const cleaned = prod.toLowerCase().trim();
  for (const [canonical, variants] of Object.entries(MULTILINGUAL_PRODUCT_MAP)) {
    if (variants.some((v) => cleaned.includes(v))) {
      return canonical;
    }
  }
  return cleaned.replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

/**
 * Tokenize string for set-based Jaccard similarity
 */
function tokenizeText(str = "") {
  return new Set(
    str
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

/**
 * Compute Jaccard word set similarity between two text strings
 */
function computeTextSimilarity(str1 = "", str2 = "") {
  const set1 = tokenizeText(str1);
  const set2 = tokenizeText(str2);

  if (set1.size === 0 || set2.size === 0) return 0;

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * Calculate Great-Circle distance between two coordinates in meters (Haversine formula)
 */
function calculateHaversineDistanceMeters(lat1, lon1, lat2, lon2) {
  if (
    lat1 === null ||
    lon1 === null ||
    lat2 === null ||
    lon2 === null ||
    lat1 === undefined ||
    lon1 === undefined ||
    lat2 === undefined ||
    lon2 === undefined
  ) {
    return null;
  }

  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);

  if (!Number.isFinite(nLat1) || !Number.isFinite(nLon1) || !Number.isFinite(nLat2) || !Number.isFinite(nLon2)) {
    return null;
  }

  const R = 6371000; // Earth radius in meters
  const dLat = ((nLat2 - nLat1) * Math.PI) / 180;
  const dLon = ((nLon2 - nLon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((nLat1 * Math.PI) / 180) *
      Math.cos((nLat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Score two complaints for potential duplicate correlation with explainable reasons.
 *
 * CRITICAL RULE: Two unlisted complaints with shop_id = null MUST NOT automatically
 * be treated as the same seller. Nearby stalls are separate businesses.
 */
function evaluateComplaintPairSimilarity(complaintA, complaintB) {
  let score = 0;
  const reasons = [];

  // 1. Establishment / Seller Matching
  const isListedA = Boolean(complaintA.shop_id);
  const isListedB = Boolean(complaintB.shop_id);

  if (isListedA && isListedB) {
    if (Number(complaintA.shop_id) === Number(complaintB.shop_id)) {
      score += 40;
      reasons.push(`Same registered establishment ID (#${complaintA.shop_id})`);
    } else {
      // Different registered shops -> strong negative signal
      score -= 30;
    }
  } else if (!isListedA && !isListedB) {
    // Both unlisted roadside/street vendors.
    // RULE: DO NOT score simply because both shop_ids are null!
    const normNameA = normalizeSellerName(complaintA.reported_shop_name);
    const normNameB = normalizeSellerName(complaintB.reported_shop_name);
    const wordsA = new Set(normNameA.split(/\s+/));
    const wordsB = new Set(normNameB.split(/\s+/));
    const commonWords = [...wordsA].filter((w) => wordsB.has(w) && w.length >= 3);

    if (normNameA && normNameB && normNameA === normNameB) {
      score += 35;
      reasons.push(`Identical normalized stall name ('${complaintA.reported_shop_name}')`);
    } else if (normNameA && normNameB && (normNameA.includes(normNameB) || normNameB.includes(normNameA) || commonWords.length > 0)) {
      score += 25;
      reasons.push(`Partially matching stall name ('${normNameA}' ~ '${normNameB}')`);
    }

    // Landmark similarity
    if (complaintA.reported_landmark && complaintB.reported_landmark) {
      const landmarkSim = computeTextSimilarity(complaintA.reported_landmark, complaintB.reported_landmark);
      if (landmarkSim >= 0.5) {
        score += 20;
        reasons.push(`Similar reported landmark description (${Math.round(landmarkSim * 100)}% lexical overlap)`);
      }
    }
  } else {
    // One listed, one unlisted. Only match if unlisted stall name matches listed shop name
    const shopNameListed = complaintA.shop?.shop_name || complaintB.shop?.shop_name || "";
    const unlistedStallName = complaintA.reported_shop_name || complaintB.reported_shop_name || "";
    const normListed = normalizeSellerName(shopNameListed);
    const normUnlisted = normalizeSellerName(unlistedStallName);

    if (normListed && normUnlisted && normListed === normUnlisted) {
      score += 25;
      reasons.push(`Unlisted stall name matches registered shop '${shopNameListed}'`);
    }
  }

  // 2. Geographic Proximity (when coordinates are available)
  const distanceMeters = calculateHaversineDistanceMeters(
    complaintA.latitude,
    complaintA.longitude,
    complaintB.latitude,
    complaintB.longitude
  );

  if (distanceMeters !== null) {
    if (distanceMeters <= 50) {
      score += 25;
      reasons.push(`Close geographic proximity (~${distanceMeters} meters apart)`);
    } else if (distanceMeters <= 200) {
      score += 15;
      reasons.push(`Same immediate vicinity (~${distanceMeters} meters apart)`);
    } else if (distanceMeters <= 500) {
      score += 5;
      reasons.push(`Within walking radius (~${distanceMeters} meters apart)`);
    } else if (distanceMeters > 3000) {
      // Over 3km apart -> decrease duplicate score
      score -= 20;
    }
  }

  // 3. Product / Commodity Matching
  const normProdA = normalizeProductName(complaintA.product_name);
  const normProdB = normalizeProductName(complaintB.product_name);

  if (normProdA && normProdB) {
    if (normProdA === normProdB) {
      score += 30;
      reasons.push(`Same food product or commodity ('${complaintA.product_name || normProdA}')`);
    } else if (normProdA.includes(normProdB) || normProdB.includes(normProdA)) {
      score += 15;
      reasons.push(`Related food product line ('${complaintA.product_name}' ~ '${complaintB.product_name}')`);
    }
  }

  // 4. Grievance Category
  if (complaintA.category && complaintB.category) {
    if (complaintA.category.toLowerCase().trim() === complaintB.category.toLowerCase().trim()) {
      score += 15;
      reasons.push(`Same food safety category ('${complaintA.category}')`);
    }
  }

  // 5. Description Text Similarity
  if (complaintA.description && complaintB.description) {
    const textSim = computeTextSimilarity(complaintA.description, complaintB.description);
    if (textSim >= 0.4) {
      const textPoints = Math.round(textSim * 30);
      score += textPoints;
      reasons.push(`Narrative textual similarity (${Math.round(textSim * 100)}% match)`);
    }
  }

  // 6. Time Proximity
  if (complaintA.created_at && complaintB.created_at) {
    const timeA = new Date(complaintA.created_at).getTime();
    const timeB = new Date(complaintB.created_at).getTime();
    const diffDays = Math.abs(timeA - timeB) / (1000 * 60 * 60 * 24);

    if (diffDays <= 3) {
      score += 15;
      reasons.push(`Filed within ${Math.ceil(diffDays)} days of each other`);
    } else if (diffDays <= 14) {
      score += 10;
      reasons.push(`Filed within 2 weeks of each other (${Math.ceil(diffDays)} days)`);
    } else if (diffDays <= 30) {
      score += 5;
      reasons.push(`Filed within the same month (${Math.ceil(diffDays)} days)`);
    }
  }

  const boundedScore = Math.min(100, Math.max(0, score));

  return {
    score: boundedScore,
    is_match: boundedScore >= 50,
    reasons,
  };
}

/**
 * Real-time pre-submission or intake check for duplicates
 */
async function checkDuplicateComplaint({
  shop_id,
  product_name,
  description,
  category,
  reported_shop_name,
  reported_landmark,
  latitude = null,
  longitude = null,
}) {
  if (!product_name && !shop_id && !reported_shop_name && !latitude) {
    return { is_duplicate: false, similarity_score: 0, matched_complaint: null, matching_reasons: [] };
  }

  const whereConditions = [];

  if (shop_id) {
    whereConditions.push({ shop_id });
  }

  if (reported_shop_name && reported_shop_name.trim().length > 2) {
    whereConditions.push({
      reported_shop_name: {
        [Op.like]: `%${reported_shop_name.trim()}%`,
      },
    });
  }

  if (product_name && product_name.trim()) {
    whereConditions.push({
      product_name: {
        [Op.like]: `%${product_name.trim()}%`,
      },
    });
  }

  if (whereConditions.length === 0) {
    return { is_duplicate: false, similarity_score: 0, matched_complaint: null, matching_reasons: [] };
  }

  const candidateComplaints = await Complaint.findAll({
    where: {
      [Op.or]: whereConditions,
      status: {
        [Op.in]: ["SUBMITTED", "UNDER_REVIEW", "VERIFIED", "INVESTIGATION"],
      },
    },
    limit: 30,
    order: [["created_at", "DESC"]],
  });

  const incomingMock = {
    shop_id,
    product_name,
    description,
    category,
    reported_shop_name,
    reported_landmark,
    latitude,
    longitude,
    created_at: new Date(),
  };

  let bestMatch = null;
  let highestScore = 0;
  let bestReasons = [];

  for (const candidate of candidateComplaints) {
    const evalResult = evaluateComplaintPairSimilarity(incomingMock, candidate);
    if (evalResult.score > highestScore) {
      highestScore = evalResult.score;
      bestMatch = candidate;
      bestReasons = evalResult.reasons;
    }
  }

  const isDuplicate = highestScore >= 50;

  return {
    is_duplicate: isDuplicate,
    similarity_score: highestScore,
    matching_reasons: bestReasons,
    matched_complaint:
      isDuplicate && bestMatch
        ? {
            id: bestMatch.id,
            complaint_id: bestMatch.complaint_id,
            product_name: bestMatch.product_name,
            category: bestMatch.category,
            status: bestMatch.status,
            created_at: bestMatch.created_at,
          }
        : null,
  };
}

/**
 * Scan database for suspected duplicate pairs to populate Admin Review Queue
 */
async function scanAndQueuePotentialDuplicates(options = { limit: 50 }) {
  const activeComplaints = await Complaint.findAll({
    where: {
      status: {
        [Op.notIn]: ["REJECTED", "ARCHIVED"],
      },
    },
    include: [{ model: Shop, as: "shop", required: false }],
    limit: 100,
    order: [["created_at", "DESC"]],
  });

  const flaggedMatches = [];

  for (let i = 0; i < activeComplaints.length; i++) {
    for (let j = i + 1; j < activeComplaints.length; j++) {
      const cmpA = activeComplaints[i];
      const cmpB = activeComplaints[j];

      // Quick filter: must share either shop_id, commodity, or stall name or distance < 500m
      const hasCommonSignal =
        (cmpA.shop_id && cmpB.shop_id && cmpA.shop_id === cmpB.shop_id) ||
        (cmpA.product_name && cmpB.product_name && normalizeProductName(cmpA.product_name) === normalizeProductName(cmpB.product_name)) ||
        (cmpA.reported_shop_name && cmpB.reported_shop_name && normalizeSellerName(cmpA.reported_shop_name) === normalizeSellerName(cmpB.reported_shop_name));

      if (!hasCommonSignal) continue;

      const evalRes = evaluateComplaintPairSimilarity(cmpA, cmpB);

      if (evalRes.score >= 50) {
        // Upsert into ComplaintSimilarityReview table
        const [reviewRecord, created] = await ComplaintSimilarityReview.findOrCreate({
          where: {
            source_complaint_id: cmpA.id,
            target_complaint_id: cmpB.id,
          },
          defaults: {
            similarity_score: evalRes.score,
            matching_reasons: evalRes.reasons,
            review_status: "PENDING",
          },
        });

        if (!created && reviewRecord.review_status === "PENDING") {
          reviewRecord.similarity_score = evalRes.score;
          reviewRecord.matching_reasons = evalRes.reasons;
          await reviewRecord.save();
        }

        flaggedMatches.push({
          review_id: reviewRecord.id,
          source_complaint: cmpA,
          target_complaint: cmpB,
          similarity_score: evalRes.score,
          matching_reasons: evalRes.reasons,
          review_status: reviewRecord.review_status,
        });

        if (flaggedMatches.length >= options.limit) break;
      }
    }
    if (flaggedMatches.length >= options.limit) break;
  }

  return flaggedMatches;
}

/**
 * Record human review decision for suspected duplicate pair
 */
async function recordDuplicateReview({
  reviewId,
  sourceComplaintId,
  targetComplaintId,
  reviewStatus,
  reviewerId,
  reviewNotes = "",
}) {
  const allowedStatuses = ["RELATED", "UNRELATED", "DISMISSED", "PENDING"];
  if (!allowedStatuses.includes(reviewStatus)) {
    throw new Error(`Invalid duplicate review status. Must be one of: ${allowedStatuses.join(", ")}`);
  }

  let reviewRecord;
  if (reviewId) {
    reviewRecord = await ComplaintSimilarityReview.findByPk(reviewId);
  } else if (sourceComplaintId && targetComplaintId) {
    reviewRecord = await ComplaintSimilarityReview.findOne({
      where: {
        source_complaint_id: sourceComplaintId,
        target_complaint_id: targetComplaintId,
      },
    });
  }

  if (!reviewRecord && sourceComplaintId && targetComplaintId) {
    reviewRecord = await ComplaintSimilarityReview.create({
      source_complaint_id: sourceComplaintId,
      target_complaint_id: targetComplaintId,
      similarity_score: 50,
      matching_reasons: ["Manually flagged for review"],
      review_status: reviewStatus,
      reviewed_by: reviewerId,
      review_notes: reviewNotes,
      reviewed_at: new Date(),
    });
    return reviewRecord;
  }

  if (!reviewRecord) {
    throw new Error("Duplicate review record not found.");
  }

  reviewRecord.review_status = reviewStatus;
  reviewRecord.reviewed_by = reviewerId;
  reviewRecord.review_notes = reviewNotes;
  reviewRecord.reviewed_at = new Date();
  await reviewRecord.save();

  return reviewRecord;
}

module.exports = {
  checkDuplicateComplaint,
  evaluateComplaintPairSimilarity,
  scanAndQueuePotentialDuplicates,
  recordDuplicateReview,
  computeTextSimilarity,
  calculateHaversineDistanceMeters,
  normalizeSellerName,
  normalizeProductName,
};
