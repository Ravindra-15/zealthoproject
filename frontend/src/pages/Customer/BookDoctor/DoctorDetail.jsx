/**
 * CUSTOMER MODULE — Doctor Detail / Slot Picker Page
 * Loads doctor → date calendar + time-slot grid → "Get Appointment" CTA.
 * On CTA: stash booking intent in sessionStorage, navigate to /checkout.
 */

import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, X, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

import CustomerNavbar from "../../../components/customer/layout/CustomerNavbar";
import CustomerFooter from "../../../components/customer/layout/CustomerFooter";

import DoctorDetailHeader from "./components/DoctorDetailHeader";
import DateCalendar from "./components/DateCalendar";
import TimeSlotGrid from "./components/TimeSlotGrid";

import {
  isCustomerLoggedIn,
  buildLoginRedirect,
} from "../../../utils/customerAuthHelper";

import { getPublicDoctor } from "../../../services/customerDoctorService";
import { listMyAppointments } from "../../../services/customerAppointmentService";
import useDoctorDayAvailability from "../../../hooks/useDoctorDayAvailability";
import { buildZonedSlotDate, getViewerTimezone, DEFAULT_TIMEZONE } from "../../../utils/time";

// 🗓️ Default to today (UTC YYYY-MM-DD)
const todayIso = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
};

const DoctorDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState(null);
  const [doctorLoading, setDoctorLoading] = useState(true);
  const [doctorError, setDoctorError] = useState(null);

