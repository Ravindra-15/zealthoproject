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

// ✏️ Save the whole price list
export const saveConsultationPricing = async ({ defaultPrice, countries }) => {
  const response = await adminApi.put("/admin/consultation-pricing", { defaultPrice, countries });
  return response.data.data;
};
