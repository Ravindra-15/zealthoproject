/**
 * ADMIN MODULE — Billing Controller
 * Admin can view receipts for any consultation across all programs.
 * No userId ownership check — admin has full access.
 * Does NOT affect customer billing routes.
 */

const Consultation = require("../models/Consultation");
const User = require("../models/User");
const { successResponse, errorResponse } = require("../utils/responseHandler");

const getAdminReceipt = async (req, res) => {
  try {
    const { id } = req.params;

    const consultation = await Consultation.findById(id)
      .populate("doctor", "fullName specializations domain")
      .lean();

    if (!consultation) return errorResponse(res, "Receipt not found", 404);

    const user = await User.findById(consultation.user)
      .select("fullName email")
      .lean();

    const receipt = {
      receiptNumber: `TXN-${consultation._id.toString().slice(-8).toUpperCase()}`,
      date: consultation.paidAt || consultation.createdAt,
      solution: consultation.programSource || "zealtho",
      billedTo: {
        nickname: user?.fullName || "Customer",
        email: user?.email || "",
      },
      professional: {
        name: consultation.doctorName || consultation.doctor?.fullName || "Doctor",
        specialization: consultation.doctor?.specializations?.[0] || consultation.doctor?.domain || "",
        registrationNumber: "",
      },
      summary: {
        consultationFee: consultation.fee || 0,
        processingFee: 0,
        total: consultation.fee || 0,
        currency: "INR",
      },
      appointment: {
        scheduledAt: consultation.consultedAt || consultation.createdAt,
      },
    };

    return successResponse(res, { receipt }, "Receipt fetched", 200);
  } catch (err) {
    console.error("Admin getReceipt error:", err);
    return errorResponse(res, "Failed to fetch receipt", 500);
  }
};

module.exports = { getAdminReceipt };