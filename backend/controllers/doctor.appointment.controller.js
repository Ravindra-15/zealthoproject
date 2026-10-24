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
// 🎥 GENERATE GOOGLE MEET LINK (auto)
// ============================================
// POST /api/doctor/appointments/:id/generate-meeting-link
const generateMeetingLink = async (req, res) => {
  try {
    const result = await doctorAppointmentService.generateMeetingLink(
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
      message: "Meeting link generated",
      data: { appointment: result.appointment },
    });
  } catch (err) {
    console.error("[DOCTOR GENERATE MEETING LINK ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to generate meeting link",
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

// ============================================
// ❌ CANCEL APPOINTMENT BY DOCTOR (reason required)
// ============================================
// PATCH /api/doctor/appointments/:id/cancel
const cancelAppointment = async (req, res) => {
  try {
    const result = await doctorAppointmentService.cancelByDoctor(
      req.doctorId,
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
    console.error("[DOCTOR CANCEL APPOINTMENT ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel appointment",
    });
  }
};

// ============================================
// 🔁 RESCHEDULE APPOINTMENT BY DOCTOR (reason + new slot)
// ============================================
// PATCH /api/doctor/appointments/:id/reschedule
// Body: { scheduledAt, reason }
const rescheduleAppointment = async (req, res) => {
  try {
    const result = await doctorAppointmentService.rescheduleByDoctor(
      req.doctorId,
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
    console.error("[DOCTOR RESCHEDULE APPOINTMENT ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to reschedule appointment",
    });
  }
};

// ============================================
// ✅ MARK APPOINTMENT COMPLETE BY DOCTOR
// ============================================
// PATCH /api/doctor/appointments/:id/complete
const markAppointmentComplete = async (req, res) => {
  try {
    const result = await doctorAppointmentService.markCompleteByDoctor(
      req.doctorId,
      req.params.id
    );

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
    console.error("[DOCTOR COMPLETE APPOINTMENT ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to mark complete",
    });
  }
};

// ============================================
// 🧬 GET PATIENT BODY PROFILE
// ============================================
// GET /api/doctor/appointments/:id/body-profile
const getPatientBodyProfile = async (req, res) => {
  try {
    const result = await doctorAppointmentService.getPatientBodyProfile(
      req.doctorId,
      req.params.id
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: { profile: result.profile },
    });
  } catch (err) {
    console.error("[DOCTOR GET BODY PROFILE ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch body profile",
    });
  }
};

// ============================================
// 💊 SET PRESCRIPTION
// ============================================
// PATCH /api/doctor/appointments/:id/prescription
const setPrescription = async (req, res) => {
  try {
    const result = await doctorAppointmentService.setPrescription(
      req.doctorId,
      req.params.id,
      req.body.prescription
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
      message: "Prescription saved",
      data: { appointment: result.appointment },
    });
  } catch (err) {
    console.error("[DOCTOR SET PRESCRIPTION ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to save prescription",
    });
  }
};

// ============================================
// 📤 SEND PRESCRIPTION
// ============================================
// POST /api/doctor/appointments/:id/send-prescription
const sendPrescription = async (req, res) => {
  try {
    const result = await doctorAppointmentService.markPrescriptionSent(
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
      message: "Prescription sent to patient",
      data: { appointment: result.appointment },
    });
  } catch (err) {
    console.error("[DOCTOR SEND PRESCRIPTION ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to send prescription",
    });
  }
};


// ============================================
// 🚫 MARK APPOINTMENT NO SHOW BY DOCTOR
// ============================================
// PATCH /api/doctor/appointments/:id/no-show
const markAppointmentNoShow = async (req, res) => {
  try {
    const result = await doctorAppointmentService.markNoShowByDoctor(
      req.doctorId,
      req.params.id
    );

    if (result.error) {
      return res.status(result.error.status).json({
        success: false,
        message: result.error.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Appointment marked as No Show",
      data: { appointment: result.appointment },
    });
  } catch (err) {
    console.error("[DOCTOR NO-SHOW APPOINTMENT ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to mark No Show",
    });
  }
};

