import { useEffect, useState } from "react";
import { getToken, getApiUrl } from "../services/authService";

export default function ProtectedImage({
  src,
  alt = "Complaint evidence",
  className = "",
  style = {},
  fallbackText = "Evidence image unavailable",
}) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(Boolean(src));
  const [error, setError] = useState(!src);

  useEffect(() => {
    let active = true;
    let createdUrl = null;

    if (!src) {
      return;
    }

    const resolveFullUrl = (urlStr) => {
      if (urlStr.startsWith("http://") || urlStr.startsWith("https://")) {
        return urlStr;
      }
      const apiBase = getApiUrl().replace(/\/api\/?$/, "");
      return `${apiBase}${urlStr.startsWith("/") ? "" : "/"}${urlStr}`;
    };

    const fetchImage = async () => {
      try {
        const fullUrl = resolveFullUrl(src);
        const token = getToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const res = await fetch(fullUrl, { headers });

        if (!res.ok) {
          throw new Error(`Failed to load protected image (${res.status})`);
        }

        const blob = await res.blob();
        if (!active) return;

        createdUrl = URL.createObjectURL(blob);
        setBlobUrl(createdUrl);
        setLoading(false);
      } catch (err) {
        if (!active) return;
        console.warn("ProtectedImage fetch error:", err.message);
        setError(true);
        setLoading(false);
      }
    };

    fetchImage();

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [src]);

  if (loading) {
    return (
      <div
        className={className}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f1f5f9",
          color: "#64748b",
          fontSize: "12px",
          minHeight: "120px",
          borderRadius: "8px",
          ...style,
        }}
      >
        <span>📷 Loading evidence...</span>
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div
        className={className}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fef2f2",
          color: "#991b1b",
          fontSize: "12px",
          padding: "12px",
          minHeight: "80px",
          borderRadius: "8px",
          border: "1px dashed #fca5a5",
          textAlign: "center",
          ...style,
        }}
      >
        <span>⚠️ {fallbackText}</span>
      </div>
    );
  }

  return (
    <img
      src={blobUrl}
      alt={alt}
      className={className}
      style={style}
    />
  );
}
