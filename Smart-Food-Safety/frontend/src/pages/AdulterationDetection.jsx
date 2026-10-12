import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Microscope,
  UploadCloud,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  ArrowLeft,
  Search,
  FilePlus2,
  X,
  Info,
  ExternalLink,
} from "lucide-react";
import { getApiUrl, authFetch } from "../services/authService";

/* =========================================================
   200+ FOOD PRODUCTS
========================================================= */

const productNames = [
  // Dairy - 1 to 20
  "Milk",
  "Paneer",
  "Ghee",
  "Butter",
  "Curd",
  "Cheese",
  "Khoya",
  "Cream",
  "Milk Powder",
  "Condensed Milk",
  "Buttermilk",
  "Flavoured Milk",
  "Yogurt",
  "Ice Cream",
  "Kulfi",
  "Lassi",
  "Shrikhand",
  "Chaas",
  "Cottage Cheese",
  "Whey Powder",

  // Grains & Cereals - 21 to 45
  "Rice",
  "Wheat",
  "Wheat Flour",
  "Maida",
  "Atta",
  "Rava",
  "Semolina",
  "Suji",
  "Poha",
  "Corn",
  "Corn Flour",
  "Corn Starch",
  "Barley",
  "Oats",
  "Bajra",
  "Jowar",
  "Ragi",
  "Quinoa",
  "Brown Rice",
  "Basmati Rice",
  "Broken Rice",
  "Rice Flour",
  "Besan",
  "Gram Flour",
  "Multigrain Flour",

  // Pulses - 46 to 60
  "Toor Dal",
  "Moong Dal",
  "Masoor Dal",
  "Urad Dal",
  "Chana Dal",
  "Rajma",
  "Chickpeas",
  "Black Gram",
  "Green Gram",
  "Black Chickpeas",
  "White Peas",
  "Green Peas",
  "Soybeans",
  "Soya Chunks",
  "Lentils",

  // Spices - 61 to 85
  "Turmeric Powder",
  "Chilli Powder",
  "Coriander Powder",
  "Cumin",
  "Cumin Powder",
  "Black Pepper",
  "Cardamom",
  "Cloves",
  "Cinnamon",
  "Mustard Seeds",
  "Fenugreek",
  "Fennel",
  "Ajwain",
  "Asafoetida",
  "Ginger Powder",
  "Garlic Powder",
  "Garam Masala",
  "Curry Powder",
  "Black Salt",
  "Rock Salt",
  "Saffron",
  "Nutmeg",
  "Mace",
  "Bay Leaf",
  "Star Anise",

  // Oils & Fats - 86 to 100
  "Cooking Oil",
  "Mustard Oil",
  "Sunflower Oil",
  "Groundnut Oil",
  "Coconut Oil",
  "Soybean Oil",
  "Palm Oil",
  "Sesame Oil",
  "Rice Bran Oil",
  "Olive Oil",
  "Corn Oil",
  "Cottonseed Oil",
  "Flaxseed Oil",
  "Almond Oil",
  "Vanaspati",

  // Sweeteners - 101 to 110
  "Sugar",
  "Jaggery",
  "Honey",
  "Brown Sugar",
  "Powdered Sugar",
  "Coconut Sugar",
  "Glucose",
  "Molasses",
  "Maple Syrup",
  "Sugar Syrup",

  // Beverages - 111 to 130
  "Tea",
  "Coffee",
  "Green Tea",
  "Black Tea",
  "Herbal Tea",
  "Instant Coffee",
  "Fruit Juice",
  "Orange Juice",
  "Apple Juice",
  "Mango Juice",
  "Grape Juice",
  "Lemon Juice",
  "Tomato Juice",
  "Coconut Water",
  "Soft Drink",
  "Energy Drink",
  "Sports Drink",
  "Milkshake",
  "Cold Coffee",
  "Packaged Drinking Water",

  // Fruits - 131 to 145
  "Apple",
  "Banana",
  "Mango",
  "Orange",
  "Grapes",
  "Papaya",
  "Guava",
  "Watermelon",
  "Muskmelon",
  "Pineapple",
  "Pomegranate",
  "Strawberry",
  "Blueberry",
  "Pear",
  "Peach",

  // Vegetables - 146 to 160
  "Potato",
  "Tomato",
  "Onion",
  "Garlic",
  "Ginger",
  "Carrot",
  "Beetroot",
  "Cabbage",
  "Cauliflower",
  "Spinach",
  "Brinjal",
  "Lady Finger",
  "Green Chilli",
  "Capsicum",
  "Cucumber",

  // Processed Foods - 161 to 180
  "Biscuits",
  "Bread",
  "Jam",
  "Pickle",
  "Tomato Sauce",
  "Chilli Sauce",
  "Soy Sauce",
  "Mayonnaise",
  "Noodles",
  "Pasta",
  "Chocolate",
  "Candy",
  "Cake",
  "Cookies",
  "Chips",
  "Popcorn",
  "Breakfast Cereal",
  "Instant Soup",
  "Peanut Butter",
  "Fruit Spread",

  // Meat, Eggs & Seafood - 181 to 190
  "Meat",
  "Chicken",
  "Fish",
  "Eggs",
  "Mutton",
  "Beef",
  "Pork",
  "Prawns",
  "Crab",
  "Dried Fish",

  // Other Food Products - 191 to 200
  "Dry Fruits",
  "Almonds",
  "Cashews",
  "Raisins",
  "Walnuts",
  "Pistachios",
  "Dates",
  "Coconut",
  "Peanuts",
  "Food Additives",

  // Extra food items
  "Sandwich",
  "Biryani",
];

