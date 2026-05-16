/**
 * DOCTOR MODULE — Dashboard
 * Greeting + stat cards + Today's Schedule + Quick Actions with slot toggles.
 */
import React, { useMemo, useState } from "react";
import useDoctorDashboard from "../../../hooks/useDoctorDashboard";
import {
  Users,
  CalendarCheck,
  DollarSign,
  Clock,
  CalendarX,
  Sparkles,
} from "lucide-react";
import { useDoctorAuth } from "../../../context/DoctorAuthContext";
import {
  createTimeOff,
  deleteTimeOff,
} from "../../../services/doctorAvailabilityService";
import toast from "react-hot-toast";
import { formatUtcTime24h } from "../../../utils/time";
// ============================================
// 🌅 Greeting helper
// ============================================
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const formatToday = () => {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

// ============================================
// ⚡ Quick Action Slot (toggle on/off)
// ============================================
const QuickActionSlot = ({ slot, onToggle }) => {
  const [loading, setLoading] = useState(false);

  // const formatTime = (hhmm) => {
  //   const [h, m] = hhmm.split(":").map(Number);
  //   const period = h >= 12 ? "PM" : "AM";
  //   const hour12 = h % 12 || 12;
  //   return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
  // };
  const formatTime = (hhmm) => {
  if (!hhmm) return "";
  return hhmm;
};

  const handleToggle = async () => {
    if (slot.isBooked) {
      toast.error("Can't toggle — this slot is booked");
      return;
    }

    try {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];

      if (slot.isBlocked) {
        await deleteTimeOff(slot.timeOffId);
        toast.success("Slot enabled");
      } else {
        const [h, m] = slot.time.split(":").map(Number);
        const startsAt = new Date(`${today}T00:00:00.000Z`);
        startsAt.setUTCHours(h, m, 0, 0);
        const endsAt = new Date(startsAt.getTime() + 30 * 60000);
        await createTimeOff({
          type: "slot",
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          reason: "Disabled from dashboard",
        });
        toast.success("Slot disabled");
      }
      onToggle();
    } catch (err) {
      toast.error("Failed to update slot");
    } finally {
      setLoading(false);
    }
  };

  const isEnabled = !slot.isBlocked && !slot.isBooked;

  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50">
      <span className="text-sm font-medium text-gray-700">
        {formatTime(slot.time)}
        {slot.isBooked && (
          <span className="ml-2 text-[10px] text-indigo-600 font-semibold">
            BOOKED
          </span>
        )}
      </span>
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading || slot.isBooked}
        className={`
          relative inline-flex h-5 w-9 items-center rounded-full transition-colors
          ${isEnabled ? "bg-indigo-600" : "bg-gray-300"}
          ${slot.isBooked ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <span
          className={`
            inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform
            ${isEnabled ? "translate-x-5" : "translate-x-1"}
          `}
        />
      </button>
    </div>
  );
};

// ============================================
// 📊 Stat card
// ============================================
const StatCard = ({ icon: Icon, label, value, hint, accent }) => {
  const accentMap = {
    indigo: "from-indigo-50 to-indigo-100/50 text-indigo-600",
    blue: "from-blue-50 to-blue-100/50 text-blue-600",
    green: "from-green-50 to-green-100/50 text-green-600",
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-5">
      <div
        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accentMap[accent]} flex items-center justify-center mb-4`}
      >
        <Icon className="w-5 h-5" strokeWidth={2} />
      </div>
      <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
        {label}
      </p>
      <p className="mt-1.5 text-3xl font-bold text-gray-900 tracking-tight">
        {value}
      </p>
      <p className="mt-1 text-xs text-gray-500">{hint}</p>
    </div>
  );
};

