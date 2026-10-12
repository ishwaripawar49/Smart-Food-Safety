import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  FilePlus2,
  ShieldAlert,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Store,
  Calendar,
  MapPin,
  ChevronDown,
  X,
  Copy,
  ExternalLink,
  ArrowRight,
  Info,
  Compass,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";
import CustomerSidebar from "../components/CustomerSidebar";
import { authFetch, getApiUrl } from "../services/authService";

const FOOD_PRODUCTS = [
  // Dairy
  "Milk", "Paneer", "Curd", "Cheese", "Butter", "Ghee", "Cream", "Buttermilk",
  "Lassi", "Flavored Milk", "Yogurt", "Khoya", "Mawa", "Condensed Milk", "Milk Powder",
  // Bakery & Grains
  "Bread", "Brown Bread", "Atta / Whole Wheat", "Maida / Refined Flour", "Rice",
  "Basmati Rice", "Rava / Suji", "Poha", "Oats", "Besan / Gram Flour",
  "Biscuits", "Cake", "Pastry", "Buns & Pav", "Rusk",
  // Pulses & Legumes
  "Toor Dal", "Moong Dal", "Urad Dal", "Chana Dal", "Masoor Dal", "Rajma", "Chickpeas / Chole",
  // Spices & Condiments
  "Turmeric Powder", "Red Chilli Powder", "Coriander Powder", "Cumin Powder", "Black Pepper",
  "Garam Masala", "Cardamom", "Cloves", "Mustard Seeds", "Salt", "Sugar", "Jaggery",
  // Cooking Oils
  "Mustard Oil", "Sunflower Oil", "Groundnut Oil", "Soybean Oil", "Coconut Oil",
  "Olive Oil", "Vanaspati", "Palm Oil", "Sesame Oil",
  // Beverages
  "Tea / Chai", "Green Tea", "Coffee", "Fruit Juice", "Packaged Drinking Water",
  "Soft Drink / Soda", "Energy Drink",
  // Prepared & Restaurant
  "Cooked Meals / Thali", "Street Food", "Samosa", "Sweets / Mithai", "Ice Cream",
  "Meat & Poultry", "Fish & Seafood", "Eggs", "Canned / Packaged Snacks"
];

const COMPLAINT_CATEGORIES = [
  { value: "Food Adulteration", label: "Suspected Adulteration (Foreign chemicals, water, synthetic dyes)" },
  { value: "Expired Food", label: "Expired / Stale Food (Past expiry date, rotten, moldy)" },
  { value: "Food Poisoning", label: "Foodborne Illness / Poisoning (Vomiting, cramps after consumption)" },
  { value: "Poor Hygiene", label: "Unsanitary Food Preparation (Pests, unhygienic handlers, dirt)" },
  { value: "Foreign Contaminant", label: "Foreign Objects (Insects, hair, glass, plastic fragments)" },
  { value: "Misleading Labeling", label: "Misleading Labeling / False Nutritional Claims" },
];

const UNLISTED_SELLER_TYPES = [
  { value: "Roadside Food Stall", label: "Roadside Food Stall (e.g., Vadapav, chaat, juice stall)" },
  { value: "Food Cart", label: "Food Cart / Thela (Mobile or stationary street cart)" },
  { value: "Small Shop", label: "Small Shop / Dhaba (Local tea shop, bakery, snack stall)" },
  { value: "Restaurant", label: "Restaurant / Eatery (Not currently found in registry)" },
  { value: "Temporary Market Stall", label: "Temporary Market Stall (Weekly bazaar, festival fair)" },
  { value: "Other / Unknown", label: "Other / Unknown Food Seller" },
];

function SubmitComplaint() {
  const navigate = useNavigate();
  const locationState = useLocation().state || {};

  const [formData, setFormData] = useState({
    seller_listing_type: "LISTED", // 'LISTED' or 'UNLISTED'
    category: locationState.category || "",
    product_name: locationState.product || "",
    shop_id: "",
    // Unlisted seller fields
    seller_type: "",
    reported_shop_name: "",
    reported_landmark: "",
    reported_address: "",
    reported_registration_number: "",
    description: "",
    incident_date: new Date().toISOString().split("T")[0],
    location: "",
  });

  const [shops, setShops] = useState([]);
  const [loadingShops, setLoadingShops] = useState(true);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successComplaintId, setSuccessComplaintId] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Food dropdown search
  const [foodSearch, setFoodSearch] = useState(locationState.product || "");
  const [showFoodDropdown, setShowFoodDropdown] = useState(false);

  // Load registered active shops
  useEffect(() => {
    let mounted = true;

    const loadShops = async () => {
      try {
        setLoadingShops(true);
        const response = await authFetch(`${getApiUrl()}/shops`);
        if (!response) return;

        const data = await response.json();
        if (mounted && data.success && Array.isArray(data.shops)) {
          setShops(data.shops.filter((s) => s.status === "ACTIVE"));
        }
      } catch (err) {
        console.error("LOAD SHOPS ERROR:", err);
      } finally {
        if (mounted) setLoadingShops(false);
      }
    };

    loadShops();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredFoods = FOOD_PRODUCTS.filter((item) =>
    item.toLowerCase().includes(foodSearch.toLowerCase())
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Switch between Listed and Unlisted and clear incompatible fields
  const handleListingTypeChange = (type) => {
    if (type === "LISTED") {
      setFormData((prev) => ({
        ...prev,
        seller_listing_type: "LISTED",
        seller_type: "",
        reported_shop_name: "",
        reported_landmark: "",
        reported_address: "",
        reported_registration_number: "",
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        seller_listing_type: "UNLISTED",
        shop_id: "",
      }));
    }
    setError("");
  };

  const handleSelectFood = (food) => {
    setFormData((prev) => ({ ...prev, product_name: food }));
    setFoodSearch(food);
    setShowFoodDropdown(false);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setImage(null);
      setImagePreview(null);
      return;
    }

    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("Only JPG, PNG and WEBP image files are allowed.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size exceeds the 5 MB threshold.");
      return;
    }

    setError("");
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    const input = document.getElementById("food-image-input");
    if (input) input.value = "";
  };

  const handleCopyId = () => {
    if (successComplaintId) {
      navigator.clipboard.writeText(successComplaintId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.category) {
      setError("Please select an appropriate grievance category.");
      return;
    }
    if (!formData.product_name.trim()) {
      setError("Please specify the food product or commodity.");
      return;
    }

    // Specific Seller Validation
    if (formData.seller_listing_type === "LISTED") {
      if (!formData.shop_id) {
        setError("Please select the registered food vendor or restaurant.");
        return;
      }
    } else {
      if (!formData.seller_type) {
        setError("Please select the Seller Type (e.g., Roadside Food Stall, Food Cart, Small Shop).");
        return;
      }
      const hasLocation = (formData.reported_landmark || "").trim() || (formData.location || "").trim();
      if (!hasLocation) {
        setError("Please provide a Location Description / Landmark (e.g., Near bus stand, opposite market entrance) so authorities can locate the seller.");
        return;
      }
    }

    if (!formData.description.trim()) {
      setError("Please describe the incident in detail (minimum 5 characters).");
      return;
    }
    if (formData.description.trim().length < 5) {
      setError("Complaint description must be at least 5 characters.");
      return;
    }
    if (!formData.incident_date) {
      setError("Please specify when the incident took place.");
      return;
    }

    setLoading(true);

    try {
      const dataToSend = new FormData();
      dataToSend.append("seller_listing_type", formData.seller_listing_type);
      dataToSend.append("category", formData.category);
      dataToSend.append("product_name", formData.product_name);
      dataToSend.append("description", formData.description);
      dataToSend.append("incident_date", formData.incident_date);
      dataToSend.append("location", formData.location || formData.reported_landmark);

      if (formData.seller_listing_type === "LISTED") {
        dataToSend.append("shop_id", formData.shop_id);
      } else {
        dataToSend.append("seller_type", formData.seller_type);
        if (formData.reported_shop_name && formData.reported_shop_name.trim()) {
          dataToSend.append("reported_shop_name", formData.reported_shop_name.trim());
        }
        if (formData.reported_landmark && formData.reported_landmark.trim()) {
          dataToSend.append("reported_landmark", formData.reported_landmark.trim());
        }
        if (formData.reported_address && formData.reported_address.trim()) {
          dataToSend.append("reported_address", formData.reported_address.trim());
        }
        if (formData.reported_registration_number && formData.reported_registration_number.trim()) {
          dataToSend.append("reported_registration_number", formData.reported_registration_number.trim());
        }
      }

      if (image) {
        dataToSend.append("food_image", image);
      }

      const response = await authFetch(`${getApiUrl()}/complaints`, {
        method: "POST",
        body: dataToSend,
      });

      if (!response) return;

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `Submission failed with status: ${response.status}`);
      }

      if (data.success && data.complaint) {
        setSuccessComplaintId(data.complaint.complaint_id || `CMP-${data.complaint.id}`);
      } else {
        setError(data.message || "Failed to submit grievance.");
      }
    } catch (err) {
      console.error("Submit grievance error:", err);
      setError(err.message || "Cannot reach server. Verify connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-layout">
      <CustomerSidebar />

      <main className="admin-main">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">File Food Safety Grievance</h1>
            <p className="page-subtitle">
              Formal grievance submission under statutory Food Safety and Standards guidelines. Report registered food businesses or roadside vendors.
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <Link
              to="/easy-complaint"
              className="btn btn-sm"
              style={{
                background: "#f0fdf4",
                color: "#166534",
                border: "1px solid #86efac",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>FoodSafe Easy (सोपी पद्धत / आसान तरीका)</span>
            </Link>
            <Link to="/customer-dashboard" className="btn btn-secondary">
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Success View */}
        {successComplaintId ? (
          <div
            className="card animate-fade-in"
            style={{
              padding: "var(--space-8)",
              maxWidth: "700px",
              margin: "0 auto",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "var(--radius-full)",
                background: "var(--color-success-bg)",
                color: "var(--color-success)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto var(--space-4)",
              }}
            >
              <CheckCircle2 size={36} />
            </div>

            <h2 style={{ margin: "0 0 8px", color: "var(--color-heading)" }}>
              Grievance Registered Successfully
            </h2>
            <p
              style={{
                color: "var(--color-secondary)",
                fontSize: "var(--font-size-base)",
                marginBottom: "var(--space-4)",
              }}
            >
              Your complaint has been assigned to a regulatory enforcement queue for initial verification.
            </p>

            <div
              style={{
                background: "var(--color-surface-2)",
                padding: "var(--space-4) var(--space-6)",
                borderRadius: "var(--radius-md)",
                border: "1px dashed var(--color-border-dark)",
                display: "inline-flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "var(--space-6)",
              }}
            >
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-muted)", fontWeight: "600" }}>
                TRACKING ID:
              </span>
              <strong
                style={{
                  fontFamily: "monospace",
                  fontSize: "var(--font-size-2xl)",
                  color: "var(--color-primary-dark)",
                }}
              >
                {successComplaintId}
              </strong>
              <button
                className="btn btn-sm btn-ghost"
                onClick={handleCopyId}
                title="Copy to clipboard"
              >
                {copied ? <CheckCircle2 size={16} color="var(--color-success)" /> : <Copy size={16} />}
              </button>
            </div>

            <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-muted)", marginBottom: "var(--space-6)", maxWidth: 500, margin: "0 auto var(--space-6)" }}>
              Note: This is an internal FoodSafe AI tracking identifier for monitoring investigation workflow. It is not an official government FSSAI grievance number.
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "var(--space-3)",
                flexWrap: "wrap",
              }}
            >
              <button
                className="btn btn-primary"
                onClick={() =>
                  navigate("/track-complaint", {
                    state: { complaintId: successComplaintId },
                  })
                }
              >
                <span>Track Grievance Live</span>
                <ExternalLink size={16} />
              </button>

              <button
                className="btn btn-outline"
                onClick={() => {
                  setSuccessComplaintId(null);
                  setFormData({
                    seller_listing_type: "LISTED",
                    category: "",
                    product_name: "",
                    shop_id: "",
                    seller_type: "",
                    reported_shop_name: "",
                    reported_landmark: "",
                    reported_address: "",
                    reported_registration_number: "",
                    description: "",
                    incident_date: new Date().toISOString().split("T")[0],
                    location: "",
                  });
                  setFoodSearch("");
                  setImage(null);
                  setImagePreview(null);
                }}
              >
                File Another Grievance
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
              gap: "var(--space-6)",
            }}
          >
            {/* Left Form Card */}
            <div className="card" style={{ padding: "var(--space-6)" }}>
              {error && (
                <div
                  style={{
                    padding: "var(--space-3) var(--space-4)",
                    background: "var(--color-error-bg)",
                    border: "1px solid var(--color-error-border)",
                    color: "var(--color-error)",
                    borderRadius: "var(--radius-md)",
                    marginBottom: "var(--space-5)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "var(--font-size-sm)",
                  }}
                >
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* 0. Seller Origin Selector */}
                <div
                  style={{
                    marginBottom: "var(--space-6)",
                    padding: "var(--space-4)",
                    background: "var(--color-surface-2)",
                    borderRadius: "var(--radius-lg)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <label
                    style={{
                      display: "block",
                      fontSize: "var(--font-size-sm)",
                      fontWeight: 700,
                      color: "var(--color-heading)",
                      marginBottom: "10px",
                    }}
                  >
                    Where did you purchase or see the food? <span style={{ color: "var(--color-error)" }}>*</span>
                  </label>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                      gap: "var(--space-3)",
                    }}
                  >
                    {/* Option 1: Listed Shop */}
                    <div
                      id="seller-type-listed"
                      onClick={() => handleListingTypeChange("LISTED")}
                      style={{
                        padding: "var(--space-3) var(--space-4)",
                        borderRadius: "var(--radius-md)",
                        border: `2px solid ${
                          formData.seller_listing_type === "LISTED"
                            ? "var(--color-primary)"
                            : "var(--color-border)"
                        }`,
                        background:
                          formData.seller_listing_type === "LISTED"
                            ? "var(--color-surface)"
                            : "transparent",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                        transition: "var(--transition-fast)",
                      }}
                    >
                      <input
                        type="radio"
                        name="seller_listing_type_radio"
                        id="radio-listed"
                        checked={formData.seller_listing_type === "LISTED"}
                        onChange={() => handleListingTypeChange("LISTED")}
                        style={{ marginTop: "3px", cursor: "pointer" }}
                      />
                      <div>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: "var(--font-size-sm)",
                            color:
                              formData.seller_listing_type === "LISTED"
                                ? "var(--color-primary-dark)"
                                : "var(--color-heading)",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <Store size={15} />
                          <span>Listed Shop / Restaurant</span>
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "var(--color-secondary)",
                            marginTop: "2px",
                          }}
                        >
                          Registered food business listed in our official directory
                        </div>
                      </div>
                    </div>

                    {/* Option 2: Unlisted Vendor */}
                    <div
                      id="seller-type-unlisted"
                      onClick={() => handleListingTypeChange("UNLISTED")}
                      style={{
                        padding: "var(--space-3) var(--space-4)",
                        borderRadius: "var(--radius-md)",
                        border: `2px solid ${
                          formData.seller_listing_type === "UNLISTED"
                            ? "var(--color-primary)"
                            : "var(--color-border)"
                        }`,
                        background:
                          formData.seller_listing_type === "UNLISTED"
                            ? "var(--color-surface)"
                            : "transparent",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                        transition: "var(--transition-fast)",
                      }}
                    >
                      <input
                        type="radio"
                        name="seller_listing_type_radio"
                        id="radio-unlisted"
                        checked={formData.seller_listing_type === "UNLISTED"}
                        onChange={() => handleListingTypeChange("UNLISTED")}
                        style={{ marginTop: "3px", cursor: "pointer" }}
                      />
                      <div>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: "var(--font-size-sm)",
                            color:
                              formData.seller_listing_type === "UNLISTED"
                                ? "var(--color-primary-dark)"
                                : "var(--color-heading)",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <Compass size={15} />
                          <span>Unlisted Shop / Roadside Food Seller</span>
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "var(--color-secondary)",
                            marginTop: "2px",
                          }}
                        >
                          Roadside vadapav stall, thela, cart, market stall, or shop not found
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Branch A: Listed Shop Selection */}
                {formData.seller_listing_type === "LISTED" ? (
                  <div className="form-group animate-fade-in">
                    <label className="form-label" htmlFor="shop_id_select">
                      Registered Food Establishment / Vendor <span style={{ color: "var(--color-error)" }}>*</span>
                    </label>
                    <select
                      id="shop_id_select"
                      className="form-control"
                      name="shop_id"
                      value={formData.shop_id}
                      onChange={handleChange}
                      required
                    >
                      <option value="">
                        {loadingShops ? "Loading registered shops..." : "Select Vendor / Shop"}
                      </option>
                      {shops.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.shop_name} — {s.city || "Local"} ({s.license_number || "FSSAI Registered"})
                        </option>
                      ))}
                    </select>
                    <div style={{ fontSize: "12px", color: "var(--color-muted)", marginTop: "4px" }}>
                      Can't find the shop or stall? Switch above to <strong>Unlisted Shop / Roadside Food Seller</strong>.
                    </div>
                  </div>
                ) : (
                  /* Branch B: Unlisted Seller Details Section */
                  <div
                    className="animate-fade-in"
                    style={{
                      padding: "var(--space-4)",
                      background: "rgba(59, 130, 246, 0.04)",
                      border: "1px solid rgba(59, 130, 246, 0.2)",
                      borderRadius: "var(--radius-lg)",
                      marginBottom: "var(--space-5)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "12px",
                        color: "var(--color-primary-dark)",
                      }}
                    >
                      <Info size={18} />
                      <strong style={{ fontSize: "var(--font-size-sm)" }}>
                        Unlisted Food Seller / Shop Not Found Information
                      </strong>
                    </div>
                    <p
                      style={{
                        fontSize: "12px",
                        color: "var(--color-secondary)",
                        marginTop: 0,
                        marginBottom: "var(--space-4)",
                        lineHeight: "1.5",
                      }}
                    >
                      You can report any food vendor even if they are not registered in our database. Being absent from our registry does not mean the seller is illegal. Provide identifiable location details to help safety officers conduct on-site inspections.
                    </p>

                    {/* Seller Type Dropdown */}
                    <div className="form-group">
                      <label className="form-label" htmlFor="seller_type_select">
                        Seller Type <span style={{ color: "var(--color-error)" }}>*</span>
                      </label>
                      <select
                        id="seller_type_select"
                        className="form-control"
                        name="seller_type"
                        value={formData.seller_type}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select Seller Type</option>
                        {UNLISTED_SELLER_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Shop or Stall Name */}
                    <div className="form-group">
                      <label className="form-label" htmlFor="reported_shop_name_input">
                        Shop or Stall Name <span style={{ color: "var(--color-muted)", fontWeight: "normal" }}>(Optional — leave blank if unknown)</span>
                      </label>
                      <input
                        id="reported_shop_name_input"
                        type="text"
                        className="form-control"
                        placeholder="e.g., Gupta Vadapav Center, Sharma Tea Stall, Raju Chinese Corner"
                        name="reported_shop_name"
                        value={formData.reported_shop_name}
                        onChange={handleChange}
                      />
                    </div>

                    {/* Landmark / Location Description */}
                    <div className="form-group">
                      <label className="form-label" htmlFor="reported_landmark_input">
                        Location Description / Landmark <span style={{ color: "var(--color-error)" }}>*</span>
                      </label>
                      <input
                        id="reported_landmark_input"
                        type="text"
                        className="form-control"
                        placeholder="e.g., Near City Bus Stand, Opposite Main Market Gate No. 2, Outside Metro Station"
                        name="reported_landmark"
                        value={formData.reported_landmark}
                        onChange={handleChange}
                        required
                      />
                      <span style={{ fontSize: "11px", color: "var(--color-muted)", marginTop: "3px", display: "block" }}>
                        Specific landmark where the cart, stall, or shop is situated.
                      </span>
                    </div>

                    {/* Detailed Street Address */}
                    <div className="form-group">
                      <label className="form-label" htmlFor="reported_address_input">
                        Street Address / Area <span style={{ color: "var(--color-muted)", fontWeight: "normal" }}>(Optional)</span>
                      </label>
                      <input
                        id="reported_address_input"
                        type="text"
                        className="form-control"
                        placeholder="e.g., Corner of MG Road and Station Road, Ward 4"
                        name="reported_address"
                        value={formData.reported_address}
                        onChange={handleChange}
                      />
                    </div>

                    {/* FSSAI Registration Number (Optional) */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" htmlFor="reported_registration_input">
                        FSSAI Registration Number <span style={{ color: "var(--color-muted)", fontWeight: "normal" }}>(Optional & not required)</span>
                      </label>
                      <input
                        id="reported_registration_input"
                        type="text"
                        className="form-control"
                        placeholder="e.g., 14-digit FSSAI number if displayed on vendor cart/board"
                        name="reported_registration_number"
                        value={formData.reported_registration_number}
                        onChange={handleChange}
                      />
                      <span style={{ fontSize: "11px", color: "var(--color-muted)", marginTop: "3px", display: "block" }}>
                        Most small and roadside vendors may not have a displayed registration. Leave blank if not known.
                      </span>
                    </div>
                  </div>
                )}

                {/* 1. Grievance Category */}
                <div className="form-group">
                  <label className="form-label" htmlFor="category_select">
                    Grievance Classification <span style={{ color: "var(--color-error)" }}>*</span>
                  </label>
                  <select
                    id="category_select"
                    className="form-control"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Category</option>
                    {COMPLAINT_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Food Product Searchable */}
                <div className="form-group" style={{ position: "relative" }}>
                  <label className="form-label" htmlFor="product_name_input">
                    Food Commodity / Product Name <span style={{ color: "var(--color-error)" }}>*</span>
                  </label>
                  <input
                    id="product_name_input"
                    type="text"
                    className="form-control"
                    placeholder="Search or type product (e.g., Vadapav, Milk, Paneer, Samosa, Mustard Oil)..."
                    value={foodSearch}
                    onChange={(e) => {
                      setFoodSearch(e.target.value);
                      setFormData((p) => ({ ...p, product_name: e.target.value }));
                      setShowFoodDropdown(true);
                    }}
                    onFocus={() => setShowFoodDropdown(true)}
                    required
                  />

                  {showFoodDropdown && filteredFoods.length > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        zIndex: 20,
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-md)",
                        boxShadow: "var(--shadow-lg)",
                        maxHeight: "180px",
                        overflowY: "auto",
                        marginTop: "4px",
                      }}
                    >
                      {filteredFoods.slice(0, 15).map((food) => (
                        <div
                          key={food}
                          onClick={() => handleSelectFood(food)}
                          style={{
                            padding: "8px 12px",
                            cursor: "pointer",
                            fontSize: "var(--font-size-sm)",
                            borderBottom: "1px solid var(--color-surface-2)",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-2)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          {food}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Incident Date & City Location */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="incident_date_input">
                      Date of Purchase / Incident <span style={{ color: "var(--color-error)" }}>*</span>
                    </label>
                    <input
                      id="incident_date_input"
                      type="date"
                      className="form-control"
                      name="incident_date"
                      value={formData.incident_date}
                      onChange={handleChange}
                      max={new Date().toISOString().split("T")[0]}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="location_input">
                      City / District <span style={{ color: "var(--color-error)" }}>*</span>
                    </label>
                    <input
                      id="location_input"
                      type="text"
                      className="form-control"
                      placeholder="e.g., Pune, Mumbai, Nashik, Delhi"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                {/* 4. Detailed Description */}
                <div className="form-group">
                  <label className="form-label" htmlFor="description_textarea">
                    Factual Narrative of Grievance <span style={{ color: "var(--color-error)" }}>*</span>
                  </label>
                  <textarea
                    id="description_textarea"
                    className="form-control"
                    rows={4}
                    placeholder="Provide specific details: stall appearance, preparation hygiene, smell, foul taste, foreign items, physical health effects, or illness..."
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* 5. Food Photo Evidence */}
                <div className="form-group">
                  <label className="form-label">Photographic Evidence (Optional)</label>

                  {imagePreview ? (
                    <div
                      style={{
                        position: "relative",
                        display: "inline-block",
                        borderRadius: "var(--radius-md)",
                        overflow: "hidden",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      <img
                        src={imagePreview}
                        alt="Evidence preview"
                        style={{ height: "140px", objectFit: "cover", display: "block" }}
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        aria-label="Remove image"
                        style={{
                          position: "absolute",
                          top: "6px",
                          right: "6px",
                          background: "rgba(0,0,0,0.6)",
                          color: "white",
                          border: "none",
                          borderRadius: "50%",
                          width: "24px",
                          height: "24px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="food-image-input"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "var(--space-6)",
                        border: "2px dashed var(--color-border-dark)",
                        borderRadius: "var(--radius-lg)",
                        cursor: "pointer",
                        background: "var(--color-surface-2)",
                        transition: "var(--transition-fast)",
                      }}
                    >
                      <UploadCloud size={32} color="var(--color-primary)" style={{ marginBottom: "8px" }} />
                      <span style={{ fontWeight: "600", fontSize: "var(--font-size-sm)" }}>
                        Upload Food / Stall Photo
                      </span>
                      <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-muted)", marginTop: "4px" }}>
                        JPG, PNG, WEBP — up to 5 MB
                      </span>
                      <input
                        id="food-image-input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageChange}
                        style={{ display: "none" }}
                      />
                    </label>
                  )}
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  id="submit-complaint-btn"
                  className="btn btn-primary"
                  style={{ width: "100%", justifyContent: "center", padding: "12px" }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="spinner" style={{ width: "18px", height: "18px" }} />
                      <span>Transmitting Record...</span>
                    </>
                  ) : (
                    <>
                      <FilePlus2 size={18} />
                      <span>Submit Grievance to Authorities</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Right Guide Panel */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <div
                className="card"
                style={{
                  padding: "var(--space-5)",
                  background: "var(--color-surface)",
                  borderLeft: "4px solid var(--color-primary)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                  <Info size={18} color="var(--color-primary)" />
                  <h4 style={{ margin: 0, fontSize: "var(--font-size-md)" }}>
                    Filing Guidelines
                  </h4>
                </div>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: "18px",
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-secondary)",
                    lineHeight: "1.6",
                  }}
                >
                  <li>For roadside vendors, pinpoint adjacent landmarks (bus stop, market gate, pillar numbers).</li>
                  <li>Photos of the food stall, surrounding hygiene, and product help verify reports faster.</li>
                  <li>Purchase bills are helpful if available, but NOT required for roadside vendors or stalls.</li>
                  <li>Keep any packaging or food sample refrigerated if lab testing might be needed.</li>
                </ul>
              </div>

              <div
                className="card"
                style={{
                  padding: "var(--space-5)",
                  background: "var(--color-surface)",
                }}
              >
                <h4 style={{ margin: "0 0 10px", fontSize: "var(--font-size-md)" }}>
                  What happens next?
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "var(--font-size-xs)" }}>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <div
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        background: "var(--color-primary-light)",
                        color: "var(--color-primary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: "700",
                        flexShrink: 0,
                      }}
                    >
                      1
                    </div>
                    <div>
                      <strong>Administrative Triage:</strong> Officers review the location, hazard severity, and vendor details.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <div
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        background: "var(--color-primary-light)",
                        color: "var(--color-primary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: "700",
                        flexShrink: 0,
                      }}
                    >
                      2
                    </div>
                    <div>
                      <strong>Authority Referral:</strong> High-risk and street vendor cases are assigned to Food Safety Officers for on-site inspection.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <div
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        background: "var(--color-primary-light)",
                        color: "var(--color-primary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: "700",
                        flexShrink: 0,
                      }}
                    >
                      3
                    </div>
                    <div>
                      <strong>Enforcement & Resolution:</strong> Corrective measures, food sampling, or hygiene notices are issued.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default SubmitComplaint;