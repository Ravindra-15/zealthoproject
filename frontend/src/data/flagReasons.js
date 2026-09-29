// src/data/flagReasons.js
//
// Deactivation reasons shown in the admin's Activate/Deactivate modal.
// Kept in sync by hand with the backend's copy at
// backend/utils/userFlagReasons.js (same codes/labels) — small, stable
// list, so duplicating it is simpler than sharing a package.

export const FLAG_REASONS = [
  { code: "terms_violation", label: "Violation of Terms & Conditions" },
  { code: "fraud", label: "Suspicious or fraudulent activity" },
  { code: "abuse", label: "Abusive or inappropriate behavior" },
  { code: "billing", label: "Payment or billing issue" },
  { code: "user_request", label: "Requested by the user" },
  { code: "other", label: "Other" },
];
