import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  AlertTriangle,
  Bug,
  Sparkles,
  Clock,
  FlaskConical,
  HelpCircle,
  Store,
  MapPin,
  Camera,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  Search,
  Upload,
  X,
  Home as HomeIcon,
  AlertCircle,
  FileText,
  Info,
} from "lucide-react";
import { useTranslation, useLanguage } from "../context/LanguageContext";
import LanguageSelector from "../components/LanguageSelector";
import VoiceComplaintInput from "../components/easy-complaint/VoiceComplaintInput";
import LocationSelector from "../components/easy-complaint/LocationSelector";
import { formatCoordinates } from "../services/locationService";
import { getApiUrl, authFetch } from "../services/authService";
import "./EasyComplaint.css";

// Category definitions mapped to backend categories
const CATEGORIES = [
  {
    key: "spoiled",
    backendCategory: "Expired Food",
    icon: AlertTriangle,
    iconColor: "#ea580c",
    bgColor: "#fff7ed",
  },
  {
    key: "insect",
    backendCategory: "Foreign Contaminant",
    icon: Bug,
    iconColor: "#dc2626",
    bgColor: "#fef2f2",
  },
  {
    key: "hygiene",
    backendCategory: "Poor Hygiene",
    icon: Sparkles,
    iconColor: "#d97706",
    bgColor: "#fffbeb",
  },
  {
    key: "expired",
    backendCategory: "Expired Food",
    icon: Clock,
    iconColor: "#7c3aed",
    bgColor: "#f5f3ff",
  },
  {
    key: "adulteration",
    backendCategory: "Food Adulteration",
    icon: FlaskConical,
    iconColor: "#0284c7",
    bgColor: "#f0f9ff",
  },
  {
    key: "other",
    backendCategory: "Other",
    icon: HelpCircle,
    iconColor: "#475569",
    bgColor: "#f8fafc",
  },
];

const SELLER_TYPES = [
  { key: "roadsideStall", value: "Roadside Food Stall" },
  { key: "foodCart", value: "Food Cart" },
  { key: "smallShop", value: "Small Shop" },
  { key: "restaurant", value: "Restaurant" },
  { key: "marketStall", value: "Temporary Market Stall" },
  { key: "other", value: "Other / Unknown" },
];

const COMMON_FOOD_SUGGESTIONS = [
  "वडापाव (Vadapav)",
  "दूध (Milk)",
  "पनीर (Paneer)",
  "समोसा (Samosa)",
  "पाणीपुरी (Pani Puri)",
  "बिर्याणी (Biryani)",
  "चहा (Tea)",
  "मिठाई (Sweets)",
  "तेल (Edible Oil)",
];

export default function EasyComplaint() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { language } = useLanguage();

  const [currentStep, setCurrentStep] = useState(1);
  const [shops, setShops] = useState([]);
  const [loadingShops, setLoadingShops] = useState(false);
  const [shopSearch, setShopSearch] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    categoryKey: "",
    customCategoryText: "",
    seller_listing_type: "UNLISTED", // Default to unlisted street vendor for easy reporting
    shop_id: "",
    seller_type: "Roadside Food Stall",
    reported_shop_name: "",
    reported_landmark: "",
    reported_address: "",
    reported_registration_number: "",
    latitude: null,
    longitude: null,
    location_accuracy: null,
    product_name: "",
    incident_date: new Date().toISOString().split("T")[0],
    description: "",
    confirmed: false,
  });

  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successComplaintId, setSuccessComplaintId] = useState(null);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef(null);

  // Load shops on mount for Step 2
  useEffect(() => {
    let mounted = true;
    const fetchShops = async () => {
      try {
        setLoadingShops(true);
        const res = await authFetch(`${getApiUrl()}/shops`);
        if (!res) return;
        const data = await res.json();
        if (mounted && data.success && Array.isArray(data.shops)) {
          setShops(data.shops.filter((s) => s.status === "ACTIVE"));
        }
      } catch (err) {
        console.error("Failed to load shops:", err);
      } finally {
        if (mounted) setLoadingShops(false);
      }
    };
    fetchShops();
    return () => {
      mounted = false;
    };
  }, []);

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep]);

  // Handle switching between Listed and Unlisted
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
        seller_type: "Roadside Food Stall",
      }));
    }
    setError("");
  };

  // Image upload handling
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError(t("errors.photoBadFormat"));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(t("errors.photoTooBig"));
      return;
    }

    setError("");
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemovePhoto = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Step 1 validation
  const validateStep1 = () => {
    if (!formData.categoryKey) {
      setError(t("errors.categoryRequired"));
      return false;
    }
    setError("");
    return true;
  };

  // Step 2 validation
  const validateStep2 = () => {
    if (formData.seller_listing_type === "LISTED") {
      if (!formData.shop_id) {
        setError(t("errors.shopRequired"));
        return false;
      }
    } else {
      if (!formData.seller_type) {
        setError(t("errors.sellerTypeRequired"));
        return false;
      }
      const hasCoords =
        formData.latitude !== null &&
        formData.latitude !== undefined &&
        formData.longitude !== null &&
        formData.longitude !== undefined;
      const hasLandmark = Boolean(
        (formData.reported_landmark && formData.reported_landmark.trim()) ||
        (formData.reported_address && formData.reported_address.trim())
      );
      if (!hasLandmark && !hasCoords) {
        setError(t("errors.landmarkRequired"));
        return false;
      }
    }
    setError("");
    return true;
  };

  // Step 3 validation
  const validateStep3 = () => {
    if (!formData.product_name.trim()) {
      setError(t("errors.productRequired"));
      return false;
    }
    if (!formData.description.trim() || formData.description.trim().length < 5) {
      setError(t("errors.descriptionRequired"));
      return false;
    }
    setError("");
    return true;
  };

  // Voice Assistant description confirmation handler
  const handleVoiceConfirmDescription = (voiceText, mode = "replace") => {
    setFormData((prev) => {
      let updated = "";
      if (mode === "append" && prev.description.trim()) {
        updated = `${prev.description.trim()} ${voiceText.trim()}`.trim();
      } else {
        updated = voiceText.trim();
      }
      return { ...prev, description: updated };
    });
    setError("");
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    } else if (currentStep === 3 && validateStep3()) {
      setCurrentStep(4);
    }
  };

  const handleBack = () => {
    setError("");
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Submit Complaint
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (submitting) return;

    if (!formData.confirmed) {
      setError(t("errors.confirmationRequired"));
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      // Map category to backend standard category
      const matchedCat = CATEGORIES.find((c) => c.key === formData.categoryKey);
      let backendCategory = matchedCat ? matchedCat.backendCategory : "Other";
      if (formData.categoryKey === "other" && formData.customCategoryText.trim()) {
        backendCategory = formData.customCategoryText.trim().slice(0, 100);
      }

      const payload = new FormData();
      payload.append("seller_listing_type", formData.seller_listing_type);
      payload.append("category", backendCategory);
      payload.append("product_name", formData.product_name.trim());
      payload.append("description", formData.description.trim());
      payload.append("incident_date", formData.incident_date);

      if (formData.seller_listing_type === "LISTED") {
        payload.append("shop_id", formData.shop_id);
        const selShop = shops.find((s) => String(s.id) === String(formData.shop_id));
        if (selShop) {
          payload.append("location", `${selShop.shop_name}, ${selShop.city || "Local"}`);
        }
      } else {
        payload.append("seller_type", formData.seller_type);
        const resolvedLocation =
          formData.reported_landmark.trim() ||
          formData.reported_address.trim() ||
          "Food Seller Location";
        payload.append("location", resolvedLocation);
        payload.append("reported_landmark", formData.reported_landmark.trim());

        if (formData.reported_shop_name.trim()) {
          payload.append("reported_shop_name", formData.reported_shop_name.trim());
        }
        if (formData.reported_address.trim()) {
          payload.append("reported_address", formData.reported_address.trim());
        }
        if (formData.reported_registration_number.trim()) {
          payload.append("reported_registration_number", formData.reported_registration_number.trim());
        }
        if (
          formData.latitude !== null &&
          formData.latitude !== undefined &&
          formData.longitude !== null &&
          formData.longitude !== undefined
        ) {
          payload.append("latitude", formData.latitude);
          payload.append("longitude", formData.longitude);
          if (formData.location_accuracy) {
            payload.append("location_accuracy", formData.location_accuracy);
          }
        }
      }

      if (image) {
        payload.append("food_image", image);
      }

      const response = await authFetch(`${getApiUrl()}/complaints`, {
        method: "POST",
        body: payload,
      });

      if (!response) {
        throw new Error(t("errors.genericSubmitError"));
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || t("errors.genericSubmitError"));
      }

      if (data.success && data.complaint) {
        setSuccessComplaintId(data.complaint.complaint_id || `CMP-${data.complaint.id}`);
        setCurrentStep(5); // Success step
      } else {
        throw new Error(data.message || t("errors.genericSubmitError"));
      }
    } catch (err) {
      console.error("Easy Complaint submission error:", err);
      setError(err.message || t("errors.genericSubmitError"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyId = () => {
    if (successComplaintId) {
      navigator.clipboard.writeText(successComplaintId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Filtered shops for listed selection
  const filteredShops = shops.filter((s) => {
    if (!shopSearch.trim()) return true;
    const q = shopSearch.toLowerCase();
    return (
      s.shop_name?.toLowerCase().includes(q) ||
      s.city?.toLowerCase().includes(q) ||
      s.license_number?.toLowerCase().includes(q)
    );
  });

  const selectedShopObj = shops.find((s) => String(s.id) === String(formData.shop_id));
  const selectedCategoryObj = CATEGORIES.find((c) => c.key === formData.categoryKey);

  return (
    <div className="easy-page">
      {/* Top Header */}
      <header className="easy-header">
        <div className="easy-header-inner">
          <Link to="/" className="easy-brand-link" aria-label="FoodSafe Easy Home">
            <div className="easy-brand-badge">
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="easy-brand-title">{t("brand.name")}</div>
              <span className="easy-brand-sub">{t("brand.tagline")}</span>
            </div>
          </Link>

          <div className="easy-header-actions">
            {/* Language Switcher */}
            <LanguageSelector />

            {/* Standard Mode Link */}
            <Link to="/submit-complaint" className="easy-standard-link">
              <FileText size={15} />
              <span>{t("nav.standardMode")}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Form Container */}
      <main className="easy-container">
        {/* Stepper (Steps 1 to 4 only) */}
        {currentStep <= 4 && (
          <nav className="easy-stepper" aria-label="Complaint Progress">
            <div className="easy-step-indicators" role="tablist">
              {[1, 2, 3, 4].map((stepNum) => {
                const isActive = currentStep === stepNum;
                const isCompleted = currentStep > stepNum;
                return (
                  <button
                    key={stepNum}
                    type="button"
                    className="easy-step-pill"
                    onClick={() => {
                      // Allow jumping backward to completed steps
                      if (stepNum < currentStep) {
                        setError("");
                        setCurrentStep(stepNum);
                      }
                    }}
                    disabled={stepNum > currentStep}
                    aria-current={isActive ? "step" : undefined}
                  >
                    <div
                      className={`easy-step-circle ${
                        isActive ? "active" : isCompleted ? "completed" : "upcoming"
                      }`}
                    >
                      {isCompleted ? <Check size={18} /> : stepNum}
                    </div>
                    <span className={`easy-step-title ${isActive ? "active" : ""}`}>
                      {t(`steps.step${stepNum}`)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Visual line progress */}
            <div className="easy-progress-bar-bg" aria-hidden="true">
              <div
                className="easy-progress-bar-fill"
                style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
              />
            </div>
          </nav>
        )}

        {/* Global Error Banner */}
        {error && (
          <div className="easy-error-banner" role="alert" aria-live="assertive">
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* ========================================================
            STEP 1: WHAT HAPPENED?
            ======================================================== */}
        {currentStep === 1 && (
          <section className="easy-card animate-fade-in" aria-labelledby="step1-heading">
            <div className="easy-step-heading">
              <h1 id="step1-heading" className="easy-step-title-text">
                {t("step1.title")}
              </h1>
              <p className="easy-step-subtitle-text">{t("step1.subtitle")}</p>
            </div>

            <div
              className="easy-category-grid"
              role="radiogroup"
              aria-labelledby="step1-heading"
            >
              {CATEGORIES.map((cat) => {
                const IconComponent = cat.icon;
                const isSelected = formData.categoryKey === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={`easy-cat-card ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, categoryKey: cat.key }));
                      setError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setFormData((prev) => ({ ...prev, categoryKey: cat.key }));
                        setError("");
                      }
                    }}
                  >
                    <div
                      className="easy-cat-icon"
                      style={{
                        background: isSelected ? "#16a34a" : cat.bgColor,
                        color: isSelected ? "#ffffff" : cat.iconColor,
                      }}
                    >
                      <IconComponent size={24} />
                    </div>
                    <div className="easy-cat-content">
                      <div className="easy-cat-title">
                        {t(`step1.categories.${cat.key}.title`)}
                      </div>
                      <div className="easy-cat-desc">
                        {t(`step1.categories.${cat.key}.desc`)}
                      </div>
                    </div>
                    <div className="easy-cat-check" aria-hidden="true">
                      <Check size={14} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom specification if 'other' chosen */}
            {formData.categoryKey === "other" && (
              <div className="easy-field-group" style={{ marginTop: "18px" }}>
                <label className="easy-field-label" htmlFor="custom-category-input">
                  {t("step1.categories.other.title")} — Details:
                </label>
                <input
                  id="custom-category-input"
                  type="text"
                  className="easy-input"
                  placeholder="Specify food safety concern..."
                  value={formData.customCategoryText}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, customCategoryText: e.target.value }))
                  }
                />
              </div>
            )}

            {/* Navigation */}
            <div className="easy-nav-bar">
              <Link to="/" className="easy-btn-back">
                <HomeIcon size={18} />
                <span>{t("nav.home")}</span>
              </Link>
              <button
                type="button"
                className="easy-btn-next"
                onClick={handleNext}
                disabled={!formData.categoryKey}
              >
                <span>{t("actions.next")}</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </section>
        )}

        {/* ========================================================
            STEP 2: WHERE DID IT HAPPEN?
            ======================================================== */}
        {currentStep === 2 && (
          <section className="easy-card animate-fade-in" aria-labelledby="step2-heading">
            <div className="easy-step-heading">
              <h1 id="step2-heading" className="easy-step-title-text">
                {t("step2.title")}
              </h1>
              <p className="easy-step-subtitle-text">{t("step2.subtitle")}</p>
            </div>

            {/* Choice 1: Listed Shop vs Choice 2: Roadside / Street Vendor */}
            <div className="easy-choice-grid">
              {/* Option A: Roadside / Unlisted */}
              <button
                type="button"
                className={`easy-choice-card ${
                  formData.seller_listing_type === "UNLISTED" ? "selected" : ""
                }`}
                onClick={() => handleListingTypeChange("UNLISTED")}
              >
                <div className="easy-choice-icon">
                  <MapPin size={24} />
                </div>
                <div style={{ textAlign: "left" }}>
                  <div className="easy-cat-title">
                    {t("step2.shopTypes.unlisted.title")}
                  </div>
                  <div className="easy-cat-desc">
                    {t("step2.shopTypes.unlisted.desc")}
                  </div>
                </div>
              </button>

              {/* Option B: Listed Shop */}
              <button
                type="button"
                className={`easy-choice-card ${
                  formData.seller_listing_type === "LISTED" ? "selected" : ""
                }`}
                onClick={() => handleListingTypeChange("LISTED")}
              >
                <div className="easy-choice-icon">
                  <Store size={24} />
                </div>
                <div style={{ textAlign: "left" }}>
                  <div className="easy-cat-title">
                    {t("step2.shopTypes.listed.title")}
                  </div>
                  <div className="easy-cat-desc">
                    {t("step2.shopTypes.listed.desc")}
                  </div>
                </div>
              </button>
            </div>

            {/* BRANCH A: UNLISTED SELLER / ROADSIDE STALL */}
            {formData.seller_listing_type === "UNLISTED" && (
              <div className="animate-fade-in">
                {/* Helpful reassurance notice */}
                <div className="easy-notice-box">
                  <Info size={20} style={{ color: "#2563eb", flexShrink: 0 }} />
                  <p className="easy-notice-text">
                    {t("step2.unlistedSection.notice")}
                  </p>
                </div>

                {/* Seller Type Selection */}
                <div className="easy-field-group">
                  <label className="easy-field-label">
                    {t("step2.unlistedSection.sellerTypeLabel")} <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <div className="easy-seller-type-grid">
                    {SELLER_TYPES.map((st) => {
                      const isSel = formData.seller_type === st.value;
                      return (
                        <button
                          key={st.key}
                          type="button"
                          className={`easy-seller-type-btn ${isSel ? "selected" : ""}`}
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, seller_type: st.value }));
                            setError("");
                          }}
                        >
                          <div
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: "50%",
                              border: `2px solid ${isSel ? "#16a34a" : "#cbd5e1"}`,
                              background: isSel ? "#16a34a" : "#ffffff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {isSel && <Check size={12} color="#ffffff" />}
                          </div>
                          <span>{t(`step2.unlistedSection.sellerTypes.${st.key}`)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* FoodSafe Location: Method selector, interactive map, & manual landmark */}
                <LocationSelector
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  locationAccuracy={formData.location_accuracy}
                  onCoordinatesChange={(lat, lng, acc) => {
                    setFormData((prev) => ({
                      ...prev,
                      latitude: lat,
                      longitude: lng,
                      location_accuracy: acc || null,
                    }));
                    setError("");
                  }}
                  onClearCoordinates={() => {
                    setFormData((prev) => ({
                      ...prev,
                      latitude: null,
                      longitude: null,
                      location_accuracy: null,
                    }));
                  }}
                  landmark={formData.reported_landmark}
                  onLandmarkChange={(val) => {
                    setFormData((prev) => ({ ...prev, reported_landmark: val }));
                    setError("");
                  }}
                  reportedAddress={formData.reported_address}
                  onAddressChange={(val) =>
                    setFormData((prev) => ({ ...prev, reported_address: val }))
                  }
                  sellerName={formData.reported_shop_name}
                  onSellerNameChange={(val) =>
                    setFormData((prev) => ({ ...prev, reported_shop_name: val }))
                  }
                  fssaiNumber={formData.reported_registration_number}
                  onFssaiChange={(val) =>
                    setFormData((prev) => ({ ...prev, reported_registration_number: val }))
                  }
                />
              </div>
            )}

            {/* BRANCH B: LISTED SHOP SELECTION */}
            {formData.seller_listing_type === "LISTED" && (
              <div className="animate-fade-in">
                <div className="easy-field-group">
                  <label className="easy-field-label" htmlFor="shop-search-input">
                    {t("step2.listedSection.searchPlaceholder")}
                  </label>
                  <div style={{ position: "relative" }}>
                    <Search
                      size={18}
                      style={{
                        position: "absolute",
                        left: 14,
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#94a3b8",
                      }}
                    />
                    <input
                      id="shop-search-input"
                      type="text"
                      className="easy-input"
                      style={{ paddingLeft: "42px" }}
                      placeholder="Type shop name, hotel, or city..."
                      value={shopSearch}
                      onChange={(e) => setShopSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="easy-field-group">
                  <label className="easy-field-label" htmlFor="shop-dropdown-select">
                    {t("step2.listedSection.selectShop")} <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <select
                    id="shop-dropdown-select"
                    className="easy-select"
                    value={formData.shop_id}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, shop_id: e.target.value }));
                      setError("");
                    }}
                    required
                  >
                    <option value="">
                      {loadingShops
                        ? "Loading shop list..."
                        : t("step2.listedSection.choosePlaceholder")}
                    </option>
                    {filteredShops.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.shop_name} — {s.city || "Local"} ({s.license_number || "Registered"})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedShopObj && (
                  <div
                    style={{
                      background: "#f0fdf4",
                      border: "1px solid #86efac",
                      borderRadius: 12,
                      padding: "14px 16px",
                      marginBottom: "18px",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <Store size={22} color="#16a34a" />
                    <div>
                      <div style={{ fontWeight: 800, color: "#166534" }}>
                        {selectedShopObj.shop_name}
                      </div>
                      <div style={{ fontSize: "12px", color: "#4b5563" }}>
                        {selectedShopObj.address || selectedShopObj.city} • FSSAI: {selectedShopObj.license_number || "On file"}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="easy-nav-bar">
              <button type="button" className="easy-btn-back" onClick={handleBack}>
                <ArrowLeft size={18} />
                <span>{t("actions.back")}</span>
              </button>
              <button type="button" className="easy-btn-next" onClick={handleNext}>
                <span>{t("actions.next")}</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </section>
        )}

        {/* ========================================================
            STEP 3: TELL US MORE & PHOTO EVIDENCE
            ======================================================== */}
        {currentStep === 3 && (
          <section className="easy-card animate-fade-in" aria-labelledby="step3-heading">
            <div className="easy-step-heading">
              <h1 id="step3-heading" className="easy-step-title-text">
                {t("step3.title")}
              </h1>
              <p className="easy-step-subtitle-text">{t("step3.subtitle")}</p>
            </div>

            {/* Food Item Name */}
            <div className="easy-field-group">
              <label className="easy-field-label" htmlFor="product-name-input">
                {t("step3.productLabel")} <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                id="product-name-input"
                type="text"
                className="easy-input"
                placeholder={t("step3.productPlaceholder")}
                value={formData.product_name}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, product_name: e.target.value }));
                  setError("");
                }}
                required
              />
              {/* Quick suggestion chips */}
              <div className="easy-chips-container" aria-label="Suggested common food items">
                {COMMON_FOOD_SUGGESTIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="easy-chip-btn"
                    onClick={() => {
                      const cleanName = item.split(" ")[0];
                      setFormData((prev) => ({ ...prev, product_name: cleanName }));
                      setError("");
                    }}
                  >
                    + {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Incident Date */}
            <div className="easy-field-group">
              <label className="easy-field-label" htmlFor="incident-date-input">
                {t("step3.incidentDateLabel")}
              </label>
              <input
                id="incident-date-input"
                type="date"
                className="easy-input"
                value={formData.incident_date}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, incident_date: e.target.value }))
                }
              />
            </div>

            {/* Voice Complaint Assistant (Optional Voice Input) */}
            <VoiceComplaintInput
              onConfirmDescription={handleVoiceConfirmDescription}
              existingDescription={formData.description}
            />

            {/* Description (Typing remains always available) */}
            <div className="easy-field-group">
              <label className="easy-field-label" htmlFor="description-input">
                {t("step3.descriptionLabel")} <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <textarea
                id="description-input"
                className="easy-textarea"
                rows={4}
                placeholder={t("step3.descriptionPlaceholder")}
                value={formData.description}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, description: e.target.value }));
                  setError("");
                }}
                required
              />
              <span className="easy-field-help">
                Write in your own words or use voice assistant above. Minimum 5 characters.
              </span>
            </div>

            {/* Photo Upload (Optional) */}
            <div className="easy-field-group">
              <label className="easy-field-label">
                {t("step3.photoLabel")}
              </label>
              <span className="easy-field-help" style={{ marginBottom: "10px" }}>
                {t("step3.photoHelp")}
              </span>

              <input
                ref={fileInputRef}
                id="photo-file-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />

              {imagePreview ? (
                <div className="easy-preview-container">
                  <img src={imagePreview} alt="Evidence preview" className="easy-preview-img" />
                  <button
                    type="button"
                    className="easy-remove-photo-btn"
                    onClick={handleRemovePhoto}
                    aria-label="Remove uploaded photo"
                  >
                    <X size={14} />
                    <span>{t("actions.removePhoto")}</span>
                  </button>
                </div>
              ) : (
                <div
                  className="easy-upload-box"
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                >
                  <Camera size={36} color="#64748b" style={{ margin: "0 auto 8px auto" }} />
                  <div style={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a" }}>
                    {t("actions.uploadPhoto")}
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "#64748b", marginTop: 4 }}>
                    Tap to take photo with camera or choose from gallery
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="easy-nav-bar">
              <button type="button" className="easy-btn-back" onClick={handleBack}>
                <ArrowLeft size={18} />
                <span>{t("actions.back")}</span>
              </button>
              <button type="button" className="easy-btn-next" onClick={handleNext}>
                <span>{t("actions.next")}</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </section>
        )}

        {/* ========================================================
            STEP 4: REVIEW AND SUBMIT
            ======================================================== */}
        {currentStep === 4 && (
          <section className="easy-card animate-fade-in" aria-labelledby="step4-heading">
            <div className="easy-step-heading">
              <h1 id="step4-heading" className="easy-step-title-text">
                {t("step4.title")}
              </h1>
              <p className="easy-step-subtitle-text">{t("step4.subtitle")}</p>
            </div>

            {/* Review Summary Card */}
            <div className="easy-summary-box">
              {/* Problem */}
              <div className="easy-summary-row">
                <span className="easy-summary-label">{t("step4.summary.problem")}</span>
                <div className="easy-summary-value" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {selectedCategoryObj && (
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 6,
                        background: "#dcfce7",
                        color: "#166534",
                        fontSize: "0.8125rem",
                        fontWeight: 700,
                      }}
                    >
                      {t(`step1.categories.${selectedCategoryObj.key}.title`)}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="easy-summary-edit-btn"
                  onClick={() => setCurrentStep(1)}
                >
                  {t("actions.edit")}
                </button>
              </div>

              {/* Food Item */}
              <div className="easy-summary-row">
                <span className="easy-summary-label">{t("step4.summary.foodItem")}</span>
                <span className="easy-summary-value">{formData.product_name}</span>
                <button
                  type="button"
                  className="easy-summary-edit-btn"
                  onClick={() => setCurrentStep(3)}
                >
                  {t("actions.edit")}
                </button>
              </div>

              {/* Seller */}
              <div className="easy-summary-row">
                <span className="easy-summary-label">{t("step4.summary.seller")}</span>
                <div className="easy-summary-value">
                  {formData.seller_listing_type === "LISTED" ? (
                    <div>
                      <strong>{selectedShopObj?.shop_name || "Listed Shop"}</strong>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>
                        {selectedShopObj?.city} • {selectedShopObj?.license_number || "FSSAI Registered"}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 6px",
                          borderRadius: 4,
                          fontSize: "11px",
                          fontWeight: 700,
                          background: "#fef3c7",
                          color: "#92400e",
                          marginBottom: 4,
                        }}
                      >
                        UNLISTED SELLER
                      </span>
                      <div>
                        {formData.reported_shop_name || "Unknown Stall / Vendor"} (
                        {formData.seller_type})
                      </div>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="easy-summary-edit-btn"
                  onClick={() => setCurrentStep(2)}
                >
                  {t("actions.edit")}
                </button>
              </div>

              {/* Location */}
              <div className="easy-summary-row">
                <span className="easy-summary-label">{t("step4.summary.location")}</span>
                <span className="easy-summary-value">
                  {formData.seller_listing_type === "LISTED" ? (
                    selectedShopObj?.address || selectedShopObj?.city || "Registered Address"
                  ) : (
                    <div>
                      <div>{formData.reported_landmark || "No landmark specified"}</div>
                      {formData.reported_address && (
                        <div style={{ fontSize: "12px", color: "#64748b" }}>
                          {formData.reported_address}
                        </div>
                      )}
                    </div>
                  )}
                </span>
                <button
                  type="button"
                  className="easy-summary-edit-btn"
                  onClick={() => setCurrentStep(2)}
                >
                  {t("actions.edit")}
                </button>
              </div>

              {/* GPS Coordinates */}
              <div className="easy-summary-row">
                <span className="easy-summary-label">{t("step4.summary.coordinates")}</span>
                <span className="easy-summary-value">
                  {formData.latitude !== null && formData.longitude !== null ? (
                    <span style={{ color: "#166534", fontWeight: 700 }}>
                      📍 {formatCoordinates(formData.latitude, formData.longitude)}
                      {formData.location_accuracy && ` (±${Math.round(formData.location_accuracy)}m)`}
                    </span>
                  ) : (
                    <span style={{ color: "#64748b" }}>{t("step4.summary.noCoordinates")}</span>
                  )}
                </span>
                <button
                  type="button"
                  className="easy-summary-edit-btn"
                  onClick={() => setCurrentStep(2)}
                >
                  {t("actions.edit")}
                </button>
              </div>

              {/* Date */}
              <div className="easy-summary-row">
                <span className="easy-summary-label">{t("step4.summary.date")}</span>
                <span className="easy-summary-value">{formData.incident_date}</span>
                <button
                  type="button"
                  className="easy-summary-edit-btn"
                  onClick={() => setCurrentStep(3)}
                >
                  {t("actions.edit")}
                </button>
              </div>

              {/* Description */}
              <div className="easy-summary-row">
                <span className="easy-summary-label">{t("step4.summary.description")}</span>
                <span className="easy-summary-value" style={{ fontStyle: "italic" }}>
                  "{formData.description}"
                </span>
                <button
                  type="button"
                  className="easy-summary-edit-btn"
                  onClick={() => setCurrentStep(3)}
                >
                  {t("actions.edit")}
                </button>
              </div>

              {/* Photo Evidence */}
              <div className="easy-summary-row">
                <span className="easy-summary-label">{t("step4.summary.photo")}</span>
                <div className="easy-summary-value">
                  {imagePreview ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <img
                        src={imagePreview}
                        alt="Evidence thumb"
                        style={{ width: 44, height: 44, borderRadius: 6, objectFit: "cover" }}
                      />
                      <span style={{ fontSize: "12px", color: "#166534", fontWeight: 700 }}>
                        {t("step4.summary.photoAttached")}
                      </span>
                    </div>
                  ) : (
                    <span style={{ color: "#64748b" }}>{t("step4.summary.noPhoto")}</span>
                  )}
                </div>
                <button
                  type="button"
                  className="easy-summary-edit-btn"
                  onClick={() => setCurrentStep(3)}
                >
                  {t("actions.edit")}
                </button>
              </div>
            </div>

            {/* Confirmation Checkbox */}
            <label className="easy-confirm-label">
              <input
                type="checkbox"
                className="easy-confirm-checkbox"
                checked={formData.confirmed}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, confirmed: e.target.checked }));
                  setError("");
                }}
              />
              <span className="easy-confirm-text">{t("step4.confirmation")}</span>
            </label>

            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: 20 }}>
              {t("step4.disclaimer")}
            </div>

            {/* Navigation */}
            <div className="easy-nav-bar">
              <button
                type="button"
                className="easy-btn-back"
                onClick={handleBack}
                disabled={submitting}
              >
                <ArrowLeft size={18} />
                <span>{t("actions.back")}</span>
              </button>
              <button
                type="button"
                className="easy-btn-next"
                onClick={handleSubmit}
                disabled={submitting || !formData.confirmed}
                style={{
                  background: submitting ? "#94a3b8" : "#16a34a",
                  borderColor: submitting ? "#64748b" : "#15803d",
                }}
              >
                {submitting ? (
                  <>
                    <span className="spin-icon" style={{ display: "inline-block" }}>
                      ⏳
                    </span>
                    <span>{t("actions.submitting")}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={20} />
                    <span>{t("actions.submit")}</span>
                  </>
                )}
              </button>
            </div>
          </section>
        )}

        {/* ========================================================
            STEP 5: COMPLAINT SUCCESS & TRACKING DETAILS
            ======================================================== */}
        {currentStep === 5 && (
          <section className="easy-card easy-success-card animate-fade-in" aria-live="polite">
            <div className="easy-success-badge" aria-hidden="true">
              <CheckCircle2 size={44} />
            </div>

            <h1 className="easy-step-title-text" style={{ fontSize: "1.875rem", marginBottom: 8 }}>
              {t("success.title")}
            </h1>
            <p className="easy-step-subtitle-text">{t("success.subtitle")}</p>

            {/* Prominent Complaint ID Container */}
            <div className="easy-id-container">
              <div style={{ fontSize: "0.8125rem", color: "#475569", fontWeight: 700, textTransform: "uppercase" }}>
                {t("success.complaintIdLabel")}
              </div>
              <div className="easy-id-value" id="generated-complaint-id">
                {successComplaintId}
              </div>
              <button
                type="button"
                className="easy-copy-btn"
                onClick={handleCopyId}
                aria-label="Copy Complaint ID"
              >
                {copied ? <Check size={16} color="#16a34a" /> : <Copy size={16} />}
                <span>{copied ? t("actions.copied") : t("actions.copyId")}</span>
              </button>
            </div>

            {/* What happens next box */}
            <div
              style={{
                maxWidth: 520,
                margin: "0 auto 24px auto",
                textAlign: "left",
                background: "#f8fafc",
                padding: "20px",
                borderRadius: 14,
                border: "1px solid #e2e8f0",
              }}
            >
              <h3 style={{ fontSize: "1rem", fontWeight: 800, margin: "0 0 12px 0", color: "#0f172a" }}>
                {t("success.nextStepsTitle")}
              </h3>
              <ul style={{ paddingLeft: 20, margin: 0, fontSize: "0.875rem", color: "#334155", lineHeight: 1.6 }}>
                <li>{t("success.step1Text")}</li>
                <li>{t("success.step2Text")}</li>
                <li>{t("success.step3Text")}</li>
              </ul>
            </div>

            {/* Legal disclaimer */}
            <p
              style={{
                fontSize: "0.75rem",
                color: "#64748b",
                maxWidth: 480,
                margin: "0 auto 24px auto",
                lineHeight: 1.4,
              }}
            >
              {t("success.disclaimer")}
            </p>

            {/* Action buttons */}
            <div className="easy-success-actions">
              <button
                type="button"
                className="easy-btn-next"
                style={{ margin: 0 }}
                onClick={() => navigate("/track-complaint")}
              >
                <Search size={18} />
                <span>{t("actions.trackComplaint")}</span>
              </button>

              <button
                type="button"
                className="easy-btn-back"
                onClick={() => navigate("/")}
              >
                <HomeIcon size={18} />
                <span>{t("actions.returnHome")}</span>
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
