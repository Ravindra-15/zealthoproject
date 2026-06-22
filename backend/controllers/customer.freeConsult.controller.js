// controllers/customer.freeConsult.controller.js
// Returns the logged-in user's free-consult cards for a program,
// with live validity status, so the dashboard can render them.

const FreeConsultCard = require("../models/FreeConsultCard");

// ============================================
// 🎁 GET MY FREE-CONSULT CARDS (for a program)
// GET /api/customer/free-consults?programId=yogat20
// ============================================
const getMyFreeConsultCards = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const programId = req.query.programId;
    if (!programId) {
      return res
        .status(400)
        .json({ success: false, message: "programId is required" });
    }

    const now = new Date();

    // all cards for this user + program, in card order
    const cards = await FreeConsultCard.find({ user: userId, programId })
      .populate("appointment", "scheduledAt status doctorName meetingLink meetingLinkSentAt")
      .sort({ cardIndex: 1 })
      .lean();

    // annotate each card with a live "isActiveNow" flag (window covers now + still available)
    const annotated = cards.map((c) => ({
      _id: c._id,
      cardIndex: c.cardIndex,
      status: c.status,
      validFrom: c.validFrom,
      validUntil: c.validUntil,
      appointment: c.appointment || null,
      // bookable right now?
      isBookableNow:
        c.status === "available" &&
        new Date(c.validFrom) <= now &&
        new Date(c.validUntil) > now,
    }));

    // count currently bookable (for the highlight banner)
    const bookableCount = annotated.filter((c) => c.isBookableNow).length;

    return res.status(200).json({
      success: true,
      data: {
        cards: annotated,
        bookableCount,
        total: annotated.length,
      },
    });
  } catch (err) {
    console.error("[GET FREE CONSULT CARDS ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load free consultations",
    });
  }
};

module.exports = { getMyFreeConsultCards };