// Zealtho - Customer Billing Controller
// Handles consultations summary, transaction history, and receipt fetch
// Used by /api/customer/billing routes
// Reads from Consultation model for transaction data

const Consultation = require("../models/Consultation");
const User = require("../models/User");
const { successResponse, errorResponse } = require("../utils/responseHandler");

const getSummary = async (req, res) => {
  try {
    const totalCompleted = await Consultation.countDocuments({
      userId: req.user.id,
      status: "completed",
    });

    return successResponse(res, { consultations: { totalCompleted } }, "Summary fetched", 200);
  } catch (err) {
    return errorResponse(res, "Failed to fetch summary", 500);
  }
};

const listTransactions = async (req, res) => {
  try {
    const transactions = await Consultation.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .populate("doctorId", "fullName specialization")
      .lean();

    const formatted = transactions.map((t) => ({
      id: t._id,
      date: t.createdAt,
      description: t.description || "Doctor Consultation Fee (Basic)",
      amount: t.amount || 0,
      currency: t.currency || "USD",
      status: t.paymentStatus || "pending",
      receiptId: t.receiptId || null,
    }));

    return successResponse(res, { transactions: formatted }, "Transactions fetched", 200);
  } catch (err) {
    return errorResponse(res, "Failed to fetch transactions", 500);
  }
};

const getReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const consultation = await Consultation.findOne({
      _id: id,
      userId: req.user.id,
    })
      .populate("doctorId", "fullName specialization registrationNumber")
      .lean();

    if (!consultation) return errorResponse(res, "Receipt not found", 404);

    const user = await User.findById(req.user.id).select("nickName email").lean();

    const receipt = {
      receiptNumber: consultation.receiptId || `TXN-${consultation._id.toString().slice(-8).toUpperCase()}`,
      date: consultation.createdAt,
      solution: consultation.solution || "Consultation",
      billedTo: {
        nickname: user?.nickName || "User",
        email: user?.email || "",
      },
      professional: {
        name: consultation.doctorId?.fullName || "Doctor",
        specialization: consultation.doctorId?.specialization || "",
        registrationNumber: consultation.doctorId?.registrationNumber || "",
      },
      summary: {
        consultationFee: consultation.amount || 0,
        processingFee: consultation.processingFee || 0,
        total: (consultation.amount || 0) + (consultation.processingFee || 0),
        currency: consultation.currency || "USD",
      },
      appointment: {
        scheduledAt: consultation.scheduledAt || consultation.createdAt,
      },
    };

    return successResponse(res, { receipt }, "Receipt fetched", 200);
  } catch (err) {
    return errorResponse(res, "Failed to fetch receipt", 500);
  }
};

module.exports = { getSummary, listTransactions, getReceipt };