/**
 * ADMIN MODULE — Broadcast Message API Service
 */

import adminApi from "./adminService";

export const sendMessage = async ({ title, body, image, audienceType, programId }) => {
  const formData = new FormData();
  formData.append("title", title);
  formData.append("body", body);
  formData.append("audienceType", audienceType);
  if (audienceType === "customers") formData.append("programId", programId);
  if (image instanceof File) formData.append("image", image);

  const response = await adminApi.post("/admin/messages", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data; // { success, message, data: { message, recipientCount } }
};

export const fetchRecipientCount = async ({ audienceType, programId }) => {
  const response = await adminApi.get("/admin/messages/recipient-count", {
    params: { audienceType, programId },
  });
  return response.data.data.count;
};

export const fetchMessages = async ({ page = 1, limit = 20 } = {}) => {
  const response = await adminApi.get("/admin/messages", { params: { page, limit } });
  return response.data.data; // { messages, pagination }
};

// 🖼️ Backend returns paths like "/uploads/messages/foo.jpg"
export const buildMessageImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith("http")) return imagePath;
  const base = import.meta.env.VITE_API_BASE_URL?.replace("/api", "") || "http://localhost:5000";
  return `${base}${imagePath}`;
};
