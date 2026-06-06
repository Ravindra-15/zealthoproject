/**
 * CUSTOMER MODULE — Secure Checkout Page
 * Reads booking intent from sessionStorage, fetches doctor, processes payment.
 * Auth-gated: redirects to /login?next=/checkout if not logged in.
 */

import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Lock, Loader2, Gift } from "lucide-react";
import toast from "react-hot-toast";

import CustomerNavbar from "../../../components/customer/layout/CustomerNavbar";
import CustomerFooter from "../../../components/customer/layout/CustomerFooter";
import ConsultationCard from "./components/ConsultationCard";

import { getPublicDoctor } from "../../../services/customerDoctorService";
import { createBooking } from "../../../services/customerAppointmentService";
import {
  isCustomerLoggedIn,
  buildLoginRedirect,
} from "../../../utils/customerAuthHelper";

import { fetchMyProfile } from "../../../services/customerProfileService";

const BOOKING_FEE = 20;

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [intent, setIntent] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paying, setPaying] = useState(false);

  const [freeCredits, setFreeCredits] = useState(0);

  const isMountedRef = useRef(false);

  // ============================================
  // 🔒 AUTH GATE
  // ============================================
  useEffect(() => {
    if (!isCustomerLoggedIn()) {
      navigate(buildLoginRedirect(location.pathname + location.search), {
        replace: true,
      });
    }
  }, [navigate, location]);

  // ============================================
  // 📥 LOAD INTENT + DOCTOR
  // ============================================
  useEffect(() => {
    isMountedRef.current = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        // 📦 Read booking intent from sessionStorage
        const raw = sessionStorage.getItem("bookingIntent");
        if (!raw) {
          setError("No booking found. Please start over.");
          setLoading(false);
          return;
        }

        const parsed = JSON.parse(raw);
        if (!parsed.doctorId || !parsed.scheduledAt) {
          setError("Booking details incomplete.");
          setLoading(false);
          return;
        }

        if (!isMountedRef.current) return;
        setIntent(parsed);

        // 🩺 Fetch doctor for display
        const doc = await getPublicDoctor(parsed.doctorId);
        if (!isMountedRef.current) return;
        setDoctor(doc);

        // 🎁 Check free credits
        try {
          const profile = await fetchMyProfile();
          if (isMountedRef.current) {
            setFreeCredits(profile?.freeAppointmentCredits || 0);
          }
        } catch (err) {
          // soft fail — payment flow still works
        }
      } catch (err) {
        if (!isMountedRef.current) return;
        const msg = err?.response?.data?.message || "Failed to load checkout";
        setError(msg);
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    };

    if (isCustomerLoggedIn()) load();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ============================================
  // 💳 PROCESS PAYMENT + CREATE BOOKING
  // ============================================
  const handlePay = async () => {
    if (paying || !intent) return;

    try {
      setPaying(true);
      const result = await createBooking({
        doctorId: intent.doctorId,
        scheduledAt: intent.scheduledAt,
      });

      if (!isMountedRef.current) return;

      // 🧹 Clear intent — booking succeeded
      sessionStorage.removeItem("bookingIntent");
      toast.success("Appointment confirmed!");

      // 📍 Navigate to confirmation page
      navigate(`/booking/confirmation/${result.appointment._id}`, {
        replace: true,
      });
    } catch (err) {
      if (!isMountedRef.current) return;
      const msg = err?.response?.data?.message || "Payment failed";
      toast.error(msg);
    } finally {
      if (isMountedRef.current) setPaying(false);
    }
  };

  // ============================================
  // 🎨 RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <CustomerNavbar />

      <main className="flex-1">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-10 space-y-6">
          {/* 🔙 Back link */}
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          {/* 🏷️ Page title */}
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Secure Checkout
            </h1>
            <p className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
              <Lock size={11} />
              Your Payment Is Encrypted And Secure
            </p>
          </div>

          {/* ============================================ */}
          {/* 📋 CHECKOUT BODY                              */}
          {/* ============================================ */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse h-72" />
          ) : error ? (
            <div className="bg-white rounded-2xl border border-gray-100 px-6 py-12 text-center">
              <p className="text-sm font-medium text-gray-700 mb-1">{error}</p>
              <button
                type="button"
                onClick={() => navigate("/book-doctor")}
                className="mt-3 text-xs font-semibold text-orange-600 hover:underline"
              >
                Browse doctors
              </button>
            </div>
          ) : (
            <>
              <ConsultationCard
                doctor={doctor}
                scheduledAt={intent?.scheduledAt}
                fee={freeCredits > 0 ? 0 : BOOKING_FEE}
                showTotals
              />

              {freeCredits > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Gift size={18} className="text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-emerald-800">
                      Free Appointment Credit Available
                    </p>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      You have <strong>{freeCredits}</strong> free appointment
                      credit{freeCredits > 1 ? "s" : ""}. This booking will use
                      1 credit — no payment needed.
                    </p>
                  </div>
                </div>
              )}

              {/* 💳 Pay button */}
              <button
                type="button"
                onClick={handlePay}
                disabled={paying}
                className="
                  w-full inline-flex items-center justify-center gap-2
                  px-8 py-3.5 rounded-full
                  text-sm font-semibold text-white
                  bg-orange-500 hover:bg-orange-600
                  transition-colors
                  shadow-[0_4px_14px_rgba(249,115,22,0.3)]
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                {paying ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {freeCredits > 0 ? "Confirming…" : "Processing payment…"}
                  </>
                ) : freeCredits > 0 ? (
                  "Confirm Free Booking"
                ) : (
                  `Pay $${BOOKING_FEE}`
                )}
              </button>

              <p className="text-[11px] text-gray-400 text-center">
                By proceeding, you agree to Zealtho's Terms of Service and
                Privacy Policy.
              </p>
            </>
          )}
        </div>
      </main>

      <CustomerFooter />
    </div>
  );
};

export default Checkout;
