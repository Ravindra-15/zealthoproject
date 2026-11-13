/**
 * CUSTOMER MODULE — My Cases API
 * A case = one health problem ("Case 2 · Fever") with its first appointment
 * and follow-ups. Follow-ups in a case are charged the follow-up price.
 *
 *  GET   /customer/cases            → { cases, prices: { newFee, followUpFee }, rules }
 *  PATCH /customer/cases/:id        → rename   { title }
 *  PATCH /customer/cases/:id/close  → close
 *  PATCH /customer/cases/:id/reopen → reopen
 */

import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// sessionStorage keys — the case picked for the booking in progress
export const BOOKING_CASE_KEY = "bookingCaseId";
export const BOOKING_CASE_TITLE_KEY = "bookingCaseTitle";

export const clearBookingCase = () => {
  sessionStorage.removeItem(BOOKING_CASE_KEY);
  sessionStorage.removeItem(BOOKING_CASE_TITLE_KEY);
};

export const fetchMyCases = async () => {
  const res = await api.get("/customer/cases");
  const d = res.data?.data || {};
  return { cases: Array.isArray(d.cases) ? d.cases : [], prices: d.prices || null, rules: d.rules || null };
};

export const renameMyCase = async (id, title) => (await api.patch(`/customer/cases/${id}`, { title })).data?.data?.case;
export const closeMyCase = async (id) => (await api.patch(`/customer/cases/${id}/close`)).data?.data?.case;
export const reopenMyCase = async (id) => (await api.patch(`/customer/cases/${id}/reopen`)).data?.data?.case;
