/**
 * CUSTOMER MODULE — Doctor Detail / Slot Picker Page
 * Loads doctor → date calendar + time-slot grid → "Get Appointment" CTA.
 * On CTA: stash booking intent in sessionStorage, navigate to /checkout.
 */

import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar } from "lucide-react";
import toast from "react-hot-toast";

import CustomerNavbar from "../../../components/customer/layout/CustomerNavbar";
import CustomerFooter from "../../../components/customer/layout/CustomerFooter";

import DoctorDetailHeader from "./components/DoctorDetailHeader";
import DateCalendar from "./components/DateCalendar";
import TimeSlotGrid from "./components/TimeSlotGrid";

import { getPublicDoctor } from "../../../services/customerDoctorService";
import useDoctorDayAvailability from "../../../hooks/useDoctorDayAvailability";

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

  const isMountedRef = useRef(false);

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
    selectedDate
  );

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
    const intent = {
      doctorId: id,
      scheduledDate: selectedDate,
      scheduledTime: selectedTime,
      // Build full ISO timestamp (UTC)
      scheduledAt: new Date(
        `${selectedDate}T${selectedTime}:00.000Z`
      ).toISOString(),
    };
    sessionStorage.setItem("bookingIntent", JSON.stringify(intent));

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
            Book Doctor{" "}
            <span className="text-orange-500">Consultations</span>
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
                    <p className="text-sm font-bold text-gray-900 mb-3">
                      Select A Time
                    </p>
                    <TimeSlotGrid
                      slots={dayData?.slots || []}
                      selectedTime={selectedTime}
                      onSelect={setSelectedTime}
                      loading={slotsLoading}
                      noDateSelected={!selectedDate}
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
    </div>
  );
};

export default DoctorDetail;