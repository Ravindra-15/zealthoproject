// utils/userFlagReasons.js
//
// Canonical deactivation reasons — kept in sync by hand with the frontend's
// copy at frontend/src/data/flagReasons.js (same codes/labels). Small,
// stable list, so duplicating it is simpler and safer than sharing a
// package between the two.

const FLAG_REASONS = [
  { code: "terms_violation", label: "Violation of Terms & Conditions" },
  { code: "fraud", label: "Suspicious or fraudulent activity" },
  { code: "abuse", label: "Abusive or inappropriate behavior" },
  { code: "billing", label: "Payment or billing issue" },
  { code: "user_request", label: "Requested by the user" },
  { code: "other", label: "Other" },
];

const FLAG_REASON_CODES = FLAG_REASONS.map((r) => r.code);

const getFlagReasonLabel = (code) =>
  FLAG_REASONS.find((r) => r.code === code)?.label || "";

module.exports = { FLAG_REASONS, FLAG_REASON_CODES, getFlagReasonLabel };
