/**
 * CUSTOMER MODULE — Appointment Controller
 * Thin HTTP layer over customer.appointment.service + customer.doctor.service.
 * All booking/list endpoints require auth (user JWT).
 * Day-availability endpoint is mounted under doctor routes (public).
 */

const customerAppointmentService = require("../services/customer.appointment.service");
const customerDoctorService = require("../services/customer.doctor.service");

// ============================================
// 📅 GET DAY AVAILABILITY (public)
// ============================================
// GET /api/customer/doctors/:id/availability?date=YYYY-MM-DD
const getDayAvailability = async (req, res) => {
  try {
    const data = await customerDoctorService.getDayAvailability(
      req.params.id,
      req.query.date
    );

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found or invalid date",
      });
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("[CUSTOMER DAY AVAILABILITY ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch availability",
    });
  }
};

// ============================================
// 📝 CREATE BOOKING
// ============================================
// POST /api/customer/appointments
// Body: { doctorId, scheduledAt, notes? }
const createBooking = async (req, res) => {
  try {
 
    const result = await customerAppointmentService.createBooking({
      userId: req.user.id, // set by auth middleware
      doctorId: req.body.doctorId,
      scheduledAt: req.body.scheduledAt,
      notes: req.body.notes,
      platform: req.body.platform || "zealtho",
    });

    if (result.error) {
      return res.status(result.error.status).json({
        success: false,
        message: result.error.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Appointment booked successfully",
      data: {
        appointment: result.appointment,
        payment: {
          transactionId: result.paymentResult.transactionId,
          amount: result.paymentResult.amount,
          currency: result.paymentResult.currency,
        },
      },
    });
  } catch (err) {
    console.error("[CUSTOMER CREATE BOOKING ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to create booking",
    });
  }
};

// ============================================
// 📋 LIST MY APPOINTMENTS
// ============================================
// GET /api/customer/appointments?bucket=upcoming|past|all
const listMyAppointments = async (req, res) => {
  try {
    const { bucket, page, limit } = req.query;
    const result = await customerAppointmentService.listMyAppointments(
      req.user.id,
      { bucket, page, limit }
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("[CUSTOMER LIST APPOINTMENTS ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch appointments",
    });
  }
};

// ============================================
// 👁️ GET SINGLE APPOINTMENT
// ============================================
// GET /api/customer/appointments/:id
const getMyAppointment = async (req, res) => {
  try {
    const appointment = await customerAppointmentService.getMyAppointmentById(
      req.user.id,
      req.params.id
    );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: { appointment },
    });
  } catch (err) {
    console.error("[CUSTOMER GET APPOINTMENT ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch appointment",
    });
  }
};

// ============================================
// ❌ CANCEL MY APPOINTMENT (reason optional)
// ============================================
// PATCH /api/customer/appointments/:id/cancel
const cancelMyAppointment = async (req, res) => {
  try {
    const result = await customerAppointmentService.cancelByUser(
      req.user.id,
      req.params.id,
      req.body.reason
    );

    if (result.error) {
      return res.status(result.error.status).json({
        success: false,
        message: result.error.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Appointment cancelled",
      data: { appointment: result.appointment },
    });
  } catch (err) {
    console.error("[CUSTOMER CANCEL APPOINTMENT ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel appointment",
    });
  }
};

// ============================================
// 🔁 RESCHEDULE MY APPOINTMENT (reason + new slot)
// ============================================
// PATCH /api/customer/appointments/:id/reschedule
// Body: { scheduledAt, reason }
const rescheduleMyAppointment = async (req, res) => {
  try {
    const result = await customerAppointmentService.rescheduleByUser(
      req.user.id,
      req.params.id,
      req.body.scheduledAt,
      req.body.reason
    );

    if (result.error) {
      return res.status(result.error.status).json({
        success: false,
        message: result.error.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Appointment rescheduled",
      data: { appointment: result.appointment },
    });
  } catch (err) {
    console.error("[CUSTOMER RESCHEDULE APPOINTMENT ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to reschedule appointment",
    });
  }
};

// ============================================
// ✅ MARK MY APPOINTMENT COMPLETE
// ============================================
// PATCH /api/customer/appointments/:id/complete
const markMyAppointmentComplete = async (req, res) => {
  try {
    const result = await customerAppointmentService.markComplete({
      appointmentId: req.params.id,
      actorId: req.user.id,
      actorType: "user",
    });

    if (result.error) {
      return res.status(result.error.status).json({
        success: false,
        message: result.error.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Consultation marked complete",
      data: { appointment: result.appointment },
    });
  } catch (err) {
    console.error("[CUSTOMER COMPLETE APPOINTMENT ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to mark complete",
    });
  }
};

// ============================================
// ✏️ UPDATE MY NOTES (problem)
// ============================================
// PATCH /api/customer/appointments/:id/notes
const updateMyNotes = async (req, res) => {
  try {
    const result = await customerAppointmentService.updateMyNotes(
      req.user.id,
      req.params.id,
      req.body.notes
    );

    if (result.error) {
      return res.status(result.error.status).json({
        success: false,
        message: result.error.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Problem updated",
      data: { appointment: result.appointment },
    });
  } catch (err) {
    console.error("[CUSTOMER UPDATE NOTES ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update problem",
    });
  }
};

module.exports = {
  getDayAvailability,
  createBooking,
  listMyAppointments,
  getMyAppointment,
  cancelMyAppointment,
  rescheduleMyAppointment,
  markMyAppointmentComplete,
  updateMyNotes,
};