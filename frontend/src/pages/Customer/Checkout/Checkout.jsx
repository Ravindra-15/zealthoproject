/**
 * CUSTOMER MODULE — Secure Checkout Page
 * Reads booking intent from sessionStorage, fetches doctor, processes payment.
 * Lets user describe their problem (max 200 chars) via modal before paying.
 */

import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Lock,
  Loader2,
  Gift,
  FileText,
  Pencil,
  HeartPulse,
  ChevronRight,
  AlertTriangle,
  Paperclip,
} from "lucide-react";
import toast from "react-hot-toast";

import CustomerNavbar from "../../../components/customer/layout/CustomerNavbar";
import CustomerFooter from "../../../components/customer/layout/CustomerFooter";
import ConsultationCard from "./components/ConsultationCard";
import Modal from "../../../components/common/Modal";

import { getPublicDoctor } from "../../../services/customerDoctorService";
import {
  createBooking,
  createAppointmentPaypalOrder,
} from "../../../services/customerAppointmentService";
import { getPaymentErrorMessage } from "../../../utils/paymentErrors";
import {
  isCustomerLoggedIn,
  buildLoginRedirect,
} from "../../../utils/customerAuthHelper";

import { fetchMyProfile } from "../../../services/customerProfileService";
import useMyBodyProfile from "../../../hooks/useMyBodyProfile";
import useMedicalReports from "../../../hooks/useMedicalReports";
import ReportList from "../../../components/customer/MedicalReports/ReportList";
import { useCurrency } from "../../../hooks/useCurrency";
import { useProfileGate } from "../../../hooks/useProfileGate";

const BOOKING_FEE = 20;
const RESCHEDULE_CUTOFF_MS = 48 * 60 * 60 * 1000; // 48 hours
const PROBLEM_MAX = 200; // max characters allowed for problem description
const PLATFORM = "zealtho"; // current program identifier (change per subprogram)