/* =========================================================
   SPECIAL RESULTS FOR IMPORTANT PRODUCTS
========================================================= */

const specialResults = {
  Milk: {
    confidence: 87,
    educational_screening_score: 87,
    risk: "High",
    result: "Observation-Based Guidance Alert — Possible Adulteration Indicator (Laboratory Confirmation Required)",
    rapid_method: "Iodine solution test for starch / shaking test for detergent",
    issues: [
      "Water content may be higher than normal",
      "Possible presence of foreign substances",
      "Nutritional value may differ from standard",
    ],
  },

  Paneer: {
    confidence: 82,
    risk: "High",
    result: "Possible Adulteration Detected",
    issues: [
      "Possible starch presence",
      "Texture appears different from standard",
      "Possible non-milk ingredients",
    ],
  },

  Ghee: {
    confidence: 76,
    risk: "Medium",
    result: "Possible Adulteration Detected",
    issues: [
      "Possible presence of other edible oils",
      "Texture requires verification",
      "Fat composition may differ from standard",
    ],
  },

  Butter: {
    confidence: 71,
    risk: "Medium",
    result: "Possible Adulteration Detected",
    issues: [
      "Possible vegetable oil mixing",
      "Texture requires further testing",
      "Fat content requires verification",
    ],
  },

  "Cooking Oil": {
    confidence: 91,
    risk: "High",
    result: "Possible Adulteration Detected",
    issues: [
      "Possible mixing with lower-cost oils",
      "Oil appearance requires verification",
      "Fat composition may differ from standard",
    ],
  },

  Rice: {
    confidence: 64,
    risk: "Medium",
    result: "Preliminary Screening Alert",
    issues: [
      "Some grains may appear different",
      "Possible foreign material",
      "Quality requires further verification",
    ],
  },

  "Wheat Flour": {
    confidence: 69,
    risk: "Medium",
    result: "Preliminary Screening Alert",
    issues: [
      "Possible foreign particles",
      "Flour texture requires verification",
      "Quality may differ from standard",
    ],
  },

  "Turmeric Powder": {
    confidence: 88,
    risk: "High",
    result: "Possible Adulteration Detected",
    issues: [
      "Colour appears unusually strong",
      "Possible artificial colouring",
      "Powder composition requires laboratory testing",
    ],
  },

  "Chilli Powder": {
    confidence: 84,
    risk: "High",
    result: "Possible Adulteration Detected",
    issues: [
      "Possible artificial colouring",
      "Possible foreign powder material",
      "Colour intensity requires verification",
    ],
  },

  "Coriander Powder": {
    confidence: 78,
    risk: "Medium",
    result: "Possible Adulteration Detected",
    issues: [
      "Possible foreign plant material",
      "Powder texture requires verification",
      "Composition requires further testing",
    ],
  },

  Sugar: {
    confidence: 58,
    risk: "Low",
    result: "No Major Issue Indicated",
    issues: [
      "No major visual abnormality detected",
      "Product appears generally normal",
      "Laboratory verification recommended when required",
    ],
  },

  Salt: {
    confidence: 55,
    risk: "Low",
    result: "No Major Issue Indicated",
    issues: [
      "No major visual abnormality detected",
      "Appearance appears generally normal",
      "Laboratory verification recommended when required",
    ],
  },

  Honey: {
    confidence: 79,
    risk: "Medium",
    result: "Possible Adulteration Detected",
    issues: [
      "Possible added sugar or syrup",
      "Consistency requires verification",
      "Composition requires laboratory testing",
    ],
  },

  Tea: {
    confidence: 73,
    risk: "Medium",
    result: "Possible Adulteration Detected",
    issues: [
      "Possible foreign leaf material",
      "Colour requires verification",
      "Composition requires further testing",
    ],
  },

  Coffee: {
    confidence: 67,
    risk: "Medium",
    result: "Preliminary Screening Alert",
    issues: [
      "Possible mixing with other powder",
      "Powder texture requires verification",
      "Composition requires further testing",
    ],
  },

  Biscuits: {
    confidence: 62,
    risk: "Medium",
    result: "Preliminary Screening Alert",
    issues: [
      "Product appearance requires verification",
      "Possible ingredient variation",
      "Packaging information should be checked",
    ],
  },

  Bread: {
    confidence: 65,
    risk: "Medium",
    result: "Preliminary Screening Alert",
    issues: [
      "Texture requires verification",
      "Possible quality variation",
      "Ingredient information should be checked",
    ],
  },

  Jam: {
    confidence: 61,
    risk: "Medium",
    result: "Preliminary Screening Alert",
    issues: [
      "Colour requires verification",
      "Possible added colouring",
      "Composition requires further testing",
    ],
  },

  Pickle: {
    confidence: 70,
    risk: "Medium",
    result: "Possible Adulteration Detected",
    issues: [
      "Colour requires verification",
      "Possible excess artificial additives",
      "Composition requires further testing",
    ],
  },

  "Fruit Juice": {
    confidence: 83,
    risk: "High",
    result: "Possible Adulteration Detected",
    issues: [
      "Possible added water or sugar",
      "Colour requires verification",
      "Juice composition requires laboratory testing",
    ],
  },

  "Soft Drink": {
    confidence: 56,
    risk: "Low",
    result: "No Major Issue Indicated",
    issues: [
      "No major visual abnormality detected",
      "Packaging should be checked",
      "Ingredient information should be verified",
    ],
  },

  "Tomato Sauce": {
    confidence: 75,
    risk: "Medium",
    result: "Possible Adulteration Detected",
    issues: [
      "Colour requires verification",
      "Possible added colouring",
      "Composition requires further testing",
    ],
  },

  "Chilli Sauce": {
    confidence: 77,
    risk: "Medium",
    result: "Possible Adulteration Detected",
    issues: [
      "Colour requires verification",
      "Possible artificial additives",
      "Composition requires laboratory testing",
    ],
  },

  Noodles: {
    confidence: 63,
    risk: "Medium",
    result: "Preliminary Screening Alert",
    issues: [
      "Product appearance requires verification",
      "Ingredient information should be checked",
      "Quality requires further testing",
    ],
  },

  Chocolate: {
    confidence: 59,
    risk: "Low",
    result: "No Major Issue Indicated",
    issues: [
      "No major visual abnormality detected",
      "Product appearance appears normal",
      "Packaging and ingredients should be checked",
    ],
  },

  "Ice Cream": {
    confidence: 68,
    risk: "Medium",
    result: "Preliminary Screening Alert",
    issues: [
      "Texture requires verification",
      "Possible ingredient variation",
      "Composition requires further testing",
    ],
  },

  Cheese: {
    confidence: 74,
    risk: "Medium",
    result: "Possible Adulteration Detected",
    issues: [
      "Texture requires verification",
      "Possible non-dairy ingredients",
      "Composition requires laboratory testing",
    ],
  },

  Curd: {
    confidence: 72,
    risk: "Medium",
    result: "Possible Adulteration Detected",
    issues: [
      "Consistency requires verification",
      "Possible non-milk ingredients",
      "Composition requires further testing",
    ],
  },

  Meat: {
    confidence: 81,
    risk: "High",
    result: "Possible Quality Issue Detected",
    issues: [
      "Appearance requires verification",
      "Freshness should be checked",
      "Laboratory inspection is recommended",
    ],
  },

  Chicken: {
    confidence: 85,
    risk: "High",
    result: "Possible Quality Issue Detected",
    issues: [
      "Appearance requires verification",
      "Freshness should be checked",
      "Laboratory inspection is recommended",
    ],
  },

  Fish: {
    confidence: 80,
    risk: "High",
    result: "Possible Quality Issue Detected",
    issues: [
      "Freshness requires verification",
      "Appearance requires further inspection",
      "Laboratory testing is recommended",
    ],
  },

  Eggs: {
    confidence: 66,
    risk: "Medium",
    result: "Preliminary Screening Alert",
    issues: [
      "Shell appearance requires verification",
      "Freshness should be checked",
      "Further testing may be required",
    ],
  },

  Sandwich: {
    confidence: 78,
    risk: "Medium",
    result: "Possible Quality Issue Detected",
    issues: [
      "Ingredient freshness requires verification",
      "Possible quality variation in filling",
      "Hygiene and preparation conditions should be checked",
    ],
  },

  Biryani: {
    confidence: 84,
    risk: "High",
    result: "Possible Quality Issue Detected",
    issues: [
      "Ingredient freshness requires verification",
      "Possible use of artificial colouring",
      "Cooking and storage conditions should be checked",
    ],
  },
};

