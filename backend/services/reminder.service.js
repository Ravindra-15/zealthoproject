/**
 * REMINDER SERVICE
 * Cron job — runs every 15 minutes.
 * Checks appointments starting in ~24h and ~1h, sends email reminders
 * to both user and doctor. Uses `reminded24hAt` / `reminded1hAt` flags
 * on Appointment to avoid duplicate sends.
 */

const cron = require("node-cron");
const Appointment = require("../models/Appointment");
const User = require("../models/User");
const Doctor = require("../models/Doctor");
const {
    sendAppointmentReminder24h,
    sendAppointmentReminder1h,
} = require("./email.service");

// ============================================
// 🔍 FIND + SEND 24-HOUR REMINDERS
// ============================================
const send24hReminders = async () => {
    const now = new Date();
    // Window: appointments starting between 23h and 25h from now
    const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    //     //For testing
    // const windowStart = new Date(now.getTime());
    // const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const appointments = await Appointment.find({
        status: { $in: ["pending", "confirmed"] },
        scheduledAt: { $gte: windowStart, $lte: windowEnd },
        reminded24hAt: null,
    }).lean();

    for (const apt of appointments) {
        try {
            const [user, doctor] = await Promise.all([
                User.findById(apt.user).select("email fullName nickName").lean(),
                Doctor.findById(apt.doctor).select("personalEmail fullName").lean(),
            ]);

            // 📧 Send to user
            if (user?.email) {
                await sendAppointmentReminder24h({
                    to: user.email,
                    recipientName: user.fullName || user.nickName || "there",
                    otherPartyName: apt.doctorName,
                    scheduledAt: apt.scheduledAt,
                    isDoctor: false,
                });
            }

            // 📧 Send to doctor
            if (doctor?.personalEmail) {
                await sendAppointmentReminder24h({
                    to: doctor.personalEmail,
                    recipientName: doctor.fullName || "Doctor",
                    otherPartyName: apt.patientName,
                    scheduledAt: apt.scheduledAt,
                    isDoctor: true,
                });
            }

            // ✅ Mark sent
            await Appointment.findByIdAndUpdate(apt._id, { reminded24hAt: new Date() });
            console.log(`[REMINDER 24h] Sent for appointment ${apt._id}`);
        } catch (err) {
            console.error(`[REMINDER 24h ERROR] ${apt._id}:`, err.message);
        }
    }
};

// ============================================
// 🔍 FIND + SEND 1-HOUR REMINDERS
// ============================================
const send1hReminders = async () => {
    const now = new Date();
    // console.log("[DEBUG] send1hReminders called at:", now.toISOString());
    // Window: appointments starting between 45min and 75min from now
    const windowStart = new Date(now.getTime() + 45 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 75 * 60 * 1000);

    // //Testing Purpose -> Uncomment next two lines and Comment above two lines then move to server.js -> uncomment the temp setTimeout block
    // const windowStart = new Date(now.getTime());
    // const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);


    const appointments = await Appointment.find({
        status: { $in: ["pending", "confirmed"] },
        scheduledAt: { $gte: windowStart, $lte: windowEnd },
        reminded1hAt: null,
    }).lean();
    // console.log("[DEBUG] Found appointments:", appointments.length);

    for (const apt of appointments) {
        // console.log("[DEBUG] Processing appointment:", apt._id, "scheduledAt:", apt.scheduledAt);
        try {
            const [user, doctor] = await Promise.all([
                User.findById(apt.user).select("email fullName nickName").lean(),
                Doctor.findById(apt.doctor).select("personalEmail fullName").lean(),
            ]);

            if (user?.email) {
                await sendAppointmentReminder1h({
                    to: user.email,
                    recipientName: user.fullName || user.nickName || "there",
                    otherPartyName: apt.doctorName,
                    scheduledAt: apt.scheduledAt,
                    isDoctor: false,
                });
            }

            if (doctor?.personalEmail) {
                await sendAppointmentReminder1h({
                    to: doctor.personalEmail,
                    recipientName: doctor.fullName || "Doctor",
                    otherPartyName: apt.patientName,
                    scheduledAt: apt.scheduledAt,
                    isDoctor: true,
                });
            }

            await Appointment.findByIdAndUpdate(apt._id, { reminded1hAt: new Date() });
            console.log(`[REMINDER 1h] Sent for appointment ${apt._id}`);
        } catch (err) {
            console.error(`[REMINDER 1h ERROR] ${apt._id}:`, err.message);
        }
    }
};

// ============================================
// ⏰ CRON STARTER — call this from server.js
// ============================================
const startReminderCron = () => {
    // Runs every 15 minutes
    cron.schedule("*/15 * * * *", async () => {
        console.log("[REMINDER CRON] Running...");
        await send24hReminders();
        await send1hReminders();
    });

    console.log("✅ Reminder cron scheduled (every 15 mins)");
};

module.exports = { startReminderCron, send24hReminders, send1hReminders };