/**
 * ADMIN MODULE — Appointment Pricing API (super admin only)
 * Endpoints under /api/admin/consultation-pricing
 */

import adminApi from "./adminService";

// 📋 Current price list + each country's currency →
// { pricing: { defaultPrice, countries: [{ countryIso, countryName, price, currency }], updatedAt },
//   currencies: { table: { IN: { currency: "INR", rate } }, fetchedAt } }
export const fetchConsultationPricing = async () => {
  const response = await adminApi.get("/admin/consultation-pricing");
  return response.data.data;
};

// ✏️ Save the whole price list (+ follow-up prices and rules)
export const saveConsultationPricing = async ({
  defaultPrice,
  countries,
  defaultFollowUpPrice,
  followUpWindowDays,
  maxFollowUpsPerCase,
}) => {
  const response = await adminApi.put("/admin/consultation-pricing", {
    defaultPrice,
    countries,
    defaultFollowUpPrice,
    followUpWindowDays,
    maxFollowUpsPerCase,
  });
  return response.data.data;
};
