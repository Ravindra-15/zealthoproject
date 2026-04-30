import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // e.g. http://localhost:5000/api
  withCredentials: true, // 🔥 important for cookies (future use)
});

// ============================================
// 🔐 REQUEST INTERCEPTOR (Attach Token)
// ============================================
API.interceptors.request.use(
  (req) => {
    const token =
      localStorage.getItem("token") ||
      sessionStorage.getItem("token");

    if (token) {
      req.headers.Authorization = `Bearer ${token}`;
    }

    return req;
  },
  (error) => Promise.reject(error)
);

// ============================================
// ⚠️ RESPONSE INTERCEPTOR (Handle Errors)
// ============================================
API.interceptors.response.use(
  (res) => res,
  (error) => {
    // 🔴 Auto logout if token expired
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");

      // optional redirect
      window.location.href = "/";
    }

    return Promise.reject(error);
  }
);

export default API;