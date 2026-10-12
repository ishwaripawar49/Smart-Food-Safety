/**
 * FoodSafe AI — Explainable Risk Prioritization Service (v2.0-explainable)
 *
 * Implements transparent, defensible, rule-based risk prioritization for food safety complaints.
 *
 * Design Principles:
 * 1. Explainability: Every score point is traced to an explicit contributing factor with human-readable description.
 * 2. Fairness: Zero penalty for unlisted vendors, zero penalty for vernacular languages (Marathi/Hindi),
 *    and zero penalty for missing optional photo evidence.
 * 3. Human-in-the-Loop: Automated scores are non-binding advisory triage indicators.
 *    Authorized personnel can record documented overrides.
 * 4. Scientific Humility: Discloses uncertainty and limitations; does not claim empirical laboratory certainty.
 */

const SCORING_VERSION = "v2.0-explainable";

// Commodity Risk Baseline (High-risk perishable commodities)
const HIGH_RISK_COMMODITIES = [
  { term: "milk", label: "Dairy / Milk (High Perishability)", weight: 10 },
  { term: "दूध", label: "डेअरी / दूध (High Perishability)", weight: 10 },
  { term: "paneer", label: "Dairy / Paneer", weight: 10 },
  { term: "पनीर", label: "पनीर (High Perishability)", weight: 10 },
  { term: "meat", label: "Poultry / Meat", weight: 15 },
  { term: "chicken", label: "Poultry", weight: 15 },
  { term: "mutton", label: "Red Meat", weight: 15 },
  { term: "fish", label: "Seafood / Fish", weight: 15 },
  { term: "prawn", label: "Seafood / Shellfish", weight: 15 },
  { term: "juice", label: "Raw Unpasteurized Beverage", weight: 8 },
  { term: "ice", label: "Edible Ice (Water Quality Hazard)", weight: 8 },
  { term: "chutney", label: "Raw Street Chutney (High Bacterial Hazard)", weight: 8 },
  { term: "चटणी", label: "कच्ची चटणी", weight: 8 },
  { term: "sweet", label: "Mawa / Milk Sweets", weight: 8 },
  { term: "मिठाई", label: "मिठाई / खवा", weight: 8 },
  { term: "oil", label: "Cooking Oil (Adulteration Risk)", weight: 8 },
  { term: "तेल", label: "खाद्यतेल", weight: 8 },
];