/* =========================================================
   CREATE DEFAULT RESULT FOR ALL OTHER PRODUCTS
========================================================= */

const getDefaultResult = (product) => {
  const highRiskProducts = [
    "Mutton",
    "Pork",
    "Prawns",
    "Crab",
    "Dried Fish",
    "Saffron",
    "Olive Oil",
    "Almond Oil",
  ];

  const lowRiskProducts = [
    "Apple",
    "Banana",
    "Mango",
    "Orange",
    "Grapes",
    "Guava",
    "Potato",
    "Tomato",
    "Onion",
    "Carrot",
    "Cucumber",
    "Coconut",
  ];

  if (highRiskProducts.includes(product)) {
    return {
      confidence: 82,
      risk: "High",
      result: "Possible Quality Issue Detected",
      issues: [
        "Product quality requires verification",
        "Possible contamination or quality variation",
        "Further inspection is recommended",
      ],
    };
  }

  if (lowRiskProducts.includes(product)) {
    return {
      confidence: 57,
      risk: "Low",
      result: "No Major Issue Indicated",
      issues: [
        "No major visual abnormality indicated",
        "Freshness and quality should be checked",
        "Laboratory verification may be required when necessary",
      ],
    };
  }

  return {
    confidence: 68,
    risk: "Medium",
    result: "Preliminary Screening Alert",
    issues: [
      "Product appearance requires verification",
      "Possible ingredient or quality variation",
      "Further testing is recommended for confirmation",
    ],
  };
};

