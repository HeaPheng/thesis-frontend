import axios from "axios";

// CRA uses process.env.REACT_APP_*
const BASE_URL =
  process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { Accept: "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("auth-changed"));
      if (window.location.pathname !== "/login") window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ---- Existing endpoints ----
export const activityPing = () => api.post("/activity/ping");
export const getUnseenMilestone = () => api.get("/xp/milestones/unseen");
export const markMilestoneSeen = (id) => api.post(`/xp/milestones/${id}/seen`);

// Optional helper (if you have /auth/me)
export const getMe = () => api.get("/auth/me");

export const getXpTransactions = (params = {}) => api.get("/xp/transactions", { params });



export default api;
// ---- Avatar Shop ----
export const getAvatarShop = () => api.get("/shop/avatar-items");
export const purchaseAvatarItem = (id) => api.post(`/shop/avatar-items/${id}/purchase`);
export const equipAvatarItem = (id) => api.post(`/shop/avatar-items/${id}/equip`);

