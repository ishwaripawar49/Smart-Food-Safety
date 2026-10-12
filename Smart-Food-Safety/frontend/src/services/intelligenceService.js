const API_URL = (import.meta.env && import.meta.env.VITE_API_URL) || "http://localhost:5000/api";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Fetch spatially aggregated hotspot clusters with filters
 */
export async function fetchHotspots({ days = "all", category = "", status = "", minThreshold = 1 } = {}) {
  const params = new URLSearchParams();
  if (days) params.set("days", days);
  if (category) params.set("category", category);
  if (status) params.set("status", status);
  if (minThreshold) params.set("minThreshold", minThreshold);

  const res = await fetch(`${API_URL}/intelligence/hotspots?${params.toString()}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch hotspot analytics");
  }
  return data.data;
}

/**
 * Fetch potential duplicate complaints review queue
 */
export async function fetchDuplicateQueue({ status = "PENDING", limit = 50, rescan = false } = {}) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (limit) params.set("limit", limit);
  if (rescan) params.set("rescan", "true");

  const res = await fetch(`${API_URL}/intelligence/duplicates?${params.toString()}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch duplicate review queue");
  }
  return data.data;
}

/**
 * Submit an authorized human duplicate review decision
 */
export async function submitDuplicateReview({
  review_id,
  source_complaint_id,
  target_complaint_id,
  review_status,
  review_notes = "",
}) {
  const res = await fetch(`${API_URL}/intelligence/duplicates/review`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      review_id,
      source_complaint_id,
      target_complaint_id,
      review_status,
      review_notes,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to record duplicate review");
  }
  return data;
}

/**
 * Fetch explainable risk assessment and factor breakdown for a specific complaint
 */
export async function fetchExplainableRisk(complaintId) {
  const res = await fetch(`${API_URL}/intelligence/risk/${encodeURIComponent(complaintId)}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch risk assessment");
  }
  return data.data;
}

/**
 * Submit an authorized manual priority override with documented rationale
 */
export async function submitPriorityOverride(complaintId, { manual_priority, override_reason }) {
  const res = await fetch(`${API_URL}/intelligence/risk/${encodeURIComponent(complaintId)}/override`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      manual_priority,
      override_reason,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to submit priority override");
  }
  return data;
}

/**
 * Fetch executive intelligence summary KPIs
 */
export async function fetchIntelligenceOverview() {
  const res = await fetch(`${API_URL}/intelligence/overview`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch intelligence overview");
  }
  return data.data;
}

/**
 * Fetch aggregated grievance trends
 */
export async function fetchIntelligenceTrends() {
  const res = await fetch(`${API_URL}/intelligence/trends`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch trends");
  }
  return data.data;
}
