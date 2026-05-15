import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const authApi = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

authApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("doctorToken") || sessionStorage.getItem("doctorToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const fetchDoctorDashboard = async () => {
  const response = await authApi.get("/doctor/dashboard");
  return response.data.data;
};