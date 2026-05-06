/**
 * DOCTOR MODULE — Appointment Controller
 * HTTP layer for doctor's appointments page.
 * Three endpoints: list by date, set meeting link, send meeting link.
 */

const doctorAppointmentService = require("../services/doctor.appointment.service");

// ============================================
// 📋 LIST BY DATE
// ============================================
// GET /api/doctor/appointments?date=YYYY-MM-DD
const listAppointments = async (req, res) => {
  try {
    const data = await doctorAppointmentService.listByDate(
      req.doctorId,
      req.query.date
    );
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("[DOCTOR LIST APPOINTMENTS ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch appointments",
    });
  }
};

// ============================================
// 🔗 SET MEETING LINK
// ============================================
// PATCH /api/doctor/appointments/:id/meeting-link
const setMeetingLink = async (req, res) => {
  try {
    const result = await doctorAppointmentService.setMeetingLink(
      req.doctorId,
      req.params.id,
      req.body.meetingLink
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    if (result.error) {
      return res.status(400).json({ success: false, message: result.error });
    }

    return res.status(200).json({
      success: true,
      message: "Meeting link saved",
      data: { appointment: result.appointment },
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      const firstError = Object.values(err.errors)[0]?.message || "Invalid data";
      return res.status(400).json({ success: false, message: firstError });
    }
    console.error("[DOCTOR SET MEETING LINK ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to save meeting link",
    });
  }
};

// ============================================
// 📤 SEND MEETING LINK
// ============================================
// POST /api/doctor/appointments/:id/send-meeting-link
const sendMeetingLink = async (req, res) => {
  try {
    const result = await doctorAppointmentService.markMeetingLinkSent(
      req.doctorId,
      req.params.id
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    if (result.error) {
      return res.status(400).json({ success: false, message: result.error });
    }

    return res.status(200).json({
      success: true,
      message: "Meeting link sent to patient",
      data: { appointment: result.appointment },
    });
  } catch (err) {
    console.error("[DOCTOR SEND MEETING LINK ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to send meeting link",
    });
  }
};

module.exports = {
  listAppointments,
  setMeetingLink,
  sendMeetingLink,
};