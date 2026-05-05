/**
 * CUSTOMER MODULE — Public Doctor Controller
 * Thin HTTP layer over customer.doctor.service.
 * Used by Book Doctor page (no auth required).
 */

const customerDoctorService = require("../services/customer.doctor.service");

// ============================================
// 📋 LIST PUBLIC DOCTORS
// ============================================
const listDoctors = async (req, res) => {
  try {
    const { page, limit, search, specialty } = req.query;
    const result = await customerDoctorService.listPublicDoctors({
      page,
      limit,
      search,
      specialty,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("[CUSTOMER DOCTOR LIST ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch doctors",
    });
  }
};

// ============================================
// 👁️ GET PUBLIC DOCTOR
// ============================================
const getDoctor = async (req, res) => {
  try {
    const doctor = await customerDoctorService.getPublicDoctorById(
      req.params.id
    );

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: { doctor },
    });
  } catch (err) {
    console.error("[CUSTOMER GET DOCTOR ERROR]:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch doctor",
    });
  }
};

module.exports = {
  listDoctors,
  getDoctor,
};