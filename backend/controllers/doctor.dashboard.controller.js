const doctorDashboardService = require("../services/doctor.dashboard.service");

const getDashboard = async (req, res) => {
  try {
    const data = await doctorDashboardService.getDashboardData(req.doctorId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("[DOCTOR DASHBOARD ERROR]:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch dashboard" });
  }
};

module.exports = { getDashboard };