const [selectedDate, setSelectedDate] = useState(todayIso());
  const [selectedTime, setSelectedTime] = useState("");

  // ⛔ conflict modal — user already has an appointment at the picked time
  const [conflictOpen, setConflictOpen] = useState(false);
  // list of user's upcoming appointment ISO times (for same-time detection)
  const [myUpcomingTimes, setMyUpcomingTimes] = useState([]);

  const isMountedRef = useRef(false);
  const conflictTimerRef = useRef(null);

  // 🌍 The patient's own detected zone — stable for the session, used only
  // for the "shown in your local time" hint (actual conversion is per-slot).
  const viewerTimezoneLabel = getViewerTimezone().replace(/_/g, " ");

  // 📥 Load the logged-in user's upcoming appointment times (for conflict check)
  useEffect(() => {
    let active = true;
    if (!isCustomerLoggedIn()) {
      setMyUpcomingTimes([]);
      return;
    }
    (async () => {
      try {
        const result = await listMyAppointments({ bucket: "upcoming", limit: 50 });
        if (!active) return;
        const times = (result?.appointments || [])
          .filter((a) => ["pending", "confirmed"].includes(a.status))
          .map((a) => new Date(a.scheduledAt).getTime());
        setMyUpcomingTimes(times);
      } catch {
        // soft fail — backend still hard-blocks conflicts
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // 🧹 clear the auto-close timer on unmount
  useEffect(() => {
    return () => {
      if (conflictTimerRef.current) clearTimeout(conflictTimerRef.current);
    };
  }, []);

  // Opens the conflict modal + auto-closes after 4s
  const showConflict = () => {
    setConflictOpen(true);
    if (conflictTimerRef.current) clearTimeout(conflictTimerRef.current);
    conflictTimerRef.current = setTimeout(() => setConflictOpen(false), 4000);
  };

  // Manually close conflict modal
  const closeConflict = () => {
    if (conflictTimerRef.current) clearTimeout(conflictTimerRef.current);
    setConflictOpen(false);
  };

  // ============================================
  // 📥 LOAD DOCTOR
  // ============================================
  useEffect(() => {
    isMountedRef.current = true;

    const load = async () => {
      try {
        setDoctorLoading(true);
        setDoctorError(null);
        const result = await getPublicDoctor(id);
        if (!isMountedRef.current) return;
        setDoctor(result);
      } catch (err) {
        if (!isMountedRef.current) return;
        const msg = err?.response?.data?.message || "Failed to load doctor";
        setDoctorError(msg);
      } finally {
        if (isMountedRef.current) setDoctorLoading(false);
      }
    };

    load();
    return () => {
      isMountedRef.current = false;
    };
  }, [id]);

  // ============================================
  // 📅 LOAD DAY AVAILABILITY
  // ============================================
  const { data: dayData, loading: slotsLoading } = useDoctorDayAvailability(
    id,
    selectedDate,
  );

  // 🌍 Doctor's own zone — governs how their "HH:MM" slot labels convert
  // to real instants. Falls back safely until the doctor/day data loads.
  const doctorTimezone = doctor?.timezone || dayData?.doctorTimezone || DEFAULT_TIMEZONE;

  // Handle slot selection — block if user already booked at this time
  const handleSelectTime = (time) => {
    if (!time) return;
    const candidate = buildZonedSlotDate(selectedDate, time, doctorTimezone);
    const candidateMs = candidate ? candidate.getTime() : NaN;
    if (myUpcomingTimes.includes(candidateMs)) {
      showConflict(); // re-shows every time a conflicting slot is picked
      return; // do NOT select the slot
    }
    setSelectedTime(time);
  };

  // 🔄 Reset selected time when date changes
  useEffect(() => {
    setSelectedTime("");
  }, [selectedDate]);

  // ============================================
  // 🚀 PROCEED TO CHECKOUT
  // ============================================
  const handleProceed = () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Please select a date and time");
      return;
    }

    // 📦 Stash booking intent — Checkout page reads this
    // 🌍 selectedTime is the DOCTOR's own local "HH:MM" label — convert it
    // through their zone to get the real instant (not a naive UTC guess).
    const scheduledInstant = buildZonedSlotDate(selectedDate, selectedTime, doctorTimezone);

    // ⏰ Guard against a slot that lapsed between picking it and clicking
    // here (e.g. left the page open) — catch it now with a clear message
    // instead of a confusing error later at checkout.
    if (scheduledInstant.getTime() < Date.now()) {
      toast.error("That slot just passed — please pick another time");
      setSelectedTime("");
      return;
    }

    const intent = {
      doctorId: id,
      scheduledDate: selectedDate,
      scheduledTime: selectedTime,
      scheduledAt: scheduledInstant.toISOString(),
    };
    sessionStorage.setItem("bookingIntent", JSON.stringify(intent));

    // 🔒 Not logged in → send to login, return to checkout after
    if (!isCustomerLoggedIn()) {
      navigate(buildLoginRedirect("/checkout"));
      return;
    }

    navigate("/checkout");
  };

  // ============================================
  // 🎨 RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <CustomerNavbar />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-10 space-y-6">
          {/* 🔙 Back link */}
          <button
            type="button"
            onClick={() => navigate("/book-doctor")}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to doctors
          </button>

          {/* 🏷️ Page title */}
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 text-center tracking-tight">
            Book Doctor <span className="text-orange-500">Consultations</span>
          </h1>

          {/* ============================================ */}
          {/* 👤 DOCTOR HEADER                              */}
          {/* ============================================ */}
          {doctorLoading ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse h-44" />
          ) : doctorError || !doctor ? (
            <div className="bg-white rounded-2xl border border-gray-100 px-6 py-12 text-center">
              <p className="text-sm font-medium text-gray-700 mb-1">
                {doctorError || "Doctor not found"}
              </p>
              <p className="text-xs text-gray-500">
                Try going back and choosing another doctor.
              </p>
            </div>
          ) : (
            <>
              <DoctorDetailHeader doctor={doctor} />

              {/* ============================================ */}
              {/* 📅 SLOT PICKER CARD                            */}
              {/* ============================================ */}
              <div
                className="
                  bg-white rounded-2xl border border-gray-100
                  shadow-[0_1px_3px_rgba(16,24,40,0.04)]
                  p-5 sm:p-6
                "
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Calendar */}
                  <div>
                    <p className="text-sm font-bold text-gray-900 mb-3">
                      Select A Date
                    </p>
                    <DateCalendar
                      selectedDate={selectedDate}
                      onSelect={setSelectedDate}
                    />
                  </div>

                  {/* Time slots */}
                  <div>
                    <div className="flex items-baseline justify-between mb-3">
                      <p className="text-sm font-bold text-gray-900">
                        Select A Time
                      </p>
                      <p className="text-[11px] text-gray-400">
                        Shown in your local time ({viewerTimezoneLabel})
                      </p>
                    </div>
                    <TimeSlotGrid
                      slots={dayData?.slots || []}
                      selectedTime={selectedTime}
                      onSelect={handleSelectTime}
                      loading={slotsLoading}
                      noDateSelected={!selectedDate}
                      date={selectedDate}
                      doctorTimezone={doctorTimezone}
                    />
                  </div>
                </div>

                {/* CTA */}
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={handleProceed}
                    disabled={!selectedDate || !selectedTime}
                    className="
                      inline-flex items-center justify-center gap-2
                      px-8 py-3 rounded-full
                      text-sm font-semibold text-white
                      bg-orange-500 hover:bg-orange-600
                      transition-colors
                      shadow-[0_4px_14px_rgba(249,115,22,0.3)]
                      disabled:opacity-50 disabled:cursor-not-allowed
                      w-full sm:w-auto
                    "
                  >
                    <Calendar size={15} />
                    Get Appointment
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <CustomerFooter />

      {/* ⛔ CONFLICT MODAL — already booked at this time */}
      {conflictOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center relative">
            <button
              type="button"
              onClick={closeConflict}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={22} className="text-amber-500" />
            </div>

            <h3 className="text-base font-bold text-gray-900 mb-1.5">
              Time slot unavailable
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              You already have an appointment at this time. Please check your
              appointments or pick a different slot.
            </p>

            <button
              type="button"
              onClick={() => {
                closeConflict();
                navigate("/my-appointments");
              }}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-full text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors"
            >
              View My Appointments
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDetail;