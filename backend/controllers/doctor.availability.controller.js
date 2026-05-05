/**
 * DOCTOR MODULE — Availability Controller
 * Thin HTTP layer over doctor.availability.service.
 * All routes scoped to authenticated doctor via req.doctorId.
 */

const availabilityService = require("../services/doctor.availability.service");

// ============================================
// 📅 GET TEMPLATE
// ============================================
// GET /api/doctor/availability/template
const getTemplate = async (req, res) => {
  try {
    const template = await availabilityService.getTemplate(req.doctorId);
    return res.status(200).json({
      success: true,
      data: { template },
    });
  } catch (err) {
    console.error("[GET TEMPLATE ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch availability template",
    });
  }
};

// ============================================
// 💾 UPDATE TEMPLATE
// ============================================
// PUT /api/doctor/availability/template
// Body: { weekly: [{ dayOfWeek, slots: [...] }, ...] }
const updateTemplate = async (req, res) => {
  try {
    const template = await availabilityService.updateTemplate(
      req.doctorId,
      req.body.weekly
    );
    return res.status(200).json({
      success: true,
      message: "Availability updated successfully",
      data: { template },
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      const firstError = Object.values(err.errors)[0]?.message || "Invalid data";
      return res.status(400).json({ success: false, message: firstError });
    }
    console.error("[UPDATE TEMPLATE ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update availability",
    });
  }
};

// ============================================
// 📆 GET WEEKLY VIEW
// ============================================
// GET /api/doctor/availability/week?startDate=YYYY-MM-DD
const getWeeklyView = async (req, res) => {
  try {
    const view = await availabilityService.getWeeklyView(
      req.doctorId,
      req.query.startDate
    );
    return res.status(200).json({
      success: true,
      data: view,
    });
  } catch (err) {
    console.error("[GET WEEK ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch weekly view",
    });
  }
};

// ============================================
// 🚫 CREATE TIME OFF
// ============================================
// POST /api/doctor/availability/timeoff
// Body: { type, startsAt, endsAt, reason? }
const createTimeOff = async (req, res) => {
  try {
    const timeOff = await availabilityService.createTimeOff(
      req.doctorId,
      req.body
    );
    return res.status(201).json({
      success: true,
      message: "Time-off created successfully",
      data: { timeOff },
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      const firstError = Object.values(err.errors)[0]?.message || "Invalid data";
      return res.status(400).json({ success: false, message: firstError });
    }
    console.error("[CREATE TIME OFF ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to create time-off",
    });
  }
};

// ============================================
// 🗑️ DELETE TIME OFF
// ============================================
// DELETE /api/doctor/availability/timeoff/:id
const deleteTimeOff = async (req, res) => {
  try {
    const result = await availabilityService.deleteTimeOff(
      req.doctorId,
      req.params.id
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Time-off not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Time-off removed successfully",
    });
  } catch (err) {
    console.error("[DELETE TIME OFF ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete time-off",
    });
  }
};

// ============================================
// 📋 LIST TIME OFFS
// ============================================
// GET /api/doctor/availability/timeoff
const listTimeOffs = async (req, res) => {
  try {
    const timeOffs = await availabilityService.listTimeOffs(req.doctorId);
    return res.status(200).json({
      success: true,
      data: { timeOffs },
    });
  } catch (err) {
    console.error("[LIST TIME OFFS ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch time-offs",
    });
  }
};

// ============================================
// ❌ CANCEL APPOINTMENT (from calendar)
// ============================================
// POST /api/doctor/availability/appointments/:id/cancel
// Body: { reason? }
const cancelAppointment = async (req, res) => {
  try {
    const result = await availabilityService.cancelAppointment(
      req.doctorId,
      req.params.id,
      req.body?.reason || ""
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    if (result.error) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Appointment cancelled successfully",
      data: { appointment: result.appointment },
    });
  } catch (err) {
    console.error("[CANCEL APPOINTMENT ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel appointment",
    });
  }
};

module.exports = {
  getTemplate,
  updateTemplate,
  getWeeklyView,
  createTimeOff,
  deleteTimeOff,
  listTimeOffs,
  cancelAppointment,
};