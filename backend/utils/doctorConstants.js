/**
 * Default domain and specialization lists for doctor creation.
 * Used by both the validator and the dropdown options endpoint.
 *
 * Future: Move to DB-backed admin-managed lists if needed.
 */

const DOCTOR_DOMAINS = [
  "Ayurveda",
  "Allopathy",
  "Homeopathy",
  "Yoga & Naturopathy",
  "Nutrition",
  "Mental Wellness",
];

const DOCTOR_SPECIALIZATIONS = [
  "PCOS",
  "Diabetes",
  "Hypertension",
  "Cardiology",
  "Pediatrics",
  "Endocrinology",
  "Gynecology",
  "Mental Health",
  "Dermatology",
  "General Medicine",
  "Nutrition",
  "Yoga Therapy",
  "Pranayama",
  "Meditation",
  "Weight Management",
];

// 📏 Field length constraints (used in model + validators)
const DOCTOR_LIMITS = {
  FULL_NAME_MIN: 3,
  FULL_NAME_MAX: 100,
  DOMAIN_MAX: 50,
  SPECIALIZATION_MAX: 50,
  SPECIALIZATIONS_MAX_COUNT: 10,
  SHORT_BIO_MAX: 500,
  PHOTO_MAX_SIZE_BYTES: 2 * 1024 * 1024, // 2MB
  ALLOWED_PHOTO_MIME_TYPES: ["image/jpeg", "image/png", "image/webp"],

  // 📄 Licence document — admin can optionally upload one when onboarding a
  // doctor; the doctor must upload their own during profile completion.
  LICENCE_NUMBER_MAX: 50,
  LICENCE_MAX_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  ALLOWED_LICENCE_MIME_TYPES: [
    "application/pdf",
    "application/msword", // .doc
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "image/jpeg",
    "image/png",
    "image/webp",
  ],
};

module.exports = {
  DOCTOR_DOMAINS,
  DOCTOR_SPECIALIZATIONS,
  DOCTOR_LIMITS,
};