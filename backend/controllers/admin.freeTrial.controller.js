/**
 * ADMIN MODULE — Free Trial Approval Controller (YogaT20)
 */

const freeTrialService = require("../services/admin.freeTrial.service");

// GET /api/admin/trial-requests
const list = async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    const result = await freeTrialService.listRequests({ status, page, limit });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("[ADMIN TRIAL LIST ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch trial requests" });
  }
};

// GET /api/admin/trial-requests/pending-count
const getPendingCount = async (req, res) => {
  try {
    const count = await freeTrialService.getPendingCount();
    return res.status(200).json({ success: true, data: { count } });
  } catch (err) {
    console.error("[ADMIN TRIAL COUNT ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch pending count" });
  }
};

// POST /api/admin/trial-requests/:id/approve
const approve = async (req, res) => {
  try {
    const result = await freeTrialService.approveRequest(req.params.id, req.admin._id);
    if (result.error) {
      return res.status(result.error.status).json({ success: false, message: result.error.message });
    }
    return res.status(200).json({ success: true, message: "Trial approved", data: result });
  } catch (err) {
    console.error("[ADMIN TRIAL APPROVE ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to approve request" });
  }
};

// POST /api/admin/trial-requests/:id/reject
const reject = async (req, res) => {
  try {
    const { reason } = req.body;
    const result = await freeTrialService.rejectRequest(req.params.id, req.admin._id, reason);
    if (result.error) {
      return res.status(result.error.status).json({ success: false, message: result.error.message });
    }
    return res.status(200).json({ success: true, message: "Trial request rejected", data: result });
  } catch (err) {
    console.error("[ADMIN TRIAL REJECT ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to reject request" });
  }
};

module.exports = { list, getPendingCount, approve, reject };
