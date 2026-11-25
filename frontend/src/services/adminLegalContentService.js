/**
 * ADMIN MODULE — Legal pages & disclaimers API (super admin)
 * Used by: Configuration → Legal & Disclaimers (LegalContentEditor)
 */

import adminApi from "./adminService";

// → { content, originals }  (originals = the original text, for "Reset")
export const getLegalContent = async (programId) => {
  const response = await adminApi.get(`/admin/legal-content/${programId}`);
  return response.data.data;
};

/**
 * @param {string} programId
 * @param {{privacy, terms, notices, version}} payload — version = the one loaded
 *   (a stale one gets 409: someone else saved in between)
 */
export const saveLegalContent = async (programId, payload) => {
  const response = await adminApi.put(`/admin/legal-content/${programId}`, payload);
  return response.data.data.content;
};
