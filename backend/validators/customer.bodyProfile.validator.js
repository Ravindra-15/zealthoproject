/**
 * CUSTOMER MODULE — Body Profile Validators
 * Shape check only. Every answer is checked against the program's points
 * (type, length, the slider's min–max) in customer.bodyProfile.service.js,
 * because the super admin can change those points per program.
 * All fields optional (partial save supported).
 */

const SECTIONS = ["metabolic", "physical", "lifestyle", "symptoms", "familyHistory", "custom"];
const PROGRAMS = ["zealtho", "yogat20", "diabmukt", "mommyfit", "slimfitter"];

const isNumberInRange = (v, min, max) =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;

// ============================================
// 📝 UPSERT BODY PROFILE
// ============================================
const validateUpsertBodyProfile = (req, res, next) => {
  const body = req.body;
  const errors = [];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({ success: false, message: "Invalid data" });
  }

  for (const section of SECTIONS) {
    const v = body[section];
    if (v !== undefined && v !== null && (typeof v !== "object" || Array.isArray(v))) {
      errors.push(`${section} must be an object`);
    }
  }

  if (body.programId !== undefined && !PROGRAMS.includes(body.programId)) {
    errors.push("Unknown program");
  }

  if (body.weekTotal !== undefined && body.weekTotal !== null && !isNumberInRange(body.weekTotal, 1, 104))
    errors.push("weekTotal must be 1–104");

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: errors[0], errors });
  }

  next();
};

module.exports = { validateUpsertBodyProfile };
