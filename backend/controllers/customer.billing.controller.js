// Zealtho - Customer Billing Controller
const Consultation = require("../models/Consultation");
const User = require("../models/User");
const { successResponse, errorResponse } = require("../utils/responseHandler");
const ProgramSubscription = require("../models/ProgramSubscription");
const Appointment = require("../models/Appointment"); // for paid appointment transactions
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
    const userId = req.user.id;

    // 💳 Paid doctor appointments (shows at payment time, not completion)
    // type "appointment" so receipt lookup knows the source
    const appointments = await Appointment.find({
      user: userId,
      paymentStatus: "paid",
    })
      .sort({ createdAt: -1 })
      .lean();

    const appointmentTx = appointments.map((a) => {
      // Free for the user if booked via plan consult or cancel credit (doctor still paid separately)
      // Distinguish plan-credit vs cancel-credit in the label
      const freeLabel = a.paidWithPlanCredit
        ? " — Free (Plan Credit)"
        : a.paidWithCredit
        ? " — Free (Credit)"
        : "";
      return {
        id: a._id,
        type: "appointment",
        date: a.createdAt,
        description: `Doctor Consultation Fee (${a.doctorName || "Consultation"})${freeLabel}`,
        amount: a.paidWithPlanCredit || a.paidWithCredit ? 0 : a.fee || 0,
        currency: a.currency || "USD",
        status: a.paymentStatus || "pending",
      };
    });

    // 📦 Paid program subscriptions (plan purchases — absent in Zealtho, present in subprograms)
    const subscriptions = await ProgramSubscription.find({
      customer: userId,
      paymentStatus: "paid",
    })
      .sort({ createdAt: -1 })
      .lean();

    const subscriptionTx = subscriptions.map((s) => ({
      id: s._id,
      type: "subscription",
      date: s.createdAt,
      description: `${s.programName || "Program"} Plan (${s.tenure || ""})`.trim(),
      amount: s.amount || 0,
      currency: "USD",
      status: s.paymentStatus || "pending",
    }));

    // 🔀 Merge + sort newest first
    const formatted = [...appointmentTx, ...subscriptionTx].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    return successResponse(res, { transactions: formatted }, "Transactions fetched", 200);
  } catch (err) {
    console.error("[BILLING TRANSACTIONS ERROR]:", err);
    return errorResponse(res, "Failed to fetch transactions", 500);
  }
};

const getReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const user = await User.findById(userId)
      .select("nickName fullName email")
      .lean();

    const billedTo = {
      nickname: user?.nickName || user?.fullName || "User",
      email: user?.email || "",
    };

    // 1️⃣ Try Consultation (completed visits)
    const consultation = await Consultation.findOne({ _id: id, user: userId })
      .populate("doctor", "fullName domain")
      .lean();

    if (consultation) {
      const receipt = {
        receiptNumber: `TXN-${consultation._id.toString().slice(-8).toUpperCase()}`,
        date: consultation.paidAt || consultation.consultedAt || consultation.createdAt,
        solution: consultation.programSource || "zealtho",
        billedTo,
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
    }

    // 2️⃣ Try Appointment (paid doctor booking)
    const appointment = await Appointment.findOne({ _id: id, user: userId })
      .populate("doctor", "fullName domain")
      .lean();

    if (appointment) {
      // Free for the user if booked via plan consult or cancel credit
      const wasFree = appointment.paidWithPlanCredit || appointment.paidWithCredit;
      const displayFee = wasFree ? 0 : appointment.fee || 0;
      const receipt = {
        receiptNumber: `TXN-${appointment._id.toString().slice(-8).toUpperCase()}`,
        date: appointment.createdAt,
        solution: appointment.platform || "zealtho",
        billedTo,
        professional: {
          name: appointment.doctorName || appointment.doctor?.fullName || "Doctor",
          specialization: appointment.doctor?.domain || "",
          registrationNumber: "",
        },
        summary: {
          consultationFee: displayFee,
          processingFee: 0,
          total: displayFee,
          currency: appointment.currency || "USD",
        },
        appointment: {
          scheduledAt: appointment.scheduledAt || appointment.createdAt,
        },
      };
      return successResponse(res, { receipt }, "Receipt fetched", 200);
    }

    // 3️⃣ Try ProgramSubscription (plan purchase)
    const sub = await ProgramSubscription.findOne({
      _id: id,
      customer: userId,
    }).lean();

    if (sub) {
      const receipt = {
        receiptNumber: `TXN-${sub._id.toString().slice(-8).toUpperCase()}`,
        date: sub.createdAt,
        solution: sub.programId || "zealtho",
        billedTo,
        professional: {
          // not a doctor service — show program as the "provider"
          name: sub.programName || "Program Subscription",
          specialization: sub.tenure || "",
          registrationNumber: "",
        },
        summary: {
          consultationFee: sub.amount || 0,
          processingFee: 0,
          total: sub.amount || 0,
          currency: "USD",
        },
        appointment: {
          scheduledAt: sub.startDate || sub.createdAt,
        },
      };
      return successResponse(res, { receipt }, "Receipt fetched", 200);
    }

    // ❌ Not found in any source
    return errorResponse(res, "Receipt not found", 404);
  } catch (err) {
    console.error("[BILLING RECEIPT ERROR]:", err);
    return errorResponse(res, "Failed to fetch receipt", 500);
  }
};

