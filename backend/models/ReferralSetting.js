// models/ReferralSetting.js
// Single-doc config holding admin's current referral reward days.
// Helper getRewardDays() returns the value (creates default 30 if missing).

const mongoose = require("mongoose");

const referralSettingSchema = new mongoose.Schema(
  {
    // 🎁 Days of yogaT20 granted per successful referral (admin-configurable)
    rewardDays: {
      type: Number,
      required: true,
      min: 0,
      default: 30,
    },
  },
  { timestamps: true }
);

// 📥 Returns the current reward days; creates the default doc on first call
referralSettingSchema.statics.getRewardDays = async function () {
  let setting = await this.findOne();
  if (!setting) {
    setting = await this.create({ rewardDays: 30 });
  }
  return setting.rewardDays;
};

module.exports = mongoose.model("ReferralSetting", referralSettingSchema);