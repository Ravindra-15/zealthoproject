/**
 * CUSTOMER MODULE — Secure Checkout Page
 * Reads booking intent from sessionStorage, fetches doctor, processes payment.
 * Lets user describe their problem (max 500 chars) in a box on the page before paying.
 */

import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Lock,
  Loader2,
  Gift,
  FileText,
  Paperclip,
} from "lucide-react";
import toast from "react-hot-toast";

import CustomerNavbar from "../../../components/customer/layout/CustomerNavbar";
import CustomerFooter from "../../../components/customer/layout/CustomerFooter";
import ConsultationCard, { FeeSummary } from "./components/ConsultationCard";
import BookingRulesNote from "./components/BookingRulesNote";
import useLegalContent from "../../../hooks/useLegalContent";
import { LegalInline, LegalNotices } from "../../../components/customer/legal/LegalText";

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
import { BodyProfileCheckoutRow } from "../../../components/customer/BodyProfile/BodyProfileProgress";
import useMedicalReports from "../../../hooks/useMedicalReports";
import ReportList from "../../../components/customer/MedicalReports/ReportList";
import { useConsultationFee, formatFee } from "../../../hooks/useConsultationFee";
import { useProfileGate } from "../../../hooks/useProfileGate";
import CasePicker from "../../../components/customer/Cases/CasePicker";
import {
  fetchMyCases,
  clearBookingCase,
  BOOKING_CASE_KEY,
  BOOKING_CASE_TITLE_KEY,
} from "../../../services/customerCaseService";

const PROBLEM_MAX = 500; // max characters allowed for problem description
const PLATFORM = "zealtho"; // current program identifier (change per subprogram)