// Multilingual Hazard Keywords Dictionary
const HAZARD_KEYWORDS = {
  // Critical Acute Hazards (+25 to +40)
  critical: [
    { words: ["poison", "विष", "जहर"], name: "Suspected Toxicity / Poisoning", weight: 35, category: "ACUTE_TOXICITY" },
    { words: ["chemical", "रसायन", "केमिकल"], name: "Suspected Chemical Contaminant", weight: 30, category: "CHEMICAL_CONTAMINATION" },
    { words: ["hospital", "रुग्णालय", "दवाखाना", "अस्पताल"], name: "Medical Treatment Required", weight: 35, category: "SEVERE_ILLNESS" },
    { words: ["admitted", "दाखल", "भर्ती"], name: "Inpatient Hospitalization Reported", weight: 30, category: "SEVERE_ILLNESS" },
    { words: ["icu", "आयसीयू"], name: "Critical Care / ICU Admission", weight: 40, category: "LIFE_THREATENING" },
    { words: ["blood", "रक्त", "खून"], name: "Blood in Stool or Vomit", weight: 30, category: "INTERNAL_INJURY" },
    { words: ["glass", "काच", "कांच"], name: "Sharp Glass Fragment Present", weight: 30, category: "SHARP_PHYSICAL_OBJECT" },
    { words: ["blade", "ब्लेड"], name: "Sharp Blade / Cutting Metal", weight: 35, category: "SHARP_PHYSICAL_OBJECT" },
    { words: ["needle", "सुई", "सुई"], name: "Puncturing Needle / Metal Spike", weight: 30, category: "SHARP_PHYSICAL_OBJECT" },
    { words: ["rat", "उंदीर", "चूहा"], name: "Rodent Carcass or Excreta", weight: 35, category: "RODENT_VECTOR" },
    { words: ["lizard", "पाल", "छिपकली"], name: "Reptilian Contaminant / Toxic Vector", weight: 35, category: "REPTILE_VECTOR" },
    { words: ["insecticide", "कीटकनाशक", "कीटनाशक"], name: "Pesticide / Insecticide Ingestion", weight: 40, category: "TOXIC_RESIDUE" },
    { words: ["fainted", "बेहोश", "चक्कर"], name: "Loss of Consciousness / Syncope", weight: 25, category: "ACUTE_NEUROTOXICITY" },
  ],

  // High Biological & Symptomatic Hazards (+15 to +25)
  high: [
    { words: ["vomit", "vomiting", "उलटी", "वमन"], name: "Acute Emesis / Vomiting", weight: 20, category: "ACUTE_GASTROENTERITIS" },
    { words: ["diarrhea", "जुलाब", "दस्त"], name: "Acute Diarrhea / Dehydration Risk", weight: 20, category: "ACUTE_GASTROENTERITIS" },
    { words: ["nausea", "मळमळ", "जी मिचलाना"], name: "Nausea & Gastrointestinal Distress", weight: 15, category: "MILD_GASTROENTERITIS" },
    { words: ["fever", "ताप", "बुखार"], name: "Systemic Febrile Reaction", weight: 15, category: "SYSTEMIC_INFECTION" },
    { words: ["stomach ache", "cramp", "पोटदुखी", "पेट दर्द"], name: "Severe Abdominal Pain / Cramping", weight: 15, category: "ABDOMINAL_PAIN" },
    { words: ["maggot", "अळी", "अळ्या", "कीड़ा"], name: "Biological Decomposition / Maggots", weight: 25, category: "BIOLOGICAL_DECOMPOSITION" },
    { words: ["worm", "जंत", "कीडे"], name: "Parasitic Worm Contamination", weight: 20, category: "PARASITIC_CONTAMINATION" },
    { words: ["fungus", "mold", "mould", "बुरशी", "फफूंद"], name: "Mycotoxin / Severe Fungal Growth", weight: 20, category: "MYCOTOXIN_RISK" },
    { words: ["rotten", "spoiled", "सडलेले", "सड़ा हुआ"], name: "Putrefaction / Spoiled Edible", weight: 20, category: "PUTREFACTION" },
    { words: ["foul smell", "stink", "दुर्गंधी", "बदबू"], name: "Severe Sensory / Odor Deviation", weight: 10, category: "SENSORY_DEVIATION" },
    { words: ["metal", "तार", "लोहा"], name: "Metallic Wire / Foreign Object", weight: 15, category: "PHYSICAL_HAZARD" },
    { words: ["cockroach", "झुरळ", "तिलचट्टा"], name: "Insect Vector / Cockroach Infestation", weight: 20, category: "INSECT_VECTOR" },
  ],

  // Moderate Regulatory & Hygiene Concerns (+5 to +15)
  moderate: [
    { words: ["expired", "कालबाह्य", "एक्सपायरी"], name: "Expired Product Beyond Safe Shelf Life", weight: 15, category: "EXPIRY_VIOLATION" },
    { words: ["best before", "तारीख संपली"], name: "Post-Date Distribution", weight: 10, category: "EXPIRY_VIOLATION" },
    { words: ["dirty", "unclean", "घाण", "गंदा"], name: "General Premises / Equipment Hygiene Deficit", weight: 15, category: "HYGIENE_DEFICIT" },
    { words: ["flies", "माश्या", "मक्खियां"], name: "Uncovered Food Exposed to Flies", weight: 10, category: "HYGIENE_DEFICIT" },
    { words: ["color", "synthetic", "रंग", "सिंथेटिक"], name: "Suspected Non-Permitted Artificial Dye", weight: 12, category: "ARTIFICIAL_COLORING" },
    { words: ["detergent", "soap", "साबण", "डिटर्जेंट"], name: "Detergent / Synthetic Chemical Adulteration", weight: 25, category: "CHEMICAL_ADULTERATION" },
    { words: ["water", "diluted", "पाणी मिसळले", "पानी मिलावट"], name: "Water Dilution / Fluid Adulteration", weight: 10, category: "ADULTERATION_DILUTION" },
  ],
};

