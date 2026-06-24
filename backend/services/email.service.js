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

// ============================================
// 📧 RESCHEDULE NOTIFICATION
// ============================================
// Sent to the OTHER party when an appointment is rescheduled.
const sendRescheduleNotification = async ({
  to,
  recipientName,
  otherPartyName,
  oldTime,
  newTime,
  reason,
  rescheduledByLabel, // "patient" | "doctor"
  isDoctor = false,
}) => {
  const oldFormatted = formatAppointmentTime(oldTime);
  const newFormatted = formatAppointmentTime(newTime);
  const otherPartyLabel = isDoctor ? "patient" : "doctor";

  try {
    await transporter.sendMail({
      from: `"Zealtho" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Your appointment has been rescheduled",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f97316;">Appointment Rescheduled</h2>
          <p>Hi ${recipientName},</p>
          <p>Your consultation with your ${otherPartyLabel} <strong>${otherPartyName}</strong> has been rescheduled by the ${rescheduledByLabel}.</p>
          <div style="background: #f9fafb; border-left: 4px solid #9ca3af; padding: 12px 16px; margin: 16px 0;">
            <p style="margin: 0; font-size: 13px; color: #6b7280; text-decoration: line-through;">Previous: ${oldFormatted}</p>
          </div>
          <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 12px 16px; margin: 16px 0;">
            <p style="margin: 0; font-size: 14px;"><strong>📅 New time: ${newFormatted}</strong></p>
          </div>
          ${reason ? `<p style="font-size: 14px;"><strong>Reason:</strong> ${reason}</p>` : ""}
          <p>Please update your calendar. The consultation duration is <strong>20 minutes</strong>.</p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">— The Zealtho Team</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Reschedule Email Error:", error.message);
  }
};

// ============================================
// 📧 PLAN EXPIRY REMINDER
// ============================================
// Sent daily during the last 7 days before a subscription expires.
const sendPlanExpiryReminder = async ({
  to,
  recipientName,
  programName,
  endDate,
  daysLeft,
}) => {
  const formattedEnd = new Date(endDate).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const dayLabel = daysLeft <= 0 ? "today" : daysLeft === 1 ? "in 1 day" : `in ${daysLeft} days`;

  try {
    await transporter.sendMail({
      from: `"Zealtho" <${process.env.EMAIL_USER}>`,
      to,
      subject: `Your ${programName} plan expires ${dayLabel}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f97316;">Your Plan Is About to Expire</h2>
          <p>Hi ${recipientName},</p>
          <p>Your <strong>${programName}</strong> subscription expires <strong>${dayLabel}</strong>.</p>
          <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 12px 16px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px;"><strong>📅 Expires on: ${formattedEnd}</strong></p>
          </div>
          <p>Renew now to keep your access to videos, progress tracking, and free doctor consultations without interruption.</p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">— The Zealtho Team</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Plan Expiry Email Error:", error.message);
  }
};

// ============================================
// 🎂 BIRTHDAY WISH
// ============================================
const sendBirthdayWish = async ({ to, recipientName }) => {
  try {
    await transporter.sendMail({
      from: `"Zealtho" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Happy Birthday from Zealtho! 🎉",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f97316;">Happy Birthday, ${recipientName}! 🎂</h2>
          <p>Wishing you a wonderful day filled with health, happiness, and good energy.</p>
          <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 12px 16px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px;">🎁 Here's to another year of progress on your wellness journey. We're glad to have you with us!</p>
          </div>
          <p>Have an amazing day.</p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">— The Zealtho Team</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Birthday Email Error:", error.message);
  }
};

// ============================================
// 👋 WELCOME EMAIL (after signup verification) — ticket/card style
// ============================================
const sendWelcomeEmail = async ({ to, recipientName }) => {
  const name = recipientName || "there";
  const brandColor = "#2563EB";
  try {
    await transporter.sendMail({
      from: `"Zealtho" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Welcome to Zealtho! 🎉",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background:#ffffff;">
          <div style="text-align:center; padding:28px 20px 8px;">
            <span style="font-size:22px; font-weight:800; color:${brandColor}; letter-spacing:0.5px;">Zealtho</span>
          </div>
          <div style="text-align:center; padding:10px 24px;">
            <div style="width:64px; height:64px; border-radius:50%; background:#2563EB1A; display:inline-block; line-height:64px; font-size:30px;">✅</div>
            <h2 style="color:#111827; margin:18px 0 4px;">Welcome, ${name}!</h2>
            <p style="color:#6B7280; font-size:14px; margin:0;">Your account is all set. We're glad to have you.</p>
          </div>
          <div style="margin:24px; border:1px dashed #D1D5DB; border-radius:14px; padding:20px; background:#F9FAFB;">
            <p style="margin:0 0 6px; font-size:14px; color:#374151;"><strong>Getting started</strong></p>
            <p style="margin:0; font-size:13px; color:#6B7280; line-height:1.6;">Explore your dashboard, track your daily progress, and book your free doctor consultations included with your plan.</p>
          </div>
          <div style="text-align:center; padding:0 24px 10px;">
            <span style="display:inline-block; background:${brandColor}; color:#ffffff; font-size:14px; font-weight:600; padding:11px 26px; border-radius:9999px;">Welcome aboard</span>
          </div>
          <div style="background:${brandColor}; color:#ffffff; text-align:center; padding:22px; margin-top:18px;">
            <p style="margin:0; font-size:13px; opacity:0.95;">We look forward to supporting your wellness journey.</p>
            <p style="margin:8px 0 0; font-size:11px; opacity:0.8;">© ${new Date().getFullYear()} Zealtho. All rights reserved.</p>
          </div>
        </div>
      `,
    });
  } catch (error) {
    console.error("Welcome Email Error:", error.message);
  }
};

module.exports = sendEmail;
module.exports.sendWelcomeEmail = sendWelcomeEmail;
module.exports.sendAppointmentReminder24h = sendAppointmentReminder24h;
module.exports.sendAppointmentReminder1h = sendAppointmentReminder1h;
module.exports.sendRescheduleNotification = sendRescheduleNotification;
module.exports.sendPlanExpiryReminder = sendPlanExpiryReminder;
module.exports.sendBirthdayWish = sendBirthdayWish;