const Dashboard = () => {
  const { doctor } = useDoctorAuth();

  const greeting = useMemo(() => getGreeting(), []);
  const today = useMemo(() => formatToday(), []);

  const { data, loading, refetch } = useDoctorDashboard();

  const stats = {
    consultations: data?.totalConsultations || 0,
    appointments: data?.upcomingAppointments || 0,
    revenue: data?.revenueThisMonth || 0,
  };

  const todaySchedule = data?.todaySchedule || [];
  const quickActionSlots = data?.quickActionSlots || [];

  const displayName = doctor?.fullName || "Doctor";

  return (
    <div className="px-6 lg:px-8 py-8 max-w-7xl mx-auto w-full">
      {/* ============================================ */}
      {/* 👋 GREETING */}
      {/* ============================================ */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
          {greeting}, {displayName}
        </h1>
        <p className="mt-1.5 text-sm text-gray-500">
          {today}
          {stats.appointments > 0 && (
            <>
              {" • "}
              <span className="font-medium text-gray-700">
                You have {stats.appointments} appointment
                {stats.appointments !== 1 ? "s" : ""} today
              </span>
            </>
          )}
        </p>
      </div>

      {/* ============================================ */}
      {/* 📊 STAT CARDS */}
      {/* ============================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={Users}
          label="Total Consultations"
          value={stats.consultations}
          hint="This month"
          accent="indigo"
        />
        <StatCard
          icon={CalendarCheck}
          label="Total Appointments"
          value={stats.appointments}
          hint={stats.appointments === 0 ? "No upcoming" : "Upcoming"}
          accent="blue"
        />
        <StatCard
          icon={DollarSign}
          label="Revenue Summary"
          value={
            stats.revenue === 0 ? "—" : `$${stats.revenue.toLocaleString()}`
          }
          hint="Consultation earnings"
          accent="green"
        />
      </div>

      {/* ============================================ */}
      {/* 📅 SCHEDULE + QUICK ACTIONS */}
      {/* ============================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today's Schedule (left, spans 2 cols on lg+) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-gray-900">
              Today's Schedule
            </h2>
            <span className="text-[11px] text-gray-400 font-medium">
              {today.split(",")[0]}
            </span>
          </div>

          {loading ? (
            <p className="text-sm text-gray-400 text-center py-12">
              Loading...
            </p>
          ) : todaySchedule.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                <CalendarX className="w-5 h-5 text-gray-400" strokeWidth={2} />
              </div>
              <p className="text-sm font-medium text-gray-700">
                No appointments scheduled
              </p>
              <p className="mt-1 text-xs text-gray-500 max-w-xs">
                You have a free day. New bookings will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {todaySchedule.map((apt) => (
                <div
                  key={apt.id}
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    apt.status === "confirmed" || apt.status === "pending"
                      ? "bg-indigo-50/50 border-indigo-100"
                      : "bg-green-50/50 border-green-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {/* {new Date(apt.scheduledAt).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                          timeZone: "UTC",
                        })} */}
                        {formatUtcTime24h(apt.scheduledAt)}
                      </p>
                      <p className="text-xs text-gray-500">{apt.patientName}</p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-semibold uppercase px-2 py-1 rounded-full ${
                      apt.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : "bg-indigo-100 text-indigo-700"
                    }`}
                  >
                    {apt.status === "completed" ? "Done" : "Booked"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions (right) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-6">
          <h2 className="text-base font-bold text-gray-900">Quick Actions</h2>
          <p className="mt-1 text-xs text-gray-500">
            Toggle your availability for today's slots
          </p>

          <div className="mt-5 space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {loading ? (
              <p className="text-xs text-gray-400 text-center py-6">
                Loading...
              </p>
            ) : quickActionSlots.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">
                No slots scheduled for today
              </p>
            ) : (
              quickActionSlots.map((slot) => (
                <QuickActionSlot
                  key={slot.time}
                  slot={slot}
                  onToggle={refetch}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* 🎉 ONBOARDING WELCOME */}
      {/* ============================================ */}
      <div className="mt-6 bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-2xl border border-indigo-100 p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-white" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            Welcome to your portal
          </p>
          <p className="mt-1 text-xs text-gray-600 leading-relaxed">
            Your account is fully set up. New modules — Appointments, Patients,
            and Availability — will appear here as they roll out. You can update
            your profile anytime from Settings.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;