// ============================================
// 📦 GET MY SUBSCRIPTION (for one program)
// ============================================
// Returns the user's most recent subscription for a program,
// with computed current-week / total-weeks / progress for the UI.
const getMySubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const { programId } = req.query;

    // 🛡️ Validate programId
    const ALLOWED = ["yogat20", "diabmukt", "mommyfit", "slimfitter"];
    if (!programId || !ALLOWED.includes(programId)) {
      return errorResponse(res, "Valid programId is required", 400);
    }

    // 📥 Most recent subscription for this user + program
    const sub = await ProgramSubscription.findOne({
      programId,
      $or: [{ customer: userId }, { doctor: userId }],
    })
      .sort({ createdAt: -1 })
      .lean();

    // No subscription — user never bought this program
    if (!sub) {
      return successResponse(
        res,
        { subscription: null },
        "No subscription found",
        200
      );
    }

    // 🕒 Compute time progress
    const now = new Date();
    const start = new Date(sub.startDate);
    const end = new Date(sub.endDate);

    // Total + elapsed days
    const msPerDay = 1000 * 60 * 60 * 24;
    const totalDays = Math.max(1, Math.round((end - start) / msPerDay));
    const elapsedDays = Math.min(
      totalDays,
      Math.max(0, Math.round((now - start) / msPerDay))
    );

    // Total weeks — use `weeks` field if present, else derive from days
    const totalWeeks = sub.weeks || Math.ceil(totalDays / 7);
    // Current week — 1-based, capped at totalWeeks
    const currentWeek = Math.min(
      totalWeeks,
      Math.max(1, Math.ceil((elapsedDays + 1) / 7))
    );

    // Progress % of time elapsed
    const progressPercent = Math.min(
      100,
      Math.max(0, Math.round((elapsedDays / totalDays) * 100))
    );

    // Weeks remaining
    const weeksRemaining = Math.max(0, totalWeeks - currentWeek);

    // Is it still usable (active + not past end date)
    const isActive = sub.status === "active" && end > now;

    return successResponse(
      res,
      {
        subscription: {
          id: sub._id,
          programId: sub.programId,
          programName: sub.programName,
          tenure: sub.tenure,
          amount: sub.amount,
          status: sub.status,
          isActive,
          startDate: sub.startDate,
          endDate: sub.endDate,
          currentWeek,
          totalWeeks,
          weeksRemaining,
          progressPercent,
        },
      },
      "Subscription fetched",
      200
    );
  } catch (err) {
    console.error("[GET MY SUBSCRIPTION ERROR]:", err);
    return errorResponse(res, "Failed to fetch subscription", 500);
  }
};

module.exports = { getSummary, listTransactions, getReceipt, getMySubscription };