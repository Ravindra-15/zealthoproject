/**
 * ============================================
 * ADMIN MODULE — Program Plan API Service
 * ============================================
 * Manages CRUD for subscription plans per program.
 * All endpoints are admin-protected (uses adminApi instance).
 *
 * Used by:
 *  - SubscriptionConfigurator (list page)
 *  - AddEditPlan (create/edit page)
 * ============================================
 */

import adminApi from "./adminService";

// ============================================
// 📋 LIST PLANS FOR A PROGRAM
// ============================================
/**
 * @param {string} programId - yogat20 | diabmukt | mommyfit | slimfitter
 * @returns Promise<{ plans: Array<Plan> }>
 */
export const listPlans = async (programId) => {
  const response = await adminApi.get("/admin/program-plans", {
    params: { programId },
  });
  return response.data.data;
};

// ============================================
// 🔎 GET ONE PLAN BY ID
// ============================================
export const getPlanById = async (id) => {
  const response = await adminApi.get(`/admin/program-plans/${id}`);
  return response.data.data.plan;
};

// ============================================
// ➕ CREATE PLAN
// ============================================
/**
 * @param {Object} payload
 * @param {string} payload.programId
 * @param {string} payload.planName
 * @param {number} payload.originalPrice
 * @param {number} payload.offerPrice
 * @param {string} [payload.offerBadge]
 * @param {number} [payload.displayOrder]
 * @param {boolean} [payload.isVisibleOnLanding]
 * @param {number} [payload.durationMonths]
 */
export const createPlan = async (payload) => {
  const response = await adminApi.post("/admin/program-plans", payload);
  return response.data.data.plan;
};

// ============================================
// ✏️ UPDATE PLAN
// ============================================
export const updatePlan = async (id, payload) => {
  const response = await adminApi.put(`/admin/program-plans/${id}`, payload);
  return response.data.data.plan;
};

// ============================================
// 🗑️ DELETE PLAN
// ============================================
export const deletePlan = async (id) => {
  const response = await adminApi.delete(`/admin/program-plans/${id}`);
  return response.data;
};