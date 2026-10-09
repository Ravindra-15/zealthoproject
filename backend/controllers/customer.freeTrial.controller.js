/**
 * CUSTOMER MODULE — Free Trial Controller (YogaT20)
 */

const freeTrialService = require("../services/customer.freeTrial.service");
const User = require("../models/User");

// GET /api/customer/free-trial/status
const getStatus = async (req, res) => {
  try {
    const status = await freeTrialService.getTrialStatus(req.user.id);
    return res.status(200).json({ success: true, data: status });
  } catch (err) {
    console.error("[FREE TRIAL STATUS ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch trial status" });
  }
};

// POST /api/customer/free-trial/request
const requestTrial = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("fullName nickName").lean();
    const result = await freeTrialService.requestTrial(req.user.id, user);

    if (result.error) {
      return res.status(result.error.status).json({ success: false, message: result.error.message });
    }

    return res.status(201).json({
      success: true,
      message: "Your free trial request has been sent for approval.",
      data: { request: result.request },
    });
  } catch (err) {
    console.error("[FREE TRIAL REQUEST ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to submit trial request" });
  }
};

module.exports = { getStatus, requestTrial };
