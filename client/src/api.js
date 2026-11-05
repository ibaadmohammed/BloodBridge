// In development, Vite proxies /api to Express, so the base is empty.
// In production on Vercel, set VITE_API_URL to your backend URL (no trailing slash, no /api).
const BASE = (import.meta.env.VITE_API_URL || "") + "/api";

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function qs(params = {}) {
  const clean = Object.entries(params).filter(([, v]) => v !== undefined && v !== "");
  return new URLSearchParams(clean).toString();
}

export const api = {
  getDonors: (params = {}) => request(`/donors?${qs(params)}`),
  registerDonor: (payload) => request("/donors", { method: "POST", body: JSON.stringify(payload) }),
  updateDonor: (id, payload) => request(`/donors/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),

  getEligibilityQuestions: () => request("/eligibility/questions"),
  checkEligibility: (payload) => request("/eligibility/check", { method: "POST", body: JSON.stringify(payload) }),

  getRequests: (params = {}) => request(`/requests?${qs(params)}`),
  createRequest: (payload) => request("/requests", { method: "POST", body: JSON.stringify(payload) }),
  updateRequest: (id, payload) => request(`/requests/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),

  getBloodBanks: () => request("/bloodbanks"),
  getStats: () => request("/stats"),
};
