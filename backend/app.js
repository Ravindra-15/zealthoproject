/**
 * Main Express application setup.
 * Keeps existing routes intact + adds admin support safely.
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// 👤 CUSTOMER ROUTES (existing)
const authRoutes = require("./routes/auth.routes");
const otpRoutes = require("./routes/otp.routes");
const userRoutes = require("./routes/user.routes");
const customerDoctorRoutes = require("./routes/customer.doctor.routes");
const customerAppointmentRoutes = require("./routes/customer.appointment.routes");
const customerBodyProfileRoutes = require("./routes/customer.bodyProfile.routes");
const customerProfileRoutes = require("./routes/customer.profile.routes");
const customerNotificationRoutes = require("./routes/customer.notification.routes");
const customerBillingRoutes = require("./routes/customer.billing.routes");
const customerProgramRoutes = require("./routes/customer.program.routes");

const customerEnquiryRoutes = require("./routes/customer.enquiry.routes");
const customerClinicalVideoRoutes = require("./routes/customer.clinicalVideo.routes");


// 🔐 ADMIN ROUTES (new - safe add)
const adminAuthRoutes = require("./routes/admin.auth.routes");
const adminDashboardRoutes = require("./routes/admin.dashboard.routes");
const adminUserRoutes = require("./routes/admin.user.routes");
const adminDoctorRoutes = require("./routes/admin.doctor.routes");
const adminAppointmentRoutes = require('./routes/admin.appointment.routes')
const doctorAuthRoutes = require("./routes/doctor.auth.routes");
const doctorAvailabilityRoutes = require("./routes/doctor.availability.routes")
const doctorAppointmentRoutes = require("./routes/doctor.appointment.routes");
const adminFinancialReportRoutes = require("./routes/admin.financialReport.routes");
const adminEnquiryRoutes = require("./routes/admin.enquiry.routes");
const adminBillingRoutes = require("./routes/admin.billing.routes");
const adminProgramPlanRoutes = require("./routes/admin.programPlan.routes");
const customerProgramPlanRoutes = require("./routes/customer.programPlan.routes");
const adminClinicalVideoRoutes = require("./routes/admin.clinicalVideo.routes");
const adminHabitConfigRoutes = require("./routes/admin.habitConfig.routes");

// ⚠️ ERROR HANDLER (your style)
const { errorHandler } = require("./middleware/error.middleware");

// ============================================
// 🛡️ SECURITY
// ============================================
app.use(helmet());

// ============================================
// 🌐 CORS
// ============================================
// Allow both Zealtho and YogaT20 frontends (and any other program frontends added later)
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
  : ["https://zealthoproject.vercel.app","http://localhost:5173", "http://localhost:5174"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// ============================================
// 📦 BODY PARSER
// ============================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    maxAge: "7d",
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "http://localhost:5173"); // 🆕 ADD THIS LINE
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");                                    // 🆕 AND THIS LINE
    },
  })
);
// ============================================
// 📝 LOGGER (dev only)
// ============================================
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// ============================================
// 💚 HEALTH CHECK
// ============================================
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
  });
});

// ============================================
// 👤 CUSTOMER ROUTES (UNCHANGED BEHAVIOR)
// ============================================
app.use("/api/auth", authRoutes);

// ⚠️ FIX: OTP should NOT be under /auth
app.use("/api/otp", otpRoutes);

// ⚠️ FIX: use plural for consistency
app.use("/api/users", userRoutes);
app.use("/api/customer/doctors", customerDoctorRoutes);
app.use("/api/customer/doctors", customerAppointmentRoutes.publicDoctorRouter);
app.use("/api/customer/appointments", customerAppointmentRoutes.appointmentRouter);
app.use("/api/customer/body-profile", customerBodyProfileRoutes);
app.use("/api/customer/programs", customerProgramRoutes);

app.use("/api/customer/profile", customerProfileRoutes);
app.use("/api/customer/notifications", customerNotificationRoutes);
app.use("/api/customer/billing", customerBillingRoutes);

app.use("/api/customer/enquiries", customerEnquiryRoutes);
app.use("/api/customer/clinical-videos", customerClinicalVideoRoutes);

app.use("/api/admin/program-plans", adminProgramPlanRoutes);
app.use("/api/customer/program-plans", customerProgramPlanRoutes);
// ============================================
// 🔐 ADMIN ROUTES (NEW)
// ============================================
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/doctor/auth", doctorAuthRoutes);
app.use("/api/doctor/availability", doctorAvailabilityRoutes);
app.use("/api/doctor/appointments", doctorAppointmentRoutes);
// TODO: Future admin routes
app.use("/api/admin/doctors", adminDoctorRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/appointments", adminAppointmentRoutes);

// app.use("/api/admin/activities", adminActivityRoutes);
app.use("/api/admin/dashboard", adminDashboardRoutes);
app.use("/api/admin/enquiries", adminEnquiryRoutes);
app.use("/api/admin/financial-reports", adminFinancialReportRoutes);
app.use("/api/admin/billing", adminBillingRoutes);
app.use("/api/admin/clinical-videos", adminClinicalVideoRoutes);
app.use("/api/admin/habit-configs", adminHabitConfigRoutes);
// ============================================
// 🚫 404 HANDLER
// ============================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ============================================
// ⚠️ GLOBAL ERROR HANDLER
// ============================================
app.use(errorHandler);

module.exports = app;