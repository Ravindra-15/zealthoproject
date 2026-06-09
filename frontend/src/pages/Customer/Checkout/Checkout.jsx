/**
 * CUSTOMER MODULE — Secure Checkout Page
 * Reads booking intent from sessionStorage, fetches doctor, processes payment.
 * Lets user describe their problem (max 200 chars) via modal before paying.
 */

import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Lock, Loader2, Gift, FileText, Pencil } from "lucide-react";
import toast from "react-hot-toast";

import CustomerNavbar from "../../../components/customer/layout/CustomerNavbar";
import CustomerFooter from "../../../components/customer/layout/CustomerFooter";
import ConsultationCard from "./components/ConsultationCard";
import Modal from "../../../components/common/Modal";

import { getPublicDoctor } from "../../../services/customerDoctorService";
import { createBooking } from "../../../services/customerAppointmentService";
import {
  isCustomerLoggedIn,
  buildLoginRedirect,
} from "../../../utils/customerAuthHelper";

import { fetchMyProfile } from "../../../services/customerProfileService";

const BOOKING_FEE = 20;
const PROBLEM_MAX = 200; // max characters allowed for problem description
const PLATFORM = "zealtho"; // current program identifier (change per subprogram)

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [intent, setIntent] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paying, setPaying] = useState(false);

  const [freeCredits, setFreeCredits] = useState(0);

  // 📝 Problem-description state
  const [problem, setProblem] = useState("");      // saved problem text
  const [draft, setDraft] = useState("");           // temp text inside modal
  const [showProblemModal, setShowProblemModal] = useState(false);

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
  // 📝 PROBLEM MODAL HANDLERS
  // ============================================
  // Opens modal, preloads draft with already-saved problem (for edit)
  const openProblemModal = () => {
    setDraft(problem);
    setShowProblemModal(true);
  };

  // Saves draft into problem, closes modal
  const saveProblem = () => {
    setProblem(draft.trim());
    setShowProblemModal(false);
  };

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
        notes: problem || undefined, // send problem text as notes (optional)
        platform: PLATFORM, // tag booking to current program
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

              {/* ============================================ */}
              {/* 📝 PROBLEM DESCRIPTION                        */}
              {/* ============================================ */}
              {problem ? (
                // Saved problem preview card + edit button
                <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <FileText size={15} className="text-orange-500" />
                      Your Problem
                    </div>
                    <button
                      type="button"
                      onClick={openProblemModal}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:underline flex-shrink-0"
                    >
                      <Pencil size={12} />
                      Edit
                    </button>
                  </div>
                  {/* break-words keeps long text from breaking layout */}
                  <p className="text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                    {problem}
                  </p>
                </div>
              ) : (
                // Initial "describe problem" trigger button
                <button
                  type="button"
                  onClick={openProblemModal}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border border-dashed border-gray-300 text-sm font-medium text-gray-600 hover:border-orange-400 hover:text-orange-600 transition-colors bg-white"
                >
                  <FileText size={15} />
                  Describe Your Problem
                </button>
              )}

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

      {/* ============================================ */}
      {/* 📝 PROBLEM MODAL                              */}
      {/* ============================================ */}
      <Modal isOpen={showProblemModal} onClose={() => setShowProblemModal(false)}>
        <h2 className="text-lg font-bold text-gray-900 mb-1">
          Describe Your Problem
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Briefly tell the doctor what's bothering you (max {PROBLEM_MAX} characters).
        </p>

        {/* Textarea capped at PROBLEM_MAX chars */}
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, PROBLEM_MAX))}
          rows={5}
          placeholder="e.g. I've had irregular periods and fatigue for 3 months…"
          className="w-full resize-none rounded-xl border border-gray-200 p-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
        />

        {/* Live character counter */}
        <div className="text-right text-[11px] text-gray-400 mt-1">
          {draft.length}/{PROBLEM_MAX}
        </div>

        {/* Modal actions */}
        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={() => setShowProblemModal(false)}
            className="px-4 py-2 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={saveProblem}
            disabled={!draft.trim()}
            className="px-5 py-2 rounded-full text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Done
          </button>
        </div>
      </Modal>

      <CustomerFooter />
    </div>
  );
};

export default Checkout;