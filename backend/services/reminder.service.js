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
const ProgramSubscription = require("../models/ProgramSubscription");
const Notification = require("../models/Notification");
const {
    sendAppointmentReminder24h,
    sendAppointmentReminder1h,
    sendPlanExpiryReminder,
    sendBirthdayWish,
} = require("./email.service");

const programDisplayNames = {
    yogat20: "Yoga T20",
    diabmukt: "Diabmukt",
    mommyfit: "MommyFit",
    slimfitter: "Slimfitter",
};

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
// 🔔 FIND + SEND PLAN-EXPIRY REMINDERS (last 7 days, once per day)
// ============================================
const sendPlanExpiryReminders = async () => {
    const now = new Date();
    // Active subs that end within the next 7 days (and haven't ended yet)
    const windowEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const todayKey = now.toISOString().slice(0, 10); // "YYYY-MM-DD" (UTC)

    const subs = await ProgramSubscription.find({
        purchasedByRole: "customer",
        status: "active",
        endDate: { $gt: now, $lte: windowEnd },
    }).lean();

    for (const sub of subs) {
        try {
            // Skip if already notified today (one email + one notification per calendar day)
            if (sub.lastExpiryNotifiedOn === todayKey) continue;

            const user = await User.findById(sub.customer)
                .select("email fullName nickName")
                .lean();
            if (!user) continue;

            const msLeft = new Date(sub.endDate).getTime() - now.getTime();
            const daysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
            const programName = sub.programName || programDisplayNames[sub.programId] || "your program";

            // 📧 Email
            if (user.email) {
                await sendPlanExpiryReminder({
                    to: user.email,
                    recipientName: user.fullName || user.nickName || "there",
                    programName,
                    endDate: sub.endDate,
                    daysLeft,
                });
            }

            // 🔔 In-app notification (redirects to billing/renewal on click)
            const dayLabel = daysLeft <= 1 ? (daysLeft === 1 ? "in 1 day" : "today") : `in ${daysLeft} days`;
            await Notification.create({
                userId: sub.customer,
                userType: "customer",
                type: "plan_expiring",
                title: "Plan Expiring Soon",
                body: `Your ${programName} plan expires ${dayLabel}. Renew now to keep your access.`,
                metadata: { programId: sub.programId, link: "/my-plans-and-billings" },
            });

            // ✅ Mark notified for today
            await ProgramSubscription.findByIdAndUpdate(sub._id, {
                lastExpiryNotifiedOn: todayKey,
            });
            console.log(`[PLAN EXPIRY] Notified user ${sub.customer} for ${sub.programId} (${daysLeft}d left)`);
        } catch (err) {
            console.error(`[PLAN EXPIRY ERROR] ${sub._id}:`, err.message);
        }
    }
};

// ============================================
// 🎂 FIND + SEND BIRTHDAY WISHES (once per year per user)
// ============================================
const sendBirthdayWishes = async () => {
    const now = new Date();
    const todayMonth = now.getUTCMonth() + 1; // 1-12
    const todayDay = now.getUTCDate();        // 1-31
    const yearKey = String(now.getUTCFullYear()); // dedup: one wish per year

    // Customers with a date of birth set, not yet wished this year
    const users = await User.find({
        dob: { $ne: null },
        $or: [
            { lastBirthdayWishOn: { $ne: yearKey } },
            { lastBirthdayWishOn: null },
        ],
    })
        .select("email fullName nickName dob lastBirthdayWishOn")
        .lean();

    for (const user of users) {
        try {
            const dob = new Date(user.dob);
            if (isNaN(dob.getTime())) continue;

            // Match on month + day (UTC)
            if (dob.getUTCMonth() + 1 !== todayMonth || dob.getUTCDate() !== todayDay) {
                continue;
            }

            const recipientName = user.fullName || user.nickName || "there";

            // 📧 Email
            if (user.email) {
                await sendBirthdayWish({ to: user.email, recipientName });
            }

            // 🔔 In-app notification
            await Notification.create({
                userId: user._id,
                userType: "customer",
                type: "birthday",
                title: "Happy Birthday! 🎂",
                body: `Wishing you a wonderful birthday, ${recipientName}! Here's to another year of health and happiness.`,
                metadata: {},
            });

            // 📲 WHATSAPP (future): add a single sendBirthdayWhatsApp(...) call here.
            // The dedup + birthday-match logic above already gates it to once/year.

            // ✅ Mark wished for this year
            await User.findByIdAndUpdate(user._id, { lastBirthdayWishOn: yearKey });
            console.log(`[BIRTHDAY] Wished user ${user._id} for ${yearKey}`);
        } catch (err) {
            console.error(`[BIRTHDAY ERROR] ${user._id}:`, err.message);
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
        await sendPlanExpiryReminders();
        await sendBirthdayWishes();
    });

    console.log("✅ Reminder cron scheduled (every 15 mins)");
};

module.exports = { startReminderCron, send24hReminders, send1hReminders, sendPlanExpiryReminders, sendBirthdayWishes };