/**
 * ============================================
 * ADMIN MODULE — Habit Config API Service
 * ============================================
 * Manages habit/tracker metrics per program.
 * Multipart upload for icon files.
 *
 * Used by: HabitConfigurator page + AddHabitModal
 * ============================================
 */

import adminApi from "./adminService";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

// 🌐 Build absolute URL for backend-served icon files
//   iconUrl in DB: "/uploads/habit-icons/xxx.png"
export const buildIconSrc = (relativePath) => {
  if (!relativePath) return "";
  if (relativePath.startsWith("http")) return relativePath;
  const serverRoot = BASE_URL.replace(/\/api\/?$/, "");
  return `${serverRoot}${relativePath}`;
};

// ============================================
// 📋 LIST HABITS
// ============================================
/**
 * @param {string} programId
 * @returns Promise<Array<Habit>>
 */
export const listHabits = async (programId) => {
  const response = await adminApi.get("/admin/habit-configs", {
    params: { programId },
  });
  return response.data.data.habits || [];
};

// ============================================
// ➕ CREATE HABIT (multipart — icon file)
// ============================================
/**
 * @param {Object} payload
 * @param {string} payload.programId
 * @param {string} payload.trackerName
 * @param {string} payload.unit
 * @param {string} payload.colorHex
 * @param {File}   [payload.icon]
 * @param {number} [payload.minThreshold]
 * @param {number} [payload.averageGoal]
 * @param {number} [payload.maxThreshold]
 * @param {number} [payload.displayOrder]
 */
export const createHabit = async (payload) => {
  const formData = new FormData();
  formData.append("programId", payload.programId);
  formData.append("trackerName", payload.trackerName);
  formData.append("unit", payload.unit);
  formData.append("colorHex", payload.colorHex);

  if (payload.icon) formData.append("icon", payload.icon);
  if (payload.minThreshold !== undefined && payload.minThreshold !== "")
    formData.append("minThreshold", String(payload.minThreshold));
  if (payload.averageGoal !== undefined && payload.averageGoal !== "")
    formData.append("averageGoal", String(payload.averageGoal));
  if (payload.maxThreshold !== undefined && payload.maxThreshold !== "")
    formData.append("maxThreshold", String(payload.maxThreshold));
  if (payload.displayOrder !== undefined && payload.displayOrder !== null)
    formData.append("displayOrder", String(payload.displayOrder));

  const response = await adminApi.post("/admin/habit-configs", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data.data.habit;
};

// ============================================
// ✏️ UPDATE HABIT (multipart — icon optional)
// ============================================
export const updateHabit = async (id, payload) => {
  const formData = new FormData();
  if (payload.trackerName !== undefined)
    formData.append("trackerName", payload.trackerName);
  if (payload.unit !== undefined) formData.append("unit", payload.unit);
  if (payload.colorHex !== undefined)
    formData.append("colorHex", payload.colorHex);
  if (payload.minThreshold !== undefined)
    formData.append("minThreshold", String(payload.minThreshold ?? ""));
  if (payload.averageGoal !== undefined)
    formData.append("averageGoal", String(payload.averageGoal ?? ""));
  if (payload.maxThreshold !== undefined)
    formData.append("maxThreshold", String(payload.maxThreshold ?? ""));
  if (payload.displayOrder !== undefined)
    formData.append("displayOrder", String(payload.displayOrder));
  if (payload.isActive !== undefined)
    formData.append("isActive", String(payload.isActive));
  if (payload.icon) formData.append("icon", payload.icon);

  const response = await adminApi.put(
    `/admin/habit-configs/${id}`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    }
  );
  return response.data.data.habit;
};

// ============================================
// 🔄 TOGGLE isActive
// ============================================
export const toggleHabit = async (id) => {
  const response = await adminApi.patch(
    `/admin/habit-configs/${id}/toggle`
  );
  return response.data.data.habit;
};

// ============================================
// 🗑️ DELETE HABIT
// ============================================
export const deleteHabit = async (id) => {
  const response = await adminApi.delete(`/admin/habit-configs/${id}`);
  return response.data;
};