// Zealtho - Customer Billing Controller
const Consultation = require("../models/Consultation");
const User = require("../models/User");
const { successResponse, errorResponse } = require("../utils/responseHandler");

const getSummary = async (req, res) => {
  try {
    const totalCompleted = await Consultation.countDocuments({
      user: req.user.id,
      status: "completed",
    });

    return successResponse(res, { consultations: { totalCompleted } }, "Summary fetched", 200);
  } catch (err) {
    console.error("[BILLING SUMMARY ERROR]:", err);
    return errorResponse(res, "Failed to fetch summary", 500);
  }
};

const listTransactions = async (req, res) => {
  try {
    const transactions = await Consultation.find({ user: req.user.id })
      .sort({ consultedAt: -1 })
      .populate("doctor", "fullName domain")
      .lean();

    const formatted = transactions.map((t) => ({
      id: t._id,
      date: t.paidAt || t.consultedAt || t.createdAt,
      description: `Doctor Consultation Fee (${t.doctorName || "Consultation"})`,
      amount: t.fee || 0,
      currency: "USD",
      status: t.paymentStatus || "pending",
    }));

    return successResponse(res, { transactions: formatted }, "Transactions fetched", 200);
  } catch (err) {
    console.error("[BILLING TRANSACTIONS ERROR]:", err);
    return errorResponse(res, "Failed to fetch transactions", 500);
  }
};

const getReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const consultation = await Consultation.findOne({
      _id: id,
      user: req.user.id,
    })
      .populate("doctor", "fullName domain")
      .lean();

    if (!consultation) return errorResponse(res, "Receipt not found", 404);

    const user = await User.findById(req.user.id).select("nickName fullName email").lean();

    const receipt = {
      receiptNumber: `TXN-${consultation._id.toString().slice(-8).toUpperCase()}`,
      date: consultation.paidAt || consultation.consultedAt || consultation.createdAt,
      solution: consultation.programSource || "zealtho",
      billedTo: {
        nickname: user?.nickName || user?.fullName || "User",
        email: user?.email || "",
      },
      professional: {
        name: consultation.doctorName || consultation.doctor?.fullName || "Doctor",
        specialization: consultation.doctor?.domain || "",
        registrationNumber: "",
      },
      summary: {
        consultationFee: consultation.fee || 0,
        processingFee: 0,
        total: consultation.fee || 0,
        currency: "USD",
      },
      appointment: {
        scheduledAt: consultation.consultedAt || consultation.createdAt,
      },
    };

    return successResponse(res, { receipt }, "Receipt fetched", 200);
  } catch (err) {
    console.error("[BILLING RECEIPT ERROR]:", err);
    return errorResponse(res, "Failed to fetch receipt", 500);
  }
};

module.exports = { getSummary, listTransactions, getReceipt };