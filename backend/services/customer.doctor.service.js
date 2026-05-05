/**
 * CUSTOMER MODULE — Public Doctor Service
 * Returns active, profile-complete doctors only.
 * Sensitive fields (password, loginAttempts, etc.) excluded — public exposure safe.
 */

const Doctor = require("../models/Doctor");

// ============================================
// 🔒 PUBLIC FIELD WHITELIST
// ============================================
// Only these fields are ever returned to unauthenticated visitors
const PUBLIC_FIELDS = [
  "_id",
  "fullName",
  "domain",
  "specializations",
  "shortBio",
  "photo",
  "qualifications",
  "yearsOfExperience",
  "updatedAt", // for cache-busting photo URLs
].join(" ");

// ============================================
// 📋 LIST PUBLIC DOCTORS
// ============================================
const listPublicDoctors = async ({
  page = 1,
  limit = 10,
  search = "",
  specialty = "",
} = {}) => {
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
  const safeSearch = typeof search === "string" ? search.trim() : "";
  const safeSpecialty = typeof specialty === "string" ? specialty.trim() : "";

  // 🔒 Always enforce these — public visitors must NOT see inactive/incomplete doctors
  const query = {
    isActive: true,
    isProfileComplete: true,
  };

  // 🔍 Search across name, domain, specializations
  if (safeSearch) {
    const escaped = safeSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    query.$or = [
      { fullName: regex },
      { domain: regex },
      { specializations: regex }, // matches any element in array
    ];
  }

  // 🏷️ Specialty filter (case-insensitive exact within array)
  if (safeSpecialty) {
    const escaped = safeSpecialty.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.specializations = { $regex: new RegExp(`^${escaped}$`, "i") };
  }

  const [total, doctors] = await Promise.all([
    Doctor.countDocuments(query),
    Doctor.find(query)
      .select(PUBLIC_FIELDS)
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
  ]);

  return {
    doctors,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
      hasMore: safePage * safeLimit < total,
    },
  };
};

// ============================================
// 👁️ GET PUBLIC DOCTOR DETAILS
// ============================================
// Returns single doctor (for future detail page); same field whitelist
const getPublicDoctorById = async (doctorId) => {
  const doctor = await Doctor.findOne({
    _id: doctorId,
    isActive: true,
    isProfileComplete: true,
  })
    .select(PUBLIC_FIELDS)
    .lean();

  return doctor || null;
};

module.exports = {
  listPublicDoctors,
  getPublicDoctorById,
};