// ============================================
// 📄 OPEN A PATIENT'S MEDICAL REPORT (doctor of that appointment only)
// ============================================
// GET /api/doctor/appointments/:id/reports/:reportId/file
const getPatientReportFile = async (req, res) => {
  try {
    const mongoose = require("mongoose");
    const Appointment = require("../models/Appointment");
    const MedicalReport = require("../models/MedicalReport");
    const { sendReportFile } = require("./customer.medicalReport.controller");

    const { id, reportId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      return res.status(400).json({ success: false, message: "Invalid report" });
    }

    const appointment = await Appointment.findOne({ _id: id, doctor: req.doctorId }).select("status").lean();
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }
    if (appointment.status === "cancelled") {
      return res.status(403).json({ success: false, message: "Reports aren't available for cancelled appointments." });
    }

    const report = await MedicalReport.findOne({ _id: reportId, appointment: id }).lean();
    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }
    return sendReportFile(res, report);
  } catch (err) {
    console.error("[DOCTOR REPORT FILE ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to open report" });
  }
};

// ============================================
// 📈 PATIENT DAILY PROGRESS (doctor of that appointment only)
// ============================================
// GET /api/doctor/appointments/:id/progress
// Same report the patient sees on their Progress Report page (shared
// buildProgressReport), plus the raw daily values for the line graph.
// The patient + program always come from the appointment itself.
const PROGRESS_PROGRAMS = {
  yogat20: "Yoga T20",
  diabmukt: "Diabmukt",
  mommyfit: "MommyFit",
  slimfitter: "Slimfitter",
};

const getPatientProgress = async (req, res) => {
  try {
    const Appointment = require("../models/Appointment");
    const ProgramSubscription = require("../models/ProgramSubscription");
    const UserHabitProgress = require("../models/UserHabitProgress");
    const { buildProgressReport } = require("../services/progressReport.service");

    const appointment = await Appointment.findOne({ _id: req.params.id, doctor: req.doctorId })
      .populate("user", "fullName nickName")
      .select("user platform status scheduledAt")
      .lean();
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }
    if (appointment.status === "cancelled") {
      return res.status(403).json({ success: false, message: "Progress isn't available for cancelled appointments." });
    }

    const patientId = appointment.user?._id;
    const patientName = appointment.user?.fullName || appointment.user?.nickName || "Patient";
    const programId = appointment.platform;
    const programName = PROGRESS_PROGRAMS[programId];
    const base = { patientName, programId, programName: programName || "Zealtho" };

    if (!patientId || !programName) {
      return res.status(200).json({
        success: true,
        data: {
          ...base,
          available: false,
          message: "Daily progress is tracked in the program apps (Yoga T20, Diabmukt, MommyFit, Slimfitter). This appointment was booked on Zealtho.",
        },
      });
    }

    // Same plan choice as the patient's own report: the one running now, else the latest
    const now = new Date();
    const subs = await ProgramSubscription.find({
      programId,
      $or: [{ customer: patientId }, { doctor: patientId }],
    })
      .sort({ createdAt: -1 })
      .lean();
    const sub = subs.find((s) => new Date(s.startDate) <= now && now < new Date(s.endDate)) || subs[0];

    if (!sub) {
      return res.status(200).json({
        success: true,
        data: {
          ...base,
          available: false,
          message: `This patient doesn't have a ${programName} plan yet, so there's no daily progress to show.`,
        },
      });
    }

    const report = await buildProgressReport({ userId: patientId, programId, sub });

    // 📈 daily values for the graph (only the habits shown in the report)
    const habitIds = (report.habits || []).map((h) => h.habitId);
    const logs = await UserHabitProgress.find({
      user: patientId,
      programId,
      habit: { $in: habitIds },
      logDate: { $gte: new Date(sub.startDate) },
    })
      .select("habit value logDate")
      .sort({ logDate: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        ...base,
        available: true,
        plan: { startDate: sub.startDate, endDate: sub.endDate, isActive: sub.status === "active" && new Date(sub.endDate) > now },
        report,
        logs: logs.map((l) => ({
          habitId: l.habit,
          date: new Date(l.logDate).toISOString().slice(0, 10),
          value: l.value,
        })),
      },
    });
  } catch (err) {
    console.error("[DOCTOR PATIENT PROGRESS ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to load patient progress" });
  }
};

module.exports = {
  getPatientProgress,
  getPatientReportFile,
  markAppointmentNoShow,
  listAppointments,
  setMeetingLink,
  generateMeetingLink,
  sendMeetingLink,
  cancelAppointment,
  rescheduleAppointment,
  markAppointmentComplete,
  getPatientBodyProfile,
  setPrescription,
  sendPrescription,
};