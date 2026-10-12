import { useState, useCallback, useRef, useEffect } from "react";

/**
 * useGeolocation — Safe, permission-based single-reading browser geolocation hook
 *
 * Rules:
 * - NO continuous background tracking.
 * - Single reading only via navigator.geolocation.getCurrentPosition.
 * - Invoked strictly on explicit user interaction.
 * - Handles unsupported browsers, permission denials, timeouts, and unmount cleanup.
 */
export function useGeolocation() {
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);

  const isSupported =
    typeof window !== "undefined" &&
    Boolean(navigator && navigator.geolocation);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Request single location reading on explicit user action
   */
  const getCurrentPosition = useCallback(
    (options = {}) => {
      if (!isSupported) {
        setError("not-supported");
        return Promise.reject(new Error("Geolocation is not supported by your browser."));
      }

      setIsLoading(true);
      setError(null);

      const geoOptions = {
        enableHighAccuracy: true,
        timeout: options.timeout || 10000,
        maximumAge: 0, // Always fresh reading
        ...options,
      };

      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (!isMountedRef.current) return;
            const reading = {
              latitude: Number(position.coords.latitude.toFixed(7)),
              longitude: Number(position.coords.longitude.toFixed(7)),
              accuracy: Math.round(position.coords.accuracy || 0),
              timestamp: position.timestamp,
            };

            setLocation(reading);
            setIsLoading(false);
            setError(null);
            resolve(reading);
          },
          (err) => {
            if (!isMountedRef.current) return;
            setIsLoading(false);

            let errCode = "unavailable";
            if (err.code === 1) {
              errCode = "permission-denied";
            } else if (err.code === 3) {
              errCode = "timeout";
            }

            setError(errCode);
            reject(new Error(err.message || "Failed to retrieve location reading."));
          },
          geoOptions
        );
      });
    },
    [isSupported]
  );

  /**
   * Clear active location state
   */
  const clearLocation = useCallback(() => {
    setLocation(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    isSupported,
    isLoading,
    location,
    error,
    getCurrentPosition,
    clearLocation,
    setLocation,
  };
}

export default useGeolocation;