// Base Category Risk Weights
const CATEGORY_BASE_WEIGHTS = {
  "Food Poisoning": { score: 55, label: "Food Poisoning Category Baseline" },
  "Food Adulteration": { score: 45, label: "Food Adulteration Category Baseline" },
  "Foreign Object": { score: 40, label: "Foreign Object Hazard Baseline" },
  "Foreign Contaminant": { score: 40, label: "Foreign Contaminant Hazard Baseline" },
  "Expired Food": { score: 35, label: "Expired Food Category Baseline" },
  "Poor Hygiene": { score: 30, label: "Poor Hygiene Category Baseline" },
  "Bad Quality": { score: 25, label: "Substandard Quality Category Baseline" },
  "Mislabeling": { score: 20, label: "Regulatory Mislabeling Baseline" },
  "Packaging Issue": { score: 15, label: "Packaging Integrity Baseline" },
  "Other": { score: 20, label: "Unspecified Concern Category Baseline" },
};

/**
 * Classify food safety complaint with explainable risk decomposition.
 *
 * @param {string} category - Grievance category
 * @param {string} description - Citizen complaint narrative
 * @param {string} productName - Food commodity name
 * @param {object} options - Optional context (e.g., historical cluster signals)
 * @returns {object} Explainable risk analysis object
 */
function classifyComplaint(category = "", description = "", productName = "", options = {}) {
  const normText = `${description} ${productName}`.toLowerCase();
  const contributingFactors = [];

  // 1. Primary Category Baseline
  const catBaseline = CATEGORY_BASE_WEIGHTS[category] || {
    score: 20,
    label: `Standard Category Baseline (${category || "General"})`,
  };
  contributingFactors.push({
    factor_id: "CAT_BASELINE",
    name: catBaseline.label,
    points: catBaseline.score,
    category: "BASE_CLASSIFICATION",
    description: `Statutory baseline hazard weight allocated for grievance type '${category || "General"}'.`,
    evidence: `Category: ${category || "General"}`,
  });

  let runningScore = catBaseline.score;

  // 2. High-Risk Commodity Scan
  for (const item of HIGH_RISK_COMMODITIES) {
    if (normText.includes(item.term.toLowerCase())) {
      contributingFactors.push({
        factor_id: `COMMODITY_${item.term.toUpperCase()}`,
        name: `High-Risk Commodity: ${item.label}`,
        points: item.weight,
        category: "COMMODITY_VULNERABILITY",
        description: `Food product involves perishable or historically adulterated commodity '${item.term}'.`,
        evidence: `Matched: "${item.term}" in product or description`,
      });
      runningScore += item.weight;
      break; // Cap commodity contribution to one primary commodity match
    }
  }

  // 3. Multilingual Hazard Keywords Scan
  const scannedGroups = [
    { group: HAZARD_KEYWORDS.critical, tier: "CRITICAL_HAZARD" },
    { group: HAZARD_KEYWORDS.high, tier: "HIGH_HAZARD" },
    { group: HAZARD_KEYWORDS.moderate, tier: "MODERATE_HAZARD" },
  ];

  let keywordPointsAccumulated = 0;
  const maxKeywordPoints = 55; // Prevent runaway scores

  for (const { group, tier } of scannedGroups) {
    for (const item of group) {
      const matched = item.words.some((w) => normText.includes(w.toLowerCase()));
      if (matched) {
        const allowedPoints = Math.min(
          item.weight,
          Math.max(0, maxKeywordPoints - keywordPointsAccumulated)
        );

        if (allowedPoints > 0) {
          contributingFactors.push({
            factor_id: item.category,
            name: item.name,
            points: allowedPoints,
            category: tier,
            description: `Identified specific acute symptom or verified hazard indicator in report narrative.`,
            evidence: `Detected words: ${item.words.filter((w) => normText.includes(w.toLowerCase())).join(", ")}`,
          });
          keywordPointsAccumulated += allowedPoints;
          runningScore += allowedPoints;
        }
      }
    }
  }

  // 4. Repeated Incidents / Proximity Cluster Signal (if provided in options)
  if (options.recentClusterCount && options.recentClusterCount > 1) {
    const clusterPoints = Math.min(15, options.recentClusterCount * 5);
    contributingFactors.push({
      factor_id: "HOTSPOT_CONCENTRATION",
      name: `Geographic Concentration (${options.recentClusterCount} nearby reports)`,
      points: clusterPoints,
      category: "INCIDENT_CONCENTRATION",
      description: `Multiple contemporaneous grievances recorded within the same geographic vicinity within 30 days.`,
      evidence: `${options.recentClusterCount} related reports detected in vicinity`,
    });
    runningScore += clusterPoints;
  }

  // 5. Normalization & Cap (Score bounded to [10, 100])
  const finalScore = Math.min(100, Math.max(10, Math.round(runningScore)));

  // 6. Priority & Recommended Action Triage Mapping
  let riskLevel = "LOW";
  let priority = "LOW";
  let recommendedAction = "ROUTINE_MONITORING";

  if (finalScore >= 75) {
    riskLevel = "CRITICAL";
    priority = "CRITICAL";
    recommendedAction = "IMMEDIATE_ENFORCEMENT_VISIT";
  } else if (finalScore >= 50) {
    riskLevel = "HIGH";
    priority = "HIGH";
    recommendedAction = "PRIORITY_SAMPLE_TESTING";
  } else if (finalScore >= 30) {
    riskLevel = "MEDIUM";
    priority = "MEDIUM";
    recommendedAction = "STANDARD_INVESTIGATION";
  } else {
    riskLevel = "LOW";
    priority = "LOW";
    recommendedAction = "ROUTINE_MONITORING";
  }

  const confidence = Math.min(95, 70 + Math.min(25, contributingFactors.length * 5));

  // 7. Human-Readable Explanation Summary
  const topFactors = contributingFactors
    .filter((f) => f.factor_id !== "CAT_BASELINE")
    .map((f) => f.name)
    .slice(0, 3);

  const factorSummaryText =
    topFactors.length > 0
      ? ` Primary signals include: ${topFactors.join("; ")}.`
      : " No acute toxicity keywords detected; prioritized according to grievance category baseline.";

  const explanationSummary = `Assigned ${priority} priority (${finalScore}/100) under scoring version ${SCORING_VERSION}.${factorSummaryText}`;

  // 8. Scientific Uncertainty & Limitations Statement
  const uncertaintyLimitations =
    "Decision Support Advisory: Automated risk score is an indicative heuristic based solely on citizen allegation text and reported symptoms. " +
    "It does not constitute scientific laboratory verification, chemical confirmation, or official judicial proof. " +
    "Investigative priority may be modified by authorized officers based on field evidence.";

  return {
    score: finalScore,
    level: riskLevel,
    priority,
    confidence,
    recommended_action: recommendedAction,
    detected_factors: contributingFactors.map((f) => f.category),
    ai_summary: `${riskLevel} risk assessment (${finalScore}/100) based on category '${category}' and ${contributingFactors.length} detected risk factors.`,
    scoring_version: SCORING_VERSION,
    contributing_factors: contributingFactors,
    explanation_summary: explanationSummary,
    uncertainty_limitations: uncertaintyLimitations,
  };
}

module.exports = {
  classifyComplaint,
  SCORING_VERSION,
  HIGH_RISK_COMMODITIES,
  HAZARD_KEYWORDS,
  CATEGORY_BASE_WEIGHTS,
};
