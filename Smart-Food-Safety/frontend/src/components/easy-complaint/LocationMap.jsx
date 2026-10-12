import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, AlertCircle, RefreshCw } from "lucide-react";
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, validateCoordinates } from "../../services/locationService";

/**
 * Custom high-visibility SVG pin for Leaflet
 */
const createCustomPinIcon = () => {
  return L.divIcon({
    className: "easy-map-custom-pin",
    html: `
      <div style="
        width: 36px;
        height: 36px;
        background: #16a34a;
        border: 3px solid #ffffff;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 12px rgba(22, 163, 74, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: grab;
      ">
        <div style="
          width: 12px;
          height: 12px;
          background: #ffffff;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
};

export default function LocationMap({
  latitude,
  longitude,
  accuracy = null,
  onLocationChange,
  readOnly = false,
  zoom = DEFAULT_MAP_ZOOM,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [tileError, setTileError] = useState(false);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialCenter =
      validateCoordinates(latitude, longitude)
        ? [Number(latitude), Number(longitude)]
        : DEFAULT_MAP_CENTER;

    const initialZoom = validateCoordinates(latitude, longitude) ? 15 : zoom;

    try {
      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: initialZoom,
        scrollWheelZoom: false, // Prevent page scroll interception
        touchZoom: true,
        zoomControl: true,
      });

      const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      });

      tileLayer.on("tileerror", () => {
        setTileError(true);
      });

      tileLayer.on("load", () => {
        setTileError(false);
      });

      tileLayer.addTo(map);

      // Handle map click/tap to place or move marker
      if (!readOnly && onLocationChange) {
        map.on("click", (e) => {
          const newLat = Number(e.latlng.lat.toFixed(7));
          const newLng = Number(e.latlng.lng.toFixed(7));
          onLocationChange(newLat, newLng, null);
        });
      }

      mapInstanceRef.current = map;
      setMapLoaded(true);

      // Invalidate size after layout mounts
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 200);

      return () => {
        map.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
      };
    } catch (err) {
      console.error("Leaflet map initialization failed:", err);
      setTileError(true);
    }
  }, []); // Run once on mount

  // Sync Marker & Accuracy Circle when latitude/longitude props change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const hasValidCoords = validateCoordinates(latitude, longitude);

    if (hasValidCoords) {
      const latNum = Number(latitude);
      const lngNum = Number(longitude);
      const latLng = [latNum, lngNum];

      // Update or create marker
      if (!markerRef.current) {
        const marker = L.marker(latLng, {
          icon: createCustomPinIcon(),
          draggable: !readOnly,
          autoPan: true,
        });

        if (!readOnly && onLocationChange) {
          marker.on("dragend", (e) => {
            const pos = e.target.getLatLng();
            onLocationChange(
              Number(pos.lat.toFixed(7)),
              Number(pos.lng.toFixed(7)),
              accuracy
            );
          });
        }

        marker.addTo(map);
        markerRef.current = marker;
      } else {
        markerRef.current.setLatLng(latLng);
      }

      // Update or create accuracy circle
      if (accuracy && accuracy > 0) {
        if (!circleRef.current) {
          circleRef.current = L.circle(latLng, {
            radius: accuracy,
            color: "#16a34a",
            fillColor: "#86efac",
            fillOpacity: 0.15,
            weight: 1.5,
          }).addTo(map);
        } else {
          circleRef.current.setLatLng(latLng);
          circleRef.current.setRadius(accuracy);
        }
      } else if (circleRef.current) {
        circleRef.current.remove();
        circleRef.current = null;
      }

      // Pan to marker smoothly
      map.setView(latLng, Math.max(map.getZoom(), 15));
    } else {
      // Remove marker if coordinates cleared
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      if (circleRef.current) {
        circleRef.current.remove();
        circleRef.current = null;
      }
    }
  }, [latitude, longitude, accuracy, readOnly, onLocationChange]);

  return (
    <div className="easy-map-wrapper">
      {/* Map Canvas */}
      <div
        ref={mapContainerRef}
        className="easy-map-container"
        role="region"
        aria-label="Interactive Seller Location Map"
      />

      {/* Map Tile Loading Indicator */}
      {!mapLoaded && (
        <div className="easy-map-overlay-loading" aria-live="polite">
          <RefreshCw size={24} className="animate-spin" color="#16a34a" />
          <span>Loading interactive map...</span>
        </div>
      )}

      {/* Tile Error Fallback Notice */}
      {tileError && (
        <div className="easy-map-overlay-error" role="alert">
          <AlertCircle size={18} color="#dc2626" />
          <span>
            Map tiles loading slowly or offline. You can still pinpoint or enter landmark manually.
          </span>
        </div>
      )}
    </div>
  );
}
