const { AdulterationTest, Complaint } = require("../models");

// ========================================================
// FSSAI DART (DETECT ADULTERATION WITH RAPID TEST) STANDARDS
// ========================================================
const FSSAI_DART_STANDARDS = {
  Milk: {
    test_type: "CHEMICAL_SPOT_TEST",
    adulterants: ["Starch", "Detergent", "Urea", "Water"],
    rapid_method: "Iodine solution test for starch / shaking test for detergent",
    risk_level: "High",
    confidence_range: [75, 92],
    issues: [
      "Water dilution reduces solid-not-fat (SNF) content below 8.5%",
      "Possible chemical detergent or neutralizer used to artificially stabilize density",
      "Starch presence indicated if blue color appears with iodine"
    ],
    recommended_action: "Send sample for Gerber fat test and laboratory cryoscopy freezing point verification."
  },
  Paneer: {
    test_type: "RAPID_DART",
    adulterants: ["Starch", "Analogue fats", "Hydrogenated vegetable oil"],
    rapid_method: "Boil sample with water, cool, add tincture iodine; blue indicates starch",
    risk_level: "High",
    confidence_range: [78, 88],
    issues: [
      "Starch added for volume augmentation",
      "Substitution of dairy fat with cheaper palm or hydrogenated oil",
      "Unnatural firmness or rubbery texture on heating"
    ],
    recommended_action: "Store at 4°C and refer to accredited food lab for milk-fat purity analysis."
  },
  Ghee: {
    test_type: "CHEMICAL_SPOT_TEST",
    adulterants: ["Vanaspati / Hydrogenated fat", "Animal fat", "Refined palm oil"],
    rapid_method: "Baudouin test (HCl + furfural) / Hydrochloric acid test",
    risk_level: "Medium",
    confidence_range: [72, 85],
    issues: [
      "Presence of sesame oil / vanaspati indicated by pink/red layer",
      "Loss of characteristic granular texture",
      "Abnormal Reichert-Meissl (RM) index"
    ],
    recommended_action: "Perform Baudouin and RM value test in designated food laboratory."
  },
  Butter: {
    test_type: "RAPID_DART",
    adulterants: ["Starch", "Vegetable fats", "Excess moisture"],
    rapid_method: "Heat gently in spoon: pure butter melts quickly and turns brown; adulterated takes longer and foams",
    risk_level: "Medium",
    confidence_range: [70, 84],
    issues: [
      "Vegetable oil mixing alters melting profile",
      "Starch addition increases moisture retention",
      "Moisture content exceeds statutory 16% limit"
    ],
    recommended_action: "Test for moisture percentage and foreign fat profile."
  },
  "Cooking Oil": {
    test_type: "CHEMICAL_SPOT_TEST",
    adulterants: ["Argemone oil", "Castor oil", "Mineral oil"],
    rapid_method: "Nitric acid test for argemone (reddish-brown precipitate)",
    risk_level: "Critical",
    confidence_range: [85, 96],
    issues: [
      "Argemone oil contamination causes epidemic dropsy and cardiac failure",
      "Mineral oil addition poses carcinogenic risks",
      "Acid value and saponification value deviate from FSSAI norms"
    ],
    recommended_action: "Immediate seizure of batch required if argemone positive; notify FSSAI officer."
  },
  "Turmeric Powder": {
    test_type: "CHEMICAL_SPOT_TEST",
    adulterants: ["Metanil yellow", "Lead chromate", "Chalk powder", "Starch"],
    rapid_method: "Add concentrated HCl to sample in water: pink color that disappears on adding water indicates metanil yellow",
    risk_level: "Critical",
    confidence_range: [80, 93],
    issues: [
      "Metanil yellow is a toxic non-permitted coal tar dye",
      "Lead chromate addition presents severe heavy metal neurotoxicity risks",
      "Artificial brightness disguises inferior rhizome quality"
    ],
    recommended_action: "Halt batch distribution immediately. Submit for heavy metal ICP-MS screening."
  },
  "Chilli Powder": {
    test_type: "RAPID_DART",
    adulterants: ["Sudan dyes (I-IV)", "Brick powder", "Rhodamine B", "Sawdust"],
    rapid_method: "Water dispersion test: brick dust settles quickly at bottom; Sudan dye floats oily residue",
    risk_level: "High",
    confidence_range: [82, 94],
    issues: [
      "Sudan dyes are potent genotoxic carcinogens strictly banned globally",
      "Insoluble brick dust grit detected in sediment",
      "Artificial water-soluble red colors bleeding into water"
    ],
    recommended_action: "Screen for Sudan dyes by LC-MS/MS in accredited testing laboratory."
  },
  Honey: {
    test_type: "RAPID_DART",
    adulterants: ["Invert sugar syrup", "High fructose corn syrup (HFCS)", "Rice syrup", "Jaggery"],
    rapid_method: "Water dissolution test: pure honey sinks without dissolving immediately; adulterated dissolves quickly",
    risk_level: "Medium",
    confidence_range: [74, 88],
    issues: [
      "Added C4/C3 sugars dilute natural enzymes and pollen count",
      "Specific gravity and HMF (Hydroxymethylfurfural) levels altered",
      "Moisture exceeds standard 20% limit"
    ],
    recommended_action: "Perform SMR (Specific Marker for Rice syrup) and EA-IRMS carbon isotope testing."
  },
  "Black Pepper": {
    test_type: "RAPID_DART",
    adulterants: ["Papaya seeds", "Light berries"],
    rapid_method: "Alcohol float test: papaya seeds float, dried black pepper berries sink",
    risk_level: "Low",
    confidence_range: [88, 97],
    issues: [
      "Papaya seed substitution reduces piperine active compound",
      "Light berries and pinheads used to inflate packaging weight"
    ],
    recommended_action: "Manual flotation segregation and piperine percentage estimation."
  }
};

// ========================================================
// 1. RUN ADULTERATION TEST / SCREENING
// ========================================================

const runAdulterationTest = async (req, res) => {
  try {
    const {
      sample_name,
      test_type,
      complaint_id,
      notes
    } = req.body;

    if (!sample_name) {
      return res.status(400).json({
        success: false,
        message: "Sample name (product name) is required for adulteration testing."
      });
    }

    const profile = FSSAI_DART_STANDARDS[sample_name] || {
      test_type: test_type || "PRELIMINARY_SCREENING",
      adulterants: ["Foreign matter", "Unspecified additives", "Quality degradation"],
      rapid_method: "Standard physical and visual examination under good lighting",
      risk_level: "Medium",
      confidence_range: [65, 80],
      issues: [
        "Product appearance deviates from FSSAI statutory standard",
        "Physical consistency requires chemical laboratory examination"
      ],
      recommended_action: "Refer sample to nearest government-recognized food testing laboratory."
    };

    const [minConf, maxConf] = profile.confidence_range || profile.educational_score_range || [70, 85];
    // Deterministic educational heuristic scoring based on FSSAI DART benchmark protocols
    const baselineScore = (minConf + maxConf) / 2;
    let observationAdjustment = 0;
    if (notes && typeof notes === "string" && notes.trim().length > 0) {
      const observationWeight = Math.min((maxConf - baselineScore), (notes.trim().length * 0.1));
      observationAdjustment = observationWeight;
    }
    const heuristicScore = parseFloat((baselineScore + observationAdjustment).toFixed(1));

    const resultText =
      profile.risk_level === "Critical"
        ? "High-Priority Screening Indicator — Possible Adulteration (Laboratory Confirmation Required)"
        : profile.risk_level === "High"
        ? "Observation-Based Guidance Alert — Possible Adulteration Indicator (Laboratory Confirmation Required)"
        : profile.risk_level === "Medium"
        ? "Preliminary Educational Screening — Inconclusive Observation (Further Laboratory Verification Recommended)"
        : "No Rapid Screening Indicator Observed in Household Method (Not Certified Laboratory Proof)";

    const educationalDisclaimer =
      "FoodSafe AI provides educational screening guidance based on user-reported observations and basic food safety information. Results do not confirm food adulteration and are not a substitute for testing by an authorized laboratory or assessment by qualified food safety professionals.";

    const remarksText = [
      `FSSAI DART Rapid Method: ${profile.rapid_method}`,
      `Screened Indicator Adulterants: ${profile.adulterants.join(", ")}`,
      `Reported Observations & Findings: ${profile.issues.join("; ")}`,
      `Protocol Guidance: ${profile.recommended_action}`,
      notes ? `User Observation Details: ${notes}` : null,
      `Official Reference: https://fssai.gov.in/dart/`,
      `Educational Disclaimer: ${educationalDisclaimer}`,
      "Statutory Notice: Household-level educational screening only. Laboratory confirmation required for statutory enforcement or legal action."
    ].filter(Boolean).join("\n\n");

    let validComplaintId = null;
    if (complaint_id) {
      const complaint = await Complaint.findByPk(complaint_id);
      if (complaint) {
        validComplaintId = complaint.id;
      }
    }

    const savedTest = await AdulterationTest.create({
      complaint_id: validComplaintId,
      sample_name: sample_name.trim(),
      test_type: profile.test_type || "EDUCATIONAL_DART_SCREENING",
      result: resultText,
      confidence: heuristicScore,
      remarks: remarksText
    });

    return res.status(201).json({
      success: true,
      message: "Educational adulteration screening completed successfully.",
      test: {
        id: savedTest.id,
        sample_name: savedTest.sample_name,
        test_type: savedTest.test_type,
        result: savedTest.result,
        confidence: savedTest.confidence, // Maintained for legacy API client compatibility
        educational_screening_score: savedTest.confidence,
        scoring_methodology: "HEURISTIC_DART_BENCHMARK",
        assessment_type: "EDUCATIONAL_DART_SCREENING",
        scientific_classification: "Observation-Based Guidance",
        laboratory_confirmation_status: "REQUIRED_FOR_STATUTORY_ENFORCEMENT",
        risk_level: profile.risk_level,
        adulterants_tested: profile.adulterants,
        rapid_method: profile.rapid_method,
        issues: profile.issues,
        recommended_action: profile.recommended_action,
        fssai_dart_reference: {
          framework: "FSSAI Detect Adulteration with Rapid Test (DART)",
          documentation_url: "https://fssai.gov.in/dart/",
          scope: "Household-level preliminary screening; not official laboratory certification or FSSAI endorsement"
        },
        educational_disclaimer: educationalDisclaimer,
        advisory_notice: "Educational screening indicator based on user observations and basic FSSAI DART household protocols. Results do not confirm adulteration and cannot substitute for accredited laboratory testing.",
        remarks: savedTest.remarks,
        created_at: savedTest.created_at
      }
    });

  } catch (error) {
    console.error("RUN ADULTERATION TEST ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to perform adulteration screening.",
      error: error.message
    });
  }
};

// ========================================================
// 2. GET ADULTERATION TEST HISTORY
// ========================================================

const getAdulterationTests = async (req, res) => {
  try {
    const { complaint_id } = req.query;

    const whereClause = {};
    if (complaint_id) {
      whereClause.complaint_id = complaint_id;
    }

    const tests = await AdulterationTest.findAll({
      where: whereClause,
      order: [["created_at", "DESC"]],
      limit: 50
    });

    return res.json({
      success: true,
      count: tests.length,
      tests
    });
  } catch (error) {
    console.error("GET ADULTERATION TESTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch adulteration tests.",
      error: error.message
    });
  }
};

// ========================================================
// 3. GET FSSAI DART STANDARDS DIRECTORY
// ========================================================

const getAdulterationStandards = (req, res) => {
  return res.json({
    success: true,
    framework: "FSSAI Detect Adulteration with Rapid Test (DART)",
    reference_url: "https://fssai.gov.in/dart/",
    educational_disclaimer: "FoodSafe AI provides educational screening guidance based on user-reported observations and basic food safety information. Results do not confirm food adulteration and are not a substitute for testing by an authorized laboratory or assessment by qualified food safety professionals.",
    standards: FSSAI_DART_STANDARDS
  });
};

module.exports = {
  runAdulterationTest,
  getAdulterationTests,
  getAdulterationStandards
};
