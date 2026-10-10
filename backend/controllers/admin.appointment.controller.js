/**
 * ADMIN MODULE — Appointment Controller
 * Thin HTTP layer over admin.appointment.service.
 * Read-only endpoints: list (with filters/pagination) + status counts.
 */

const appointmentService = require("../services/admin.appointment.service");
const { toCsv } = require("../utils/csv.util");
const {
  isSuperAdmin,
  omit,
  APPOINTMENT_FINANCIAL_FIELDS,
} = require("../utils/adminAccess");

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

    // 💰 Portal admins never see fees / payment status
    if (!isSuperAdmin(req.admin)) {
      result.appointments = result.appointments.map((apt) =>
        omit(apt, APPOINTMENT_FINANCIAL_FIELDS)
      );
    }

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
// 📤 EXPORT APPOINTMENTS CSV
// Same search/status filters as the list view, every matching row (no
// pagination). Portal admins get the same fee/payment-status masking
// they already see on-screen — never leaked into the export either.
// ============================================
const exportAppointmentsCsv = async (req, res) => {
  try {
    const { search, status } = req.query;
    const superAdmin = isSuperAdmin(req.admin);

    const appointments = await appointmentService.listAppointmentsForExport({ search, status });

    const headers = [
      "Patient Name",
      "Doctor Name",
      "Program",
      "Scheduled At",
      "Duration (mins)",
      "Status",
      ...(superAdmin ? ["Fee", "Currency", "Payment Status"] : []),
    ];

    const rows = appointments.map((apt) => [
      apt.patientName || "",
      apt.doctorName || "",
      apt.platform || "",
      apt.scheduledAt ? new Date(apt.scheduledAt).toISOString() : "",
      apt.durationMinutes || "",
      apt.status || "",
      ...(superAdmin ? [apt.fee ?? "", apt.currency || "", apt.paymentStatus || ""] : []),
    ]);

    const csv = toCsv(headers, rows);
    const filename = `zealtho-appointments-${new Date().toISOString().slice(0, 10)}.csv`;

    res.status(200);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(csv);
  } catch (err) {
    console.error("[ADMIN APPOINTMENT EXPORT ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to export appointments",
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
  exportAppointmentsCsv,
  getStatusCounts,
};