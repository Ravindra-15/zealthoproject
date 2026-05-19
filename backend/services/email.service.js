// services/email.service.js
// Sends OTP + appointment reminder emails via Nodemailer (Gmail SMTP).

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ============================================
// 🔐 OTP EMAIL (existing — unchanged)
// ============================================
const sendEmail = async (to, otp) => {
  try {
    await transporter.sendMail({
      from: `"Zealtho" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Your OTP Code",
      html: `
        <h2>Zealtho Verification Code</h2>
        <p>Your OTP is:</p>
        <h1>${otp}</h1>
        <p>This OTP is valid for 5 minutes.</p>
      `,
    });
  } catch (error) {
    console.error("Email Error:", error.message);
    throw new Error("Failed to send email");
  }
};

// ============================================
// 🛠️ HELPER — format date/time for emails
// ============================================
const formatAppointmentTime = (date) => {
  return new Date(date).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
};

// ============================================
// 📧 24-HOUR APPOINTMENT REMINDER
// ============================================
const sendAppointmentReminder24h = async ({
  to,
  recipientName,
  otherPartyName,
  scheduledAt,
  isDoctor = false,
}) => {
  const formattedTime = formatAppointmentTime(scheduledAt);
  const otherPartyLabel = isDoctor ? "patient" : "doctor";

  try {
    await transporter.sendMail({
      from: `"Zealtho" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Reminder: Your appointment is tomorrow",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f97316;">Appointment Reminder</h2>
          <p>Hi ${recipientName},</p>
          <p>This is a friendly reminder that you have a consultation scheduled with your ${otherPartyLabel} <strong>${otherPartyName}</strong> tomorrow.</p>
          <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 12px 16px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px;"><strong>📅 ${formattedTime}</strong></p>
          </div>
          <p>Please be on time and ensure your internet connection is stable. The consultation duration is <strong>20 minutes</strong>.</p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">— The Zealtho Team</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("24h Reminder Email Error:", error.message);
  }
};

// ============================================
// 📧 1-HOUR APPOINTMENT REMINDER
// ============================================
const sendAppointmentReminder1h = async ({
  to,
  recipientName,
  otherPartyName,
  scheduledAt,
  isDoctor = false,
}) => {
  const formattedTime = formatAppointmentTime(scheduledAt);
  const otherPartyLabel = isDoctor ? "patient" : "doctor";

  try {
    await transporter.sendMail({
      from: `"Zealtho" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Reminder: Your appointment is in 1 hour",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Your appointment is in 1 hour</h2>
          <p>Hi ${recipientName},</p>
          <p>Your consultation with your ${otherPartyLabel} <strong>${otherPartyName}</strong> is starting soon.</p>
          <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 16px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px;"><strong>📅 ${formattedTime}</strong></p>
          </div>
          <p>Please ensure you're ready to join the meeting on time. The consultation will last <strong>20 minutes</strong>.</p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">— The Zealtho Team</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("1h Reminder Email Error:", error.message);
  }
};

module.exports = sendEmail;
module.exports.sendAppointmentReminder24h = sendAppointmentReminder24h;
module.exports.sendAppointmentReminder1h = sendAppointmentReminder1h;