const Checkout = () => {
  const legal = useLegalContent();
  const consent = legal.notice("checkout_consent");
  const navigate = useNavigate();
  const { requireCompleteProfile, profileGateModal } = useProfileGate();
  const location = useLocation();

  const [intent, setIntent] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paying, setPaying] = useState(false);

  const [freeCredits, setFreeCredits] = useState(0);
  // 💵 This patient's fee (USD) — admin sets it per country; the server
  // charges the same amount, this is just for display
  const baseFee = useConsultationFee();

  // 🗂️ CASE — a new problem (starts a new case) or a follow-up in one of the
  // patient's open cases (follow-up price). The server re-checks both.
  const [caseData, setCaseData] = useState(null); // { cases, prices }
  const [caseId, setCaseIdState] = useState(() => sessionStorage.getItem(BOOKING_CASE_KEY) || "");
  const [caseTitle, setCaseTitleState] = useState(() => sessionStorage.getItem(BOOKING_CASE_TITLE_KEY) || "");
  const setCaseId = (id) => {
    setCaseIdState(id);
    if (id) sessionStorage.setItem(BOOKING_CASE_KEY, id);
    else sessionStorage.removeItem(BOOKING_CASE_KEY);
  };
  const setCaseTitle = (title) => {
    setCaseTitleState(title);
    sessionStorage.setItem(BOOKING_CASE_TITLE_KEY, title);
  };
  const loadCases = async () => {
    try {
      const data = await fetchMyCases();
      setCaseData(data);
      return data;
    } catch {
      setCaseData((cur) => cur || { cases: [], prices: null }); // soft fail — books as a new problem
      return null;
    }
  };
  // 🔓 a closed case was reopened right here → refresh and pick it for this booking
  const handleCaseReopened = async (id) => {
    const data = await loadCases();
    const c = data?.cases.find((x) => x._id === id);
    if (c && c.status === "open" && c.booking?.canBook) setCaseId(id);
  };
  useEffect(() => {
    if (isCustomerLoggedIn()) loadCases();
    else setCaseData({ cases: [], prices: null });
  }, []);
  const selectedCase =
    caseData?.cases.find((c) => c._id === caseId && c.status === "open" && c.booking?.canBook) || null;
  const followUpQuote =
    selectedCase?.booking?.state === "follow_up" ? caseData?.prices?.followUpFee || null : null;

  const bookingFee = followUpQuote ? followUpQuote.fee : baseFee.fee;
  const bookingFeeLabel = followUpQuote ? formatFee(followUpQuote.localFee, followUpQuote.currency) : baseFee.label;
  const bookingFeeUsd = followUpQuote ? formatFee(followUpQuote.fee, "USD") : baseFee.usdLabel;
  const feeCurrency = followUpQuote ? followUpQuote.currency : baseFee.currency;
  const feeReady = baseFee.ready && caseData !== null; // wait for both, so the price doesn't flash
  const fee = freeCredits > 0 ? 0 : bookingFee; // USD

  // 💱 The fee in the patient's own currency, exactly as the admin set it
  // for their country (e.g. ₹999). PayPal still charges the USD amount.
  const showsLocalCurrency = feeCurrency !== "USD";
  const feeLabel = fee === 0 ? formatFee(0, feeCurrency) : bookingFeeLabel;

  // body profile completion status — decides which button to show
  const {
    profile: bodyProfile,
    loading: bodyProfileLoading,
    error: bodyProfileError,
  } = useMyBodyProfile();

  // 📝 Problem-description state
  // load saved problem from sessionStorage so it survives refresh + navigation
  const [problem, setProblem] = useState(
    () => sessionStorage.getItem("bookingProblem") || "",
  );
  // typing saves straight away, so it survives refresh / going back
  const updateProblem = (value) => {
    const v = String(value || "").slice(0, PROBLEM_MAX);
    setProblem(v);
    try {
      sessionStorage.setItem("bookingProblem", v);
    } catch {
      // storage blocked / full — still works for this visit
    }
  };

  // 📄 Optional medical reports (max 5 MB each) — attached to the booking once it's created
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
        notes: problem.trim() || undefined,
        reportIds: medical.reports.map((r) => r._id),
        caseId: selectedCase?._id || undefined,
        caseTitle: !selectedCase && caseTitle.trim() ? caseTitle.trim() : undefined,
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
          notes: problem.trim() || undefined,
        reportIds: medical.reports.map((r) => r._id),
        caseId: selectedCase?._id || undefined,
        caseTitle: !selectedCase && caseTitle.trim() ? caseTitle.trim() : undefined,
          platform: PLATFORM,
        });
        if (!isMountedRef.current) return;
        sessionStorage.removeItem("bookingIntent");
        sessionStorage.removeItem("bookingProblem");
        clearBookingCase();
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
      // 🗂️ the case changed meanwhile (closed / booked in another tab) → refresh the choices
      if (/^CASE_/.test(err?.response?.data?.code || "")) loadCases();
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
          {loading || !feeReady ? (
            // also wait for the fee, so it doesn't flash $20 first
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
                feeLabel={feeLabel}
                showTotals={false}
              />

              {/* 🗂️ New problem or a follow-up in an existing case */}
              <CasePicker
                cases={caseData?.cases || []}
                prices={caseData?.prices}
                value={selectedCase ? caseId : ""}
                onChange={setCaseId}
                caseTitle={caseTitle}
                onTitleChange={setCaseTitle}
                isFree={fee === 0}
                onCaseReopened={handleCaseReopened}
              />

              {/* ============================================ */}
              {/* 📝 DESCRIBE YOUR PROBLEM — typed right here   */}
              {/* ============================================ */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
                <label
                  htmlFor="checkout-problem"
                  className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2"
                >
                  <FileText size={15} className="text-orange-500" />
                  Describe your problem
                </label>
                {/* fixed height — longer text scrolls inside the box */}
                <textarea
                  id="checkout-problem"
                  value={problem}
                  onChange={(e) => updateProblem(e.target.value)}
                  maxLength={PROBLEM_MAX}
                  placeholder="e.g. I've had irregular periods and fatigue for 3 months…"
                  className="w-full resize-none rounded-xl border border-gray-200 p-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent h-24 overflow-y-auto"
                />
                <div className="flex justify-end mt-1">
                  <span
                    className={`text-xs ${problem.length >= PROBLEM_MAX ? "text-amber-600" : "text-gray-400"}`}
                  >
                    {problem.length} / {PROBLEM_MAX}
                  </span>
                </div>
              </div>

              {/* 📄 Upload reports (optional) — centred */}
              <div className="space-y-2">
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={medical.pickFiles}
                    className="w-full sm:w-1/2 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-gray-300 text-xs font-medium text-gray-600 hover:border-orange-400 hover:text-orange-600 transition-colors bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Paperclip size={15} />
                    Upload Reports ({medical.reports.length})
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 text-center">
                  Optional · PDF, JPG, PNG or DOC · max 5 MB each
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
              <BodyProfileCheckoutRow
                profile={bodyProfile}
                loading={bodyProfileLoading}
                error={bodyProfileError}
              />

              {/* 📋 Reschedule / cancellation rules for this slot */}
              <BookingRulesNote scheduledAt={intent?.scheduledAt} />

              {/* 💰 Consultation fee — last, right above Pay */}
              <FeeSummary fee={fee} feeLabel={feeLabel} />

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
                  `Pay ${bookingFeeLabel} with PayPal`
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
                  <span className="font-semibold">{bookingFeeUsd} USD</span> — the value of{" "}
                  {bookingFeeLabel} today. Your bank or PayPal may apply its own
                  conversion rate.
                </p>
              )}

              {freeCredits === 0 && (
                <p className="text-[11px] text-gray-400 text-center">
                  You'll be redirected to PayPal to complete payment securely,
                  then brought back here automatically.
                </p>
              )}

              <LegalNotices notices={legal.noticesAt("booking_checkout")} brand={legal.content.brand} />

              {consent && (
                <p className="text-[11px] text-gray-400 text-center">
                  <LegalInline text={consent.text} brand={legal.content.brand} />
                </p>
              )}
            </>
          )}
        </div>
      </main>


      <CustomerFooter />

      {profileGateModal}
    </div>
  );
};

export default Checkout;
