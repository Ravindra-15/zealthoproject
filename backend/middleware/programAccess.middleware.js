const ProgramSubscription = require("../models/ProgramSubscription");

// ============================================
// 🔐 PROGRAM ACCESS MIDDLEWARE
// ============================================
const requireActiveProgramSubscription =
  async (req, res, next) => {
    try {
      // ============================================
      // 👤 DETECT USER TYPE
      // ============================================
      const customerId =
        req.user?._id || null;

      const doctorId =
        req.doctor?._id || null;

      // 🚫 No auth
      if (!customerId && !doctorId) {
        return res.status(401).json({
          success: false,
          message:
            "Unauthorized access.",
        });
      }

      // ============================================
      // 🔍 BUILD QUERY
      // ============================================
      const query = {
        status: "active",

        paymentStatus: "paid",

        endDate: {
          $gt: new Date(),
        },
      };

      // Customer
      if (customerId) {
        query.customer = customerId;
      }

      // Doctor
      if (doctorId) {
        query.doctor = doctorId;
      }

      // ============================================
      // 📦 FIND ACTIVE SUBSCRIPTION
      // ============================================
      const subscription =
        await ProgramSubscription.findOne(
          query
        );

      // 🚫 No active subscription
      if (!subscription) {
        return res.status(403).json({
          success: false,

          message:
            "Active subscription required.",
        });
      }

      // ============================================
      // 📆 AUTO EXPIRE CHECK
      // ============================================
      const now = new Date();

      if (
        subscription.endDate &&
        subscription.endDate < now
      ) {
        subscription.status =
          "expired";

        await subscription.save();

        return res.status(403).json({
          success: false,

          message:
            "Your subscription has expired.",
        });
      }

      // ============================================
      // 📈 TRACK ACCESS
      // ============================================
      subscription.lastAccessedAt =
        new Date();

      await subscription.save();

      // ============================================
      // 📦 ATTACH SUBSCRIPTION
      // ============================================
      req.programSubscription =
        subscription;

      // ============================================
      // ✅ ACCESS GRANTED
      // ============================================
      next();
    } catch (err) {
      console.error(
        "Program access middleware error:",
        err
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to validate subscription access.",
      });
    }
  };

module.exports = {
  requireActiveProgramSubscription,
};