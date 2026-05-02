/**
 * DOCTOR MODULE — Dashboard MVP
 * Greeting + stat cards + Today's Schedule + Quick Actions.
 * Stat values and schedule are placeholder until Appointments module ships.
 */

import React, { useMemo } from "react";
import {
  Users,
  CalendarCheck,
  DollarSign,
  Clock,
  CalendarX,
  Sparkles,
} from "lucide-react";
import { useDoctorAuth } from "../../../context/DoctorAuthContext";

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
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accentMap[accent]} flex items-center justify-center mb-4`}>
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

  // 🔮 Future: replace these with real API data when modules ship
  const stats = {
    consultations: 0,
    appointments: 0,
    revenue: 0,
  };

  // Simple display name — uses fullName as-is (already prefixed "Dr." in admin form, or just name)
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
                You have {stats.appointments} appointment{stats.appointments !== 1 ? "s" : ""} today
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
          value={stats.revenue === 0 ? "—" : `$${stats.revenue.toLocaleString()}`}
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

          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
              <CalendarX className="w-5 h-5 text-gray-400" strokeWidth={2} />
            </div>
            <p className="text-sm font-medium text-gray-700">
              No appointments scheduled
            </p>
            <p className="mt-1 text-xs text-gray-500 max-w-xs">
              Your daily schedule will appear here once the Appointments module is live.
            </p>
          </div>
        </div>

        {/* Quick Actions (right) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-6">
          <h2 className="text-base font-bold text-gray-900">
            Quick Actions
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Toggle availability for time slots
          </p>

          <div className="mt-5 flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center mb-3">
              <Clock className="w-5 h-5 text-indigo-500" strokeWidth={2} />
            </div>
            <p className="text-sm font-medium text-gray-700">
              Availability manager
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Coming soon
            </p>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* 🎉 ONBOARDING WELCOME (optional polish) */}
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
            Your account is fully set up. New modules — Appointments, Patients, and
            Availability — will appear here as they roll out. You can update your
            profile anytime from Settings.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;