const Checkout = () => {
  const navigate = useNavigate();
  const { requireCompleteProfile, profileGateModal } = useProfileGate();
  const location = useLocation();

  const [intent, setIntent] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paying, setPaying] = useState(false);

  const [freeCredits, setFreeCredits] = useState(0);
  const fee = freeCredits > 0 ? 0 : BOOKING_FEE; // USD

  // 💱 Show the fee in the customer's own currency (from their profile
  // country). Display only — PayPal still charges the USD amount.
  const { convert, currency, rates, ready: currencyReady } = useCurrency();
  const showsLocalCurrency =
    !!currency && currency !== "USD" && Number.isFinite(rates?.[currency]);

  // body profile completion status — decides which button to show
  const { isComplete: bodyProfileComplete, loading: bodyProfileLoading } =
    useMyBodyProfile();

  // 📝 Problem-description state
  // load saved problem from sessionStorage so it survives refresh + navigation
  const [problem, setProblem] = useState(
    () => sessionStorage.getItem("bookingProblem") || "",
  );
  const [draft, setDraft] = useState(""); // temp text inside modal
  const [showProblemModal, setShowProblemModal] = useState(false);

  // 📄 Optional medical reports (max 2 × 5 MB) — attached to the booking once it's created
  const medical = useMedicalReports({ loadPending: true });

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
  // 🅿️ PAYPAL CANCELLED — buyer backed out on PayPal's page.
  // Booking intent is untouched (still in sessionStorage), so they land
  // right back here and can just hit Pay again.
  // ============================================
  useEffect(() => {
    if (new URLSearchParams(location.search).get("paypalCancelled") === "1") {
      toast("Payment cancelled — you can try again whenever you're ready.", { icon: "ℹ️" });
      navigate(location.pathname, { replace: true }); // strip the query param
    }
  }, [location, navigate]);

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
    const cleaned = draft.trim();
    setProblem(cleaned);
    sessionStorage.setItem("bookingProblem", cleaned); // persist so it survives refresh/navigation
    setShowProblemModal(false);
  };
  // ============================================
  // 💳 PROCESS PAYMENT + CREATE BOOKING
  // ============================================
  const handlePay = async () => {
    if (paying || !intent || medical.busy) return;
    let redirecting = false;

    try {
      setPaying(true);

      // 👤 phone + location needed before booking — ask first if missing
      if (!(await requireCompleteProfile("/checkout"))) return;

      // The server decides free vs paid (it re-checks credits/consult cards
      // and that the slot is still open) — the client never guesses.
      const origin = window.location.origin;
      const result = await createAppointmentPaypalOrder({
        doctorId: intent.doctorId,
        scheduledAt: intent.scheduledAt,
        notes: problem || undefined,
        reportIds: medical.reports.map((r) => r._id),
        platform: PLATFORM,
        returnUrl: `${origin}/checkout/paypal/return`,
        cancelUrl: `${origin}/checkout?paypalCancelled=1`,
      });

      if (!isMountedRef.current) return;

      // 🎁 Free credit / consult card — confirm without any payment.
      if (result.freeBooking) {
        const booked = await createBooking({
          doctorId: intent.doctorId,
          scheduledAt: intent.scheduledAt,
          notes: problem || undefined,
        reportIds: medical.reports.map((r) => r._id),
          platform: PLATFORM,
        });
        if (!isMountedRef.current) return;
        sessionStorage.removeItem("bookingIntent");
        sessionStorage.removeItem("bookingProblem");
        toast.success("Appointment confirmed!");
        navigate(`/booking/confirmation/${booked.appointment._id}`, { replace: true });
        return;
      }

      // 💳 Real payment — off to PayPal. Keep the button disabled while the
      // browser navigates away so a second click can't start another order.
      redirecting = true;
      window.location.href = result.approveUrl;
    } catch (err) {
      if (!isMountedRef.current) return;
      const msg = getPaymentErrorMessage(err, "Couldn't start payment. Please try again.");
      toast.error(err?.response ? msg : `${msg} You haven't been charged.`);
    } finally {
      if (isMountedRef.current && !redirecting) setPaying(false);
    }
  };

  // ============================================
  // 🎨 RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <CustomerNavbar />

      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-10 space-y-6">
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
          {loading || !currencyReady ? (
            // also wait for the currency, so the fee doesn't flash $20 first
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
                fee={fee}
                feeLabel={convert(fee)}
                showTotals
              />

              {/* ⏱️ Short heads-up — within 48 hrs, no free reschedule later */}
              {intent?.scheduledAt &&
                new Date(intent.scheduledAt).getTime() - Date.now() < RESCHEDULE_CUTOFF_MS && (
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
                    <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
                    <p className="text-xs text-amber-700">
                      Within 48 hrs — can't be rescheduled later.
                    </p>
                  </div>
                )}

              {/* ============================================ */}
              {/* 📝 PROBLEM DESCRIPTION                        */}
              {/* ============================================ */}
              {problem && (
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
              )}

              {/* 📝 Describe problem + 📄 Upload reports (side by side; stacked on mobile) */}
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {!problem && (
                <button
                  type="button"
                  onClick={openProblemModal}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border border-dashed border-gray-300 text-sm font-medium text-gray-600 hover:border-orange-400 hover:text-orange-600 transition-colors bg-white"
                >
                  <FileText size={15} />
                  Describe Your Problem
                </button>
                  )}
                  <button
                    type="button"
                    onClick={medical.pickFiles}
                    disabled={medical.slotsLeft <= 0}
                    className={`${problem ? "sm:col-span-2 " : ""}w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border border-dashed border-gray-300 text-sm font-medium text-gray-600 hover:border-orange-400 hover:text-orange-600 transition-colors bg-white disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    <Paperclip size={15} />
                    Upload Reports ({medical.reports.length}/2)
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 text-center">
                  Optional · PDF, JPG, PNG or DOC · up to 2 files · max 5 MB each
                </p>
                <ReportList
                  reports={medical.reports}
                  uploads={medical.uploads}
                  onView={medical.viewReport}
                  onRemove={medical.removeReport}
                  onCancel={medical.cancelUpload}
                  onRetry={medical.retryUpload}
                  onDismiss={medical.dismissUpload}
                  removingId={medical.removingId}
                />
              </div>
              <input {...medical.inputProps} />

              {/* ============================================ */}
              {/* 🩺 BODY PROFILE PROMPT                        */}
              {/* ============================================ */}
              {bodyProfileLoading ? (
                // skeleton — avoids flashing wrong state before status loads
                <div className="w-full h-[60px] rounded-2xl bg-gray-100 animate-pulse" />
              ) : bodyProfileComplete ? (
                // already filled — calm "view/edit" style
                <button
                  type="button"
                  onClick={() => navigate("/body-profile?from=checkout")}
                  className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-4 rounded-2xl border border-gray-100 bg-white hover:border-orange-300 transition-colors"
                >
                  <span className="flex items-center gap-2.5 text-left">
                    <HeartPulse size={18} className="text-emerald-500 flex-shrink-0" />
                    <span className="text-sm font-semibold text-gray-800">
                      View / Edit Your Body Profile
                    </span>
                  </span>
                  <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                </button>
              ) : (
                // not filled — highlighted prompt to complete
                <button
                  type="button"
                  onClick={() => navigate("/body-profile?from=checkout")}
                  className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-4 rounded-2xl border border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors"
                >
                  <span className="flex items-center gap-2.5 text-left">
                    <HeartPulse size={18} className="text-orange-500 flex-shrink-0" />
                    <span>
                      <span className="block text-sm font-bold text-orange-800">
                        Complete Your Body Profile
                      </span>
                      <span className="block text-[11px] text-orange-700 mt-0.5">
                        Helps your doctor personalize your care
                      </span>
                    </span>
                  </span>
                  <ChevronRight size={16} className="text-orange-500 flex-shrink-0" />
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
                disabled={paying || medical.busy}
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
                    {freeCredits > 0 ? "Confirming…" : "Redirecting to PayPal…"}
                  </>
                ) : freeCredits > 0 ? (
                  "Confirm Free Booking"
                ) : (
                  `Pay ${convert(BOOKING_FEE)} with PayPal`
                )}
              </button>

              {medical.busy && (
                <p className="text-[11px] text-amber-600 text-center">
                  Please wait — your report is still uploading.
                </p>
              )}

              {/* 💱 Local-currency customers: be upfront that PayPal bills in USD */}
              {freeCredits === 0 && showsLocalCurrency && (
                <p className="text-xs text-gray-500 text-center leading-relaxed">
                  PayPal will charge{" "}
                  <span className="font-semibold">${BOOKING_FEE.toFixed(2)} USD</span>{" "}
                  (≈ {convert(BOOKING_FEE)}). Your bank or PayPal may apply its
                  own conversion rate.
                </p>
              )}

              {freeCredits === 0 && (
                <p className="text-[11px] text-gray-400 text-center">
                  You'll be redirected to PayPal to complete payment securely,
                  then brought back here automatically.
                </p>
              )}

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
      <Modal
        isOpen={showProblemModal}
        onClose={() => setShowProblemModal(false)}
      >
        <h2 className="text-lg font-bold text-gray-900 mb-1">
          Describe Your Problem
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Briefly tell the doctor what's bothering you (max {PROBLEM_MAX}{" "}
          characters).
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

      {profileGateModal}
    </div>
  );
};

export default Checkout;
