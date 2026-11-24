/**
 * ADMIN MODULE — Body Profile settings API (super admin)
 * Used by: Configuration → Body Profile (BodyProfileConfigurator)
 */

import adminApi from "./adminService";

export const getBodyProfileConfig = async (programId) => {
  const response = await adminApi.get(`/admin/body-profile-config/${programId}`);
  return response.data.data.config;
};

/**
 * @param {string} programId
 * @param {{steps, sections, version}} payload — version = the one loaded
 *   (a stale one gets 409: someone else saved in between)
 */
export const saveBodyProfileConfig = async (programId, payload) => {
  const response = await adminApi.put(`/admin/body-profile-config/${programId}`, payload);
  return response.data.data.config;
};
