/**
 * ADMIN MODULE — Appointment Controller
 * Thin HTTP layer over admin.appointment.service.
 * Read-only endpoints: list (with filters/pagination) + status counts.
 */

const appointmentService = require("../services/admin.appointment.service");

// ============================================
// 📋 LIST APPOINTMENTS
// ============================================
const listAppointments = async (req, res) => {
  try {
    const { page, limit, search, status } = req.query;
    const result = await appointmentService.listAppointments({
      page,
      limit,
      search,
      status,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("[ADMIN APPOINTMENT LIST ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch appointments",
    });
  }
};

// ============================================
// 🔢 GET STATUS COUNTS
// ============================================
const getStatusCounts = async (req, res) => {
  try {
    const counts = await appointmentService.getStatusCounts();

    return res.status(200).json({
      success: true,
      data: { counts },
    });
  } catch (err) {
    console.error("[ADMIN APPOINTMENT COUNTS ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch appointment counts",
    });
  }
};

module.exports = {
  listAppointments,
  getStatusCounts,
};