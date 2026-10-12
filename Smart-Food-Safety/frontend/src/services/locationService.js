/**
 * Location Service & Geographic Utilities for FoodSafe AI
 */

export const DEFAULT_MAP_CENTER = [19.076, 72.8777]; // Mumbai, Maharashtra default
export const DEFAULT_MAP_ZOOM = 13;

/**
 * Validate geographic coordinate ranges
 */
export function validateCoordinates(lat, lng) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return false;
  }
  const nLat = Number(lat);
  const nLng = Number(lng);
  if (!Number.isFinite(nLat) || !Number.isFinite(nLng) || isNaN(nLat) || isNaN(nLng)) {
    return false;
  }
  return nLat >= -90 && nLat <= 90 && nLng >= -180 && nLng <= 180;
}

/**
 * Format coordinates for human-readable display
 */
export function formatCoordinates(lat, lng) {
  if (!validateCoordinates(lat, lng)) return "Coordinates not set";
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${Math.abs(Number(lat)).toFixed(5)}° ${latDir}, ${Math.abs(Number(lng)).toFixed(5)}° ${lngDir}`;
}

/**
 * Generate safe external OpenStreetMap URL (no user tracking or secret keys)
 */
export function getOpenStreetMapUrl(lat, lng, zoom = 16) {
  if (!validateCoordinates(lat, lng)) return null;
  return `https://www.openstreetmap.org/?mlat=${Number(lat).toFixed(6)}&mlon=${Number(lng).toFixed(6)}#map=${zoom}/${Number(lat).toFixed(6)}/${Number(lng).toFixed(6)}`;
}

/**
 * Preset common city coordinates in Maharashtra / India for fast regional map centering
 */
export const PRESET_REGIONAL_CENTERS = {
  mumbai: { lat: 19.076, lng: 72.8777, label: "Mumbai" },
  pune: { lat: 18.5204, lng: 73.8567, label: "Pune" },
  nashik: { lat: 19.9975, lng: 73.7898, label: "Nashik / Yeola" },
  nagpur: { lat: 21.1458, lng: 79.0882, label: "Nagpur" },
  aurangabad: { lat: 19.8762, lng: 75.3433, label: "Chhatrapati Sambhajinagar" },
  delhi: { lat: 28.6139, lng: 77.209, label: "Delhi NCR" },
};