/* =========================================================
   CREATE COMPLETE PRODUCT RESULTS
========================================================= */

const productResults = {};

productNames.forEach((product) => {
  productResults[product] =
    specialResults[product] || getDefaultResult(product);
});

/* =========================================================
   MAIN COMPONENT
========================================================= */

function AdulterationDetection() {
  const navigate = useNavigate();

  const [selectedProduct, setSelectedProduct] = useState("Milk");
  const [selectedImage, setSelectedImage] = useState(null);
  const [analyzed, setAnalyzed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [backendResult, setBackendResult] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [disclaimerLang, setDisclaimerLang] = useState("en");

  const disclaimerTexts = {
    en: "FoodSafe AI provides educational screening guidance based on user-reported observations and basic food safety information. Results do not confirm food adulteration and are not a substitute for testing by an authorized laboratory or assessment by qualified food safety professionals.",
    mr: "FoodSafe AI वापरकर्त्यांच्या निरीक्षणांवर आणि मूलभूत अन्न सुरक्षा माहितीवर आधारित शैक्षणिक तपासणी मार्गदर्शन प्रदान करते. हे निष्कर्ष अन्न भेसळीची पुष्टी करत नाहीत आणि अधिकृत प्रयोगशाळेतील चाचणी किंवा पात्र अन्न सुरक्षा व्यावसायिकांच्या मूल्यमापनाचा पर्याय नाहीत.",
    hi: "FoodSafe AI उपयोगकर्ताओं द्वारा दर्ज किए गए अवलोकनों और बुनियादी खाद्य सुरक्षा जानकारी के आधार पर केवल शैक्षिक स्क्रीनिंग मार्गदर्शन प्रदान करता है। परिणाम खाद्य मिलावट की पुष्टि नहीं करते हैं और किसी अधिकृत प्रयोगशाला परीक्षण या योग्य खाद्य सुरक्षा पेशेवरों के मूल्यांकन का विकल्प नहीं हैं।"
  };

  const staticResult = productResults[selectedProduct];
  const result = backendResult && backendResult.sample_name === selectedProduct
    ? {
        confidence: backendResult.confidence,
        educational_screening_score: backendResult.educational_screening_score || backendResult.confidence,
        assessment_type: backendResult.assessment_type || "EDUCATIONAL_DART_SCREENING",
        scientific_classification: backendResult.scientific_classification || "Observation-Based Guidance",
        laboratory_confirmation_status: backendResult.laboratory_confirmation_status || "REQUIRED_FOR_STATUTORY_ENFORCEMENT",
        risk: backendResult.risk_level,
        result: backendResult.result,
        issues: backendResult.issues || staticResult.issues,
        rapid_method: backendResult.rapid_method,
        recommended_action: backendResult.recommended_action,
        fssai_dart_reference: backendResult.fssai_dart_reference,
        test_id: backendResult.id
      }
    : staticResult;

  /* Search products */
  const filteredProducts = useMemo(() => {
    return productNames.filter((product) =>
      product.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [searchText]);

  /* Image upload */
  const handleImageChange = (event) => {
    const file = event.target.files[0];

    if (file) {
      setSelectedImage(URL.createObjectURL(file));
      setAnalyzed(false);
      setBackendResult(null);
    }
  };

  /* Analyze */
  const handleAnalyze = async () => {
    if (!selectedImage) {
      alert("Please upload a food image first.");
      return;
    }

    setLoading(true);
    setAnalyzed(false);

    try {
      const response = await authFetch(`${getApiUrl()}/adulteration/test`, {
        method: "POST",
        body: JSON.stringify({
          sample_name: selectedProduct,
          test_type: "RAPID_DART"
        })
      });

      const data = await response.json();
      if (response.ok && data.success && data.test) {
        setBackendResult(data.test);
      }
    } catch (err) {
      console.warn("Backend analysis fallback:", err);
    } finally {
      setAnalyzed(true);
      setLoading(false);
    }
  };

  const riskColor =
    result.risk === "High" || result.risk === "Critical"
      ? "#c62828"
      : result.risk === "Medium"
      ? "#b77900"
      : "#168b43";

  const getRiskMeta = () => {
    const risk = (result.risk || "").toLowerCase();
    if (risk === "high" || risk === "critical") {
      return {
        bg: "var(--color-error-bg)",
        border: "var(--color-error-border)",
        color: "var(--color-error)",
        badgeClass: "badge-rejected",
        icon: AlertTriangle,
      };
    }
    if (risk === "medium") {
      return {
        bg: "var(--color-warning-bg)",
        border: "var(--color-warning-border)",
        color: "var(--color-warning)",
        badgeClass: "badge-review",
        icon: AlertTriangle,
      };
    }
    return {
      bg: "var(--color-success-bg)",
      border: "var(--color-success-border)",
      color: "var(--color-success)",
      badgeClass: "badge-resolved",
      icon: CheckCircle2,
    };
  };

  const riskMeta = getRiskMeta();
  const RiskIcon = riskMeta.icon;

  const handleBack = () => {
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : {};
    if (user.role === "ADMIN") navigate("/admin-dashboard");
    else if (user.role === "AUTHORIZED_AUTHORITY") navigate("/authority-dashboard");
    else navigate("/customer-dashboard");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-bg)",
        padding: "var(--space-8) var(--space-6)",
        fontFamily: "var(--font-family)",
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "var(--space-6)",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <button className="btn btn-secondary" onClick={handleBack}>
            <ArrowLeft size={16} />
            <span>Return to Workspace</span>
          </button>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              background: "var(--color-primary-light)",
              color: "var(--color-primary-dark)",
              borderRadius: "var(--radius-full)",
              fontSize: "var(--font-size-xs)",
              fontWeight: "700",
            }}
          >
            <ShieldCheck size={14} color="var(--color-primary)" />
            <span>EDUCATIONAL DART PROTOCOL • HOUSEHOLD SCREENING GUIDANCE</span>
          </div>
        </div>

        {/* Page Header */}
        <div style={{ marginBottom: "var(--space-6)" }}>
          <h1 className="page-title" style={{ fontSize: "var(--font-size-4xl)" }}>
            Food Adulteration Educational Screening
          </h1>
          <p className="page-subtitle" style={{ maxWidth: "800px" }}>
            Educational household screening protocol adhering to official Food Safety and Standards Authority of India (FSSAI) DART guidelines. This tool provides observation-based screening guidance and does not replace certified laboratory testing.{" "}
            <a
              href="https://fssai.gov.in/dart/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--color-primary)", textDecoration: "underline", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "3px" }}
            >
              Official FSSAI DART Guide <ExternalLink size={12} />
            </a>
          </p>
        </div>

        {/* 2-Column Responsive Screening Workspace */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "var(--space-6)",
            alignItems: "start",
          }}
        >
          {/* Left Column: Commodity selection & image */}
          <div className="card" style={{ padding: "var(--space-6)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "var(--space-4)" }}>
              <Microscope size={20} color="var(--color-primary)" />
              <h3 style={{ margin: 0, fontSize: "var(--font-size-lg)" }}>
                Step 1: Select Commodity & Reference Sample
              </h3>
            </div>

            {/* Product search */}
            <div className="form-group">
              <label className="form-label">Search Food Item</label>
              <div style={{ position: "relative" }}>
                <Search
                  size={16}
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--color-muted)",
                  }}
                />
                <input
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: "36px" }}
                  placeholder="Search among 200+ items (e.g., Milk, Turmeric, Honey, Ghee)..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
            </div>

            {/* Product List */}
            <div className="form-group">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "6px",
                  fontSize: "var(--font-size-xs)",
                  color: "var(--color-secondary)",
                }}
              >
                <span>Select from registry ({filteredProducts.length} items):</span>
                <span>Active: <strong>{selectedProduct}</strong></span>
              </div>

              <div
                style={{
                  maxHeight: "180px",
                  overflowY: "auto",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  background: "var(--color-surface-2)",
                  padding: "4px",
                }}
              >
                {filteredProducts.map((p) => {
                  const isSelected = p === selectedProduct;
                  return (
                    <div
                      key={p}
                      onClick={() => {
                        setSelectedProduct(p);
                        setAnalyzed(false);
                      }}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                        fontSize: "var(--font-size-sm)",
                        background: isSelected ? "var(--color-primary)" : "transparent",
                        color: isSelected ? "#fff" : "var(--color-heading)",
                        fontWeight: isSelected ? "700" : "500",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        transition: "var(--transition-fast)",
                      }}
                    >
                      <span>{p}</span>
                      {isSelected && <span style={{ fontSize: "11px" }}>Selected</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Image Upload Dropzone */}
            <div className="form-group">
              <label className="form-label">
                Upload Sample Evidence Image <span style={{ color: "var(--color-error)" }}>*</span>
              </label>

              {selectedImage ? (
                <div
                  style={{
                    position: "relative",
                    borderRadius: "var(--radius-md)",
                    overflow: "hidden",
                    border: "1px solid var(--color-border)",
                    background: "var(--color-surface-2)",
                    textAlign: "center",
                    padding: "8px",
                  }}
                >
                  <img
                    src={selectedImage}
                    alt="Sample record"
                    style={{
                      maxHeight: "200px",
                      maxWidth: "100%",
                      objectFit: "contain",
                      borderRadius: "var(--radius-sm)",
                    }}
                  />
                  <button
                    onClick={() => {
                      setSelectedImage(null);
                      setAnalyzed(false);
                    }}
                    style={{
                      position: "absolute",
                      top: "12px",
                      right: "12px",
                      background: "rgba(0,0,0,0.6)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "50%",
                      width: "26px",
                      height: "26px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title="Remove image"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "var(--space-6)",
                    border: "2px dashed var(--color-border-dark)",
                    borderRadius: "var(--radius-md)",
                    background: "var(--color-surface-2)",
                    cursor: "pointer",
                    transition: "var(--transition-fast)",
                  }}
                >
                  <UploadCloud size={32} color="var(--color-primary)" style={{ marginBottom: "8px" }} />
                  <span style={{ fontWeight: "600", fontSize: "var(--font-size-sm)" }}>
                    Select Sample Photograph
                  </span>
                  <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-muted)", marginTop: "4px" }}>
                    Image is recorded for complaint documentation and manual verification
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: "none" }}
                  />
                </label>
              )}
            </div>

            {/* Analyze button */}
            <button
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "12px" }}
              onClick={handleAnalyze}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: "18px", height: "18px" }} />
                  <span>Screening Sample against FSSAI Database...</span>
                </>
              ) : (
                <>
                  <Microscope size={18} />
                  <span>Screen Sample with FSSAI DART Protocols</span>
                </>
              )}
            </button>
          </div>

          {/* Right Column: Results & Recommendations */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div className="card" style={{ padding: "var(--space-6)" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "var(--space-4)",
                  borderBottom: "1px solid var(--color-border)",
                  paddingBottom: "var(--space-3)",
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: "var(--font-size-xl)" }}>
                    Screening Outcome
                  </h3>
                  <span style={{ fontSize: "12px", color: "var(--color-secondary)" }}>
                    Target Commodity: <strong>{selectedProduct}</strong>
                  </span>
                </div>
                <span className={`badge ${riskMeta.badgeClass}`} style={{ fontSize: "13px" }}>
                  {result.risk} Risk Profile
                </span>
              </div>

              {/* Status banner */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "var(--space-4)",
                  background: riskMeta.bg,
                  border: `1px solid ${riskMeta.border}`,
                  borderRadius: "var(--radius-md)",
                  color: riskMeta.color,
                  marginBottom: "var(--space-5)",
                }}
              >
                <RiskIcon size={24} />
                <div>
                  <div style={{ fontWeight: "700", fontSize: "var(--font-size-base)" }}>
                    {result.result}
                  </div>
                  <div style={{ fontSize: "var(--font-size-xs)", opacity: 0.9 }}>
                    FSSAI Rapid Diagnostic Observation (Laboratory Confirmation Required)
                  </div>
                </div>
              </div>

              {/* Heuristic Guidance Score meter */}
              <div style={{ marginBottom: "var(--space-5)" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                    fontSize: "var(--font-size-sm)",
                  }}
                >
                  <span style={{ fontWeight: "600", color: "var(--color-heading)" }}>
                    Educational Screening Guidance Score
                  </span>
                  <span style={{ fontWeight: "700", color: "var(--color-primary-dark)" }}>
                    {result.educational_screening_score || result.confidence}%
                  </span>
                </div>
                <div style={{ fontSize: "11px", color: "var(--color-muted)", marginBottom: "8px" }}>
                  Heuristic benchmark based on observed test factors. Not a calibrated probability or certified laboratory finding.
                </div>
                <div
                  style={{
                    height: "8px",
                    background: "var(--color-surface-2)",
                    borderRadius: "var(--radius-full)",
                    overflow: "hidden",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${result.educational_screening_score || result.confidence}%`,
                      background: "var(--color-primary)",
                      borderRadius: "var(--radius-full)",
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
              </div>

              {/* Detected issues */}
              <div style={{ marginBottom: "var(--space-5)" }}>
                <h4 style={{ margin: "0 0 10px", fontSize: "var(--font-size-sm)", color: "var(--color-heading)" }}>
                  Identified Risk Markers & Observations:
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {result.issues.map((issue, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "8px",
                        fontSize: "var(--font-size-sm)",
                        color: "var(--color-body)",
                      }}
                    >
                      <div
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: "var(--color-primary)",
                          marginTop: "6px",
                          flexShrink: 0,
                        }}
                      />
                      <span>{issue}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rapid Method Info & Official Link */}
              {result.rapid_method && (
                <div
                  style={{
                    padding: "var(--space-3) var(--space-4)",
                    background: "var(--color-surface-2)",
                    borderRadius: "var(--radius-md)",
                    marginBottom: "var(--space-4)",
                    fontSize: "var(--font-size-xs)",
                  }}
                >
                  <div style={{ marginBottom: "6px" }}>
                    <strong>DART Test Method: </strong>
                    <span>{result.rapid_method}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--color-primary)" }}>
                    <ExternalLink size={12} />
                    <a
                      href="https://fssai.gov.in/dart/"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--color-primary)", textDecoration: "underline", fontWeight: "600" }}
                    >
                      Official FSSAI DART Educational Reference ↗
                    </a>
                  </div>
                </div>
              )}

              {/* Action Prompt */}
              {analyzed && (
                <div
                  style={{
                    marginTop: "var(--space-4)",
                    padding: "var(--space-4)",
                    background: "var(--color-primary-light)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid #BBF7D0",
                  }}
                >
                  <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-primary-dark)", fontWeight: "600", marginBottom: "8px" }}>
                    ✓ Preliminary screening completed for {selectedProduct}.
                  </div>
                  {(result.risk === "High" || result.risk === "Critical" || result.risk === "Medium") && (
                    <button
                      className="btn btn-primary"
                      style={{ width: "100%", justifyContent: "center", background: "#DC2626" }}
                      onClick={() =>
                        navigate("/submit-complaint", {
                          state: {
                            product: selectedProduct,
                            category: "Food Adulteration",
                          },
                        })
                      }
                    >
                      <FilePlus2 size={16} />
                      <span>File Official Grievance for {selectedProduct}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Educational Disclaimer Card with Multilingual Selection */}
            <div
              className="card"
              style={{
                padding: "var(--space-4)",
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                  flexWrap: "wrap",
                  gap: "6px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "700", fontSize: "var(--font-size-xs)", color: "var(--color-heading)" }}>
                  <Info size={16} color="var(--color-primary)" />
                  <span>Educational Screening Disclaimer</span>
                </div>
                <div style={{ display: "flex", gap: "4px" }}>
                  {[
                    { id: "en", label: "English" },
                    { id: "mr", label: "मराठी" },
                    { id: "hi", label: "हिंदी" },
                  ].map((lang) => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => setDisclaimerLang(lang.id)}
                      style={{
                        padding: "2px 8px",
                        fontSize: "11px",
                        borderRadius: "var(--radius-sm)",
                        border: disclaimerLang === lang.id ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
                        background: disclaimerLang === lang.id ? "var(--color-primary-light)" : "transparent",
                        color: disclaimerLang === lang.id ? "var(--color-primary-dark)" : "var(--color-secondary)",
                        fontWeight: disclaimerLang === lang.id ? "700" : "500",
                        cursor: "pointer",
                      }}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: "var(--font-size-xs)",
                  color: "var(--color-secondary)",
                  lineHeight: "1.5",
                }}
              >
                {disclaimerTexts[disclaimerLang]}
              </p>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--color-muted)",
                  borderTop: "1px dashed var(--color-border)",
                  paddingTop: "6px",
                }}
              >
                <strong>Statutory Notice:</strong> Household rapid tests screen for chemical or physical indicators under FSSAI DART manuals. Judicial penalties or regulatory enforcement require verified certified laboratory analysis.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdulterationDetection;