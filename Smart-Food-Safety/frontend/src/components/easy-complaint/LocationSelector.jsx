import { useState, useEffect } from "react";
import {
  MapPin,
  Navigation,
  Map as MapIcon,
  FileText,
  CheckCircle2,
  Trash2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Check,
  Compass,
} from "lucide-react";
import { useTranslation, useLanguage } from "../../context/LanguageContext";
import useGeolocation from "../../hooks/useGeolocation";
import LocationMap from "./LocationMap";
import {
  validateCoordinates,
  formatCoordinates,
  DEFAULT_MAP_CENTER,
} from "../../services/locationService";

/**
 * FoodSafe Location — दुकानाचे ठिकाण निवडा
 * Multilingual, mobile-first location selection panel supporting:
 * 1. Current Location (permission-based, adjustable, requires seller confirmation)
 * 2. Interactive Map (clickable & draggable marker)
 * 3. Manual Landmark (works 100% without GPS or location permissions)
 */
export default function LocationSelector({
  latitude = null,
  longitude = null,
  locationAccuracy = null,
  onCoordinatesChange,
  onClearCoordinates,
  landmark = "",
  onLandmarkChange,
  reportedAddress = "",
  onAddressChange,
  sellerName = "",
  onSellerNameChange,
  fssaiNumber = "",
  onFssaiChange,
}) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  // Active method tab: 'CURRENT' | 'MAP' | 'MANUAL'
  const [activeMethod, setActiveMethod] = useState(() => {
    return validateCoordinates(latitude, longitude) ? "MAP" : "CURRENT";
  });

  // Working / tentative coordinates before user confirms seller spot
  const [tentativeCoords, setTentativeCoords] = useState(() => {
    if (validateCoordinates(latitude, longitude)) {
      return {
        lat: Number(latitude),
        lng: Number(longitude),
        accuracy: locationAccuracy,
      };
    }
    return null;
  });

  // Track if location is confirmed by the user
  const [isConfirmed, setIsConfirmed] = useState(() => {
    return validateCoordinates(latitude, longitude);
  });

  const {
    isSupported: isGeoSupported,
    isLoading: isGeoLoading,
    error: geoError,
    getCurrentPosition,
  } = useGeolocation();

  // Sync external coordinates changes
  useEffect(() => {
    if (validateCoordinates(latitude, longitude)) {
      setTentativeCoords({
        lat: Number(latitude),
        lng: Number(longitude),
        accuracy: locationAccuracy,
      });
      setIsConfirmed(true);
    }
  }, [latitude, longitude, locationAccuracy]);

  // Handle Option A: Use Current Location
  const handleDetectCurrentLocation = async () => {
    try {
      const reading = await getCurrentPosition({ timeout: 12000 });
      setTentativeCoords({
        lat: reading.latitude,
        lng: reading.longitude,
        accuracy: reading.accuracy,
      });
      setIsConfirmed(false); // Customer must verify and confirm seller location!
    } catch {
      // Error handled via geoError state
    }
  };

  // Handle Map Pin movement
  const handleMapPinChange = (newLat, newLng, newAccuracy) => {
    setTentativeCoords({
      lat: newLat,
      lng: newLng,
      accuracy: newAccuracy || null,
    });
    setIsConfirmed(false); // Requires user confirmation
  };

  // Confirm tentative location
  const handleConfirmLocation = () => {
    if (tentativeCoords && validateCoordinates(tentativeCoords.lat, tentativeCoords.lng)) {
      setIsConfirmed(true);
      if (onCoordinatesChange) {
        onCoordinatesChange(
          tentativeCoords.lat,
          tentativeCoords.lng,
          tentativeCoords.accuracy
        );
      }
    }
  };

  // Clear / remove coordinates
  const handleRemoveCoordinates = () => {
    setTentativeCoords(null);
    setIsConfirmed(false);
    if (onClearCoordinates) {
      onClearCoordinates();
    }
  };

  // Switch location method
  const handleSwitchMethod = (method) => {
    setActiveMethod(method);
    // If switching to map and no tentative coords, default to Maharashtra center
    if (method === "MAP" && !tentativeCoords) {
      setTentativeCoords({
        lat: DEFAULT_MAP_CENTER[0],
        lng: DEFAULT_MAP_CENTER[1],
        accuracy: null,
      });
      setIsConfirmed(false);
    }
  };

  const hasConfirmedCoords =
    isConfirmed &&
    tentativeCoords &&
    validateCoordinates(tentativeCoords.lat, tentativeCoords.lng);

  return (
    <div className="easy-location-card" role="region" aria-label={t("location.title")}>
      {/* Location Section Heading */}
      <div className="easy-location-header">
        <div className="easy-location-badge">
          <Compass size={16} />
          <span>FoodSafe Location</span>
        </div>
        <h3 className="easy-location-title">{t("location.title")}</h3>
        <p className="easy-location-subtitle">{t("location.subtitle")}</p>
      </div>

      {/* Method Selector Tabs */}
      <div className="easy-location-tabs" role="tablist">
        {/* Tab 1: Current Location */}
        <button
          type="button"
          role="tab"
          aria-selected={activeMethod === "CURRENT"}
          className={`easy-location-tab-btn ${activeMethod === "CURRENT" ? "active" : ""}`}
          onClick={() => handleSwitchMethod("CURRENT")}
        >
          <Navigation size={18} />
          <span>{t("location.tabCurrent")}</span>
        </button>

        {/* Tab 2: Map Pin */}
        <button
          type="button"
          role="tab"
          aria-selected={activeMethod === "MAP"}
          className={`easy-location-tab-btn ${activeMethod === "MAP" ? "active" : ""}`}
          onClick={() => handleSwitchMethod("MAP")}
        >
          <MapIcon size={18} />
          <span>{t("location.tabMap")}</span>
        </button>

        {/* Tab 3: Landmark / Manual */}
        <button
          type="button"
          role="tab"
          aria-selected={activeMethod === "MANUAL"}
          className={`easy-location-tab-btn ${activeMethod === "MANUAL" ? "active" : ""}`}
          onClick={() => handleSwitchMethod("MANUAL")}
        >
          <FileText size={18} />
          <span>{t("location.tabManual")}</span>
        </button>
      </div>

      {/* ====================================================================
          METHOD 1: USE CURRENT LOCATION
          ==================================================================== */}
      {activeMethod === "CURRENT" && (
        <div className="easy-location-pane animate-fade-in">
          <div className="easy-location-notice-box">
            <ShieldCheck size={20} color="#16a34a" style={{ flexShrink: 0 }} />
            <p className="easy-location-notice-text">
              {t("location.permissionNotice")}
            </p>
          </div>

          {/* Trigger Button */}
          <div style={{ marginBottom: "16px" }}>
            <button
              type="button"
              className="easy-location-action-btn primary large"
              onClick={handleDetectCurrentLocation}
              disabled={isGeoLoading || !isGeoSupported}
            >
              {isGeoLoading ? (
                <>
                  <RefreshCw size={20} className="animate-spin" />
                  <span>{t("location.detectingLocation")}</span>
                </>
              ) : (
                <>
                  <Navigation size={20} />
                  <span>{t("location.currentLocationBtn")}</span>
                </>
              )}
            </button>
          </div>

          {/* Geolocation Errors */}
          {!isGeoSupported && (
            <div className="easy-voice-alert warning" role="alert">
              <AlertCircle size={18} />
              <span>{t("location.errors.notSupported")}</span>
            </div>
          )}

          {geoError === "permission-denied" && (
            <div className="easy-voice-alert error" role="alert">
              <AlertCircle size={18} />
              <span>{t("location.errors.permissionDenied")}</span>
            </div>
          )}

          {geoError === "timeout" && (
            <div className="easy-voice-alert warning" role="alert">
              <AlertCircle size={18} />
              <span>{t("location.errors.timeout")}</span>
            </div>
          )}

          {geoError === "unavailable" && (
            <div className="easy-voice-alert warning" role="alert">
              <AlertCircle size={18} />
              <span>{t("location.errors.unavailable")}</span>
            </div>
          )}

          {/* Map Preview when coordinates detected */}
          {tentativeCoords && (
            <div className="easy-location-map-wrap animate-fade-in">
              <div className="easy-location-map-hint">
                <MapPin size={16} color="#16a34a" />
                <span>{t("location.locationFound")}</span>
              </div>

              <LocationMap
                latitude={tentativeCoords.lat}
                longitude={tentativeCoords.lng}
                accuracy={tentativeCoords.accuracy}
                onLocationChange={handleMapPinChange}
              />

              <div className="easy-location-confirm-bar">
                <div className="easy-coords-display">
                  <strong>{formatCoordinates(tentativeCoords.lat, tentativeCoords.lng)}</strong>
                  {tentativeCoords.accuracy && (
                    <span className="easy-accuracy-badge">
                      ±{tentativeCoords.accuracy}m
                    </span>
                  )}
                </div>

                {!isConfirmed ? (
                  <button
                    type="button"
                    className="easy-location-action-btn success"
                    onClick={handleConfirmLocation}
                  >
                    <Check size={18} />
                    <span>{t("location.confirmLocation")}</span>
                  </button>
                ) : (
                  <div className="easy-confirmed-pill">
                    <CheckCircle2 size={16} />
                    <span>{t("location.locationConfirmed")}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
          METHOD 2: SELECT ON MAP
          ==================================================================== */}
      {activeMethod === "MAP" && (
        <div className="easy-location-pane animate-fade-in">
          <div className="easy-location-map-hint">
            <MapPin size={16} color="#16a34a" />
            <span>{t("location.mapHint")}</span>
          </div>

          <LocationMap
            latitude={tentativeCoords?.lat || DEFAULT_MAP_CENTER[0]}
            longitude={tentativeCoords?.lng || DEFAULT_MAP_CENTER[1]}
            accuracy={tentativeCoords?.accuracy}
            onLocationChange={handleMapPinChange}
          />

          <div className="easy-location-confirm-bar">
            <div className="easy-coords-display">
              <strong>
                {tentativeCoords
                  ? formatCoordinates(tentativeCoords.lat, tentativeCoords.lng)
                  : "Tap on map to place pin"}
              </strong>
            </div>

            {tentativeCoords && !isConfirmed && (
              <button
                type="button"
                className="easy-location-action-btn success"
                onClick={handleConfirmLocation}
              >
                <Check size={18} />
                <span>{t("location.confirmLocation")}</span>
              </button>
            )}

            {hasConfirmedCoords && (
              <div className="easy-confirmed-pill">
                <CheckCircle2 size={16} />
                <span>{t("location.locationConfirmed")}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          CONFIRMED LOCATION SUMMARY BAR
          ==================================================================== */}
      {hasConfirmedCoords && (
        <div className="easy-location-summary-card animate-fade-in">
          <div className="easy-summary-pin-icon">
            <MapPin size={22} color="#16a34a" />
          </div>
          <div className="easy-summary-details">
            <div className="easy-summary-title">
              {t("location.locationConfirmed")}
            </div>
            <div className="easy-summary-coords">
              {formatCoordinates(tentativeCoords.lat, tentativeCoords.lng)}
              {tentativeCoords.accuracy && (
                <span style={{ marginLeft: 8, fontSize: "0.75rem", color: "#64748b" }}>
                  (±{tentativeCoords.accuracy}m)
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            className="easy-remove-coords-btn"
            onClick={handleRemoveCoordinates}
            aria-label={t("location.clearLocation")}
          >
            <Trash2 size={16} />
            <span>{t("location.clearLocation")}</span>
          </button>
        </div>
      )}

      {/* ====================================================================
          METHOD 3 / MANUAL LANDMARK & DETAILS (ALWAYS AVAILABLE)
          ==================================================================== */}
      <div className="easy-manual-location-section">
        {/* Landmark Input (Mandatory if no coordinates) */}
        <div className="easy-field-group">
          <label className="easy-field-label" htmlFor="landmark-input">
            {t("step2.unlistedSection.landmarkLabel")}{" "}
            {!hasConfirmedCoords && <span style={{ color: "#dc2626" }}>*</span>}
          </label>
          <input
            id="landmark-input"
            type="text"
            className="easy-input"
            placeholder={t("step2.unlistedSection.landmarkPlaceholder")}
            value={landmark}
            onChange={(e) => onLandmarkChange(e.target.value)}
            required={!hasConfirmedCoords}
          />
          <span className="easy-field-help">
            Nearby landmark (bus depot, temple, station, school, market crossing).
          </span>
        </div>

        {/* Stall Name (Optional) */}
        <div className="easy-field-group">
          <label className="easy-field-label" htmlFor="stall-name-input">
            {t("step2.unlistedSection.shopNameLabel")}
          </label>
          <input
            id="stall-name-input"
            type="text"
            className="easy-input"
            placeholder={t("step2.unlistedSection.shopNamePlaceholder")}
            value={sellerName}
            onChange={(e) => onSellerNameChange(e.target.value)}
          />
        </div>

        {/* Street Address / Area (Optional) */}
        <div className="easy-field-group">
          <label className="easy-field-label" htmlFor="address-input">
            {t("step2.unlistedSection.addressLabel")}
          </label>
          <input
            id="address-input"
            type="text"
            className="easy-input"
            placeholder={t("step2.unlistedSection.addressPlaceholder")}
            value={reportedAddress}
            onChange={(e) => onAddressChange(e.target.value)}
          />
        </div>

        {/* FSSAI Registration Number (Optional) */}
        <div className="easy-field-group">
          <label className="easy-field-label" htmlFor="fssai-input">
            {t("step2.unlistedSection.fssaiLabel")}
          </label>
          <input
            id="fssai-input"
            type="text"
            className="easy-input"
            placeholder={t("step2.unlistedSection.fssaiPlaceholder")}
            value={fssaiNumber}
            onChange={(e) => onFssaiChange(e.target.value)}
          />
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="easy-voice-privacy" style={{ marginTop: "16px" }}>
        <ShieldCheck size={16} className="easy-voice-privacy-icon" />
        <span>{t("location.privacyNotice")}</span>
      </div>
    </div>
  );
}
