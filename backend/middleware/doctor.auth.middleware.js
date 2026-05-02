/**
 * DOCTOR MODULE — Auth Middleware
 * Verifies JWT, attaches req.doctor, enforces isActive on every request.
 */

const jwt = require("jsonwebtoken");
const Doctor = require("../models/Doctor");

const protectDoctor = async (req, res, next) => {
  try {
    // 🎟️ Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const token = authHeader.split(" ")[1]?.trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // 🔓 Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.DOCTOR_JWT_SECRET);
    } catch (err) {
      const message =
        err.name === "TokenExpiredError"
          ? "Session expired. Please log in again."
          : "Invalid authentication token";
      return res.status(401).json({
        success: false,
        message,
      });
    }

    // 🛡️ Ensure token type matches (prevents admin/customer tokens being reused here)
    if (decoded.type !== "doctor" || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
    }

    // 🔍 Fetch fresh doctor (re-checks isActive on every request)
    const doctor = await Doctor.findById(decoded.id);

    if (!doctor) {
      return res.status(401).json({
        success: false,
        message: "Doctor account not found",
      });
    }

    if (!doctor.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account has been deactivated. Contact your administrator.",
      });
    }

    // 📎 Attach to request for downstream handlers
    req.doctor = doctor;
    req.doctorId = doctor._id;

    next();
  } catch (err) {
    console.error("[DOCTOR AUTH MIDDLEWARE ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

module.exports = { protectDoctor };