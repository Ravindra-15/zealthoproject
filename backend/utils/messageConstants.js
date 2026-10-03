// utils/messageConstants.js
// Limits for the admin broadcast-message feature.

const MESSAGE_LIMITS = {
  TITLE_MAX: 150,
  BODY_MAX: 3000, // visible chars, HTML overhead allowed up to 10x (mirrors doctor bio pattern)
  IMAGE_MAX_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_MIME_TYPES: ["image/jpeg", "image/png", "image/webp"],
};

// 🚩 Single switch to hide/remove "send to doctors" later without touching
// routes/services — per explicit request ("in future we can hide or remove
// this feature"). Flip to false to hide the option everywhere it's checked.
const DOCTOR_MESSAGES_ENABLED = true;

module.exports = { MESSAGE_LIMITS, DOCTOR_MESSAGES_ENABLED };
