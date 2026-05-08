import { useState } from "react";
import { useParams } from "react-router-dom";
import { Play, Check, Plus, Bell, Calendar } from "lucide-react";

const programTitles = {
  yogat20: "Yoga T20",
  diabmukt: "Diabmukt",
  mommyfit: "MommyFit",
  slimfitter: "Slimfitter",
};

const navLinks = ["Home", "Add Progress", "Book Doctor", "My Appointments", "Notifications"];

const days = [
  {
    id: 1,
    day: "Day 01",
    subtitle: "Asanas for Insulin Sensitivity",
    thumbnail: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=80",
  },
  {
    id: 2,
    day: "Day 02",
    subtitle: "Pranayama & Breathing Techniques",
    thumbnail: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&q=80",
  },
];

const suggestions = [
  {
    id: 1,
    label: "Tired today ? Do some",
    bold: "Chair yoga then",
    image: "https://images.unsplash.com/photo-1552196563-55cd4e45efb3?w=400&q=80",
  },
  {
    id: 2,
    label: "Motivated Enough for",
    bold: "Daily Yoga",
    image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=80",
  },
];

const progressData = [
  { label: "Sleep", color: "#F97316", value: 75 },
  { label: "Sleep", color: "#A855F7", value: 60 },
  { label: "Water", color: "#3B82F6", value: 45 },
  { label: "Steps", color: "#22C55E", value: 85 },
];

export default function ProgramDashboard() {
  const { id } = useParams();
  const programTitle = programTitles[id] || "Program";
  const [completed, setCompleted] = useState({});

  const toggleComplete = (dayId) =>
    setCompleted((prev) => ({ ...prev, [dayId]: !prev[dayId] }));

  return (
    <div className="min-h-screen bg-gray-50">

      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 flex items-center justify-between h-16">
          <span className="text-orange-500 font-bold text-lg tracking-tight">
            {programTitle}
          </span>
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link}
                className="text-gray-600 hover:text-orange-500 text-sm font-medium transition-colors whitespace-nowrap"
              >
                {link}
              </button>
            ))}
          </div>
          <button className="bg-orange-500 text-white text-sm font-semibold px-6 py-2 rounded-full shadow-[0_4px_14px_rgba(249,115,22,0.35)] hover:bg-orange-600 transition-colors">
            Profile
          </button>
        </div>
      </nav>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-8 space-y-6">

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row items-start justify-between gap-6 sm:gap-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
              Good Morning,{" "}
              <span className="text-orange-500">Anandadas</span>
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Let's track your wellness journey for today
            </p>

            <div className="mt-6 bg-gray-50 border border-gray-100 rounded-xl p-4 inline-flex items-center gap-5 w-full sm:w-auto">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Today</p>
                <p className="font-bold text-gray-800 text-sm">
                  Monday, Feb 23
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Click to view your past logs
                </p>
              </div>
              <img
                src="https://cdn-icons-png.flaticon.com/512/2693/2693507.png"
                alt="calendar"
                className="w-12 h-12 object-contain shrink-0"
              />
            </div>

            <button className="mt-6 flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-6 py-3 rounded-full shadow-[0_4px_14px_rgba(249,115,22,0.35)] transition-colors">
              <Plus size={16} />
              Add Progress
            </button>
          </div>

          <div className="shrink-0 flex items-center justify-center w-52 h-52 relative mx-auto sm:mx-0">
            <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90">
              {progressData.map((item, i) => {
                const r = 72 - i * 14;
                const circ = 2 * Math.PI * r;
                return (
                  <circle
                    key={i}
                    cx="90"
                    cy="90"
                    r={r}
                    fill="none"
                    stroke={item.color}
                    strokeWidth="11"
                    strokeDasharray={`${(item.value / 100) * circ} ${circ}`}
                    strokeLinecap="round"
                    opacity="0.9"
                  />
                );
              })}
            </svg>
            <div className="absolute top-6 right-4 flex flex-col gap-0.5">
              {progressData.map((item) => (
                <span
                  key={item.label}
                  className="text-[9px] font-medium"
                  style={{ color: item.color }}
                >
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {days.map((day) => (
          <div
            key={day.id}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4 sm:gap-5"
          >
            <div className="relative w-full sm:w-56 h-36 rounded-xl overflow-hidden shrink-0">
              <img
                src={day.thumbnail}
                alt={day.day}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                <div className="w-11 h-11 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
                  <Play size={20} className="text-white ml-0.5" fill="white" />
                </div>
              </div>
            </div>

            <div className="flex-1 w-full">
              <p className="text-orange-500 font-semibold text-sm mb-1">
                {day.day}
              </p>
              <p className="text-gray-800 font-semibold text-base">
                {day.subtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mt-5">
                <button className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-6 py-2.5 rounded-full shadow-[0_4px_14px_rgba(249,115,22,0.25)] transition-colors">
                  <Play size={14} fill="white" />
                  Play Video
                </button>
                <button
                  onClick={() => toggleComplete(day.id)}
                  className={`flex items-center justify-center gap-2 text-sm font-semibold px-6 py-2.5 rounded-full border transition-colors ${
                    completed[day.id]
                      ? "bg-green-50 border-green-400 text-green-600"
                      : "border-gray-200 text-gray-600 hover:border-orange-400 hover:text-orange-500"
                  }`}
                >
                  <Check size={14} />
                  {completed[day.id] ? "Completed" : "Mark as Complete"}
                </button>
              </div>
            </div>
          </div>
        ))}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-orange-100">
            {suggestions.map((s) => (
              <div
                key={s.id}
                className="flex flex-col items-center text-center px-6 py-6"
              >
                <div className="w-36 h-36 mb-4">
                  <img
                    src={s.image}
                    alt={s.bold}
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
                <p className="text-gray-500 text-sm">{s.label}</p>
                <p className="text-gray-800 font-bold text-base mt-0.5">
                  {s.bold}
                </p>
                <button className="mt-4 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-10 py-2.5 rounded-full shadow-[0_4px_14px_rgba(249,115,22,0.25)] transition-colors">
                  Start
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-orange-50 rounded-lg flex items-center justify-center">
              <Calendar size={15} className="text-orange-500" />
            </div>
            <span className="font-semibold text-gray-800 text-sm">
              Next Doctor Consultation
            </span>
          </div>
          <div className="bg-blue-50 rounded-xl px-5 py-4">
            <p className="text-xs text-gray-500 flex items-center gap-1 mb-1">
              <Bell size={11} className="text-blue-400" />
              Upcoming Check-in
            </p>
            <p className="text-sm font-medium text-gray-700">
              Dr. Sharma — Tomorrow, 4:00 PM
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}