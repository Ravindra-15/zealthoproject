/**
 * CUSTOMER MODULE — PayPal Return Handler (appointment booking)
 * PayPal sends the buyer here (?token=<orderId>) after they approve payment.
 * We confirm (capture) the payment, then go to the booking confirmation.
 *
 * Edge cases handled:
 *  - only the PayPal token is needed — booking details live on the server,
 *    so this works even if the browser lost its saved checkout data
 *  - network drop / timeout / server busy → automatic retries, then a
 *    "Try again" button; retrying never charges or books twice
 *  - refresh or double tab → the backend returns the same booking
 *  - definite failures (declined, slot taken + refunded) → clear message
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

import CustomerNavbar from "../../../components/customer/layout/CustomerNavbar";
import CustomerFooter from "../../../components/customer/layout/CustomerFooter";
import { captureAppointmentPaypalOrder } from "../../../services/customerAppointmentService";
import {
  getPaymentErrorMessage,
  isRetryablePaymentError,
  wait,
} from "../../../utils/paymentErrors";

// 🎨 Brand accent for this program
const ACCENT_TEXT = "text-orange-500";
const ACCENT_BTN = "bg-orange-500 hover:bg-orange-600";

const MAX_AUTO_RETRIES = 4;

const PaypalReturn = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState("capturing"); // capturing | success | error
  const [errorMessage, setErrorMessage] = useState("");
  const [retryable, setRetryable] = useState(false);
  const [slow, setSlow] = useState(false);

  const orderIdRef = useRef(new URLSearchParams(window.location.search).get("token"));
  const runningRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const confirmPayment = useCallback(async () => {
    if (runningRef.current) return; // never run two confirmations at once
    runningRef.current = true;
    setStatus("capturing");
    setErrorMessage("");
    setRetryable(false);
    setSlow(false);

    const orderId = orderIdRef.current;
    if (!orderId) {
      setStatus("error");
      setErrorMessage("This payment link is incomplete. Please start checkout again — you haven't been charged.");
      runningRef.current = false;
      return;
    }

    for (let attempt = 0; attempt <= MAX_AUTO_RETRIES; attempt++) {
      try {
        if (attempt > 0) setSlow(true);
        const result = await captureAppointmentPaypalOrder({ orderId });
        if (!mountedRef.current) return;

        sessionStorage.removeItem("bookingIntent");
        sessionStorage.removeItem("bookingProblem");
        setStatus("success");
        toast.success("Payment received — appointment confirmed!");
        navigate(`/booking/confirmation/${result.appointment._id}`, { replace: true });
        return;
      } catch (err) {
        if (!mountedRef.current) return;
        if (isRetryablePaymentError(err) && attempt < MAX_AUTO_RETRIES) {
          await wait(Math.min(2000 * (attempt + 1), 8000));
          continue;
        }
        setStatus("error");
        setErrorMessage(getPaymentErrorMessage(err, "We couldn't confirm your payment."));
        setRetryable(isRetryablePaymentError(err));
        runningRef.current = false;
        return;
      }
    }
  }, [navigate]);

  useEffect(() => {
    confirmPayment();
  }, [confirmPayment]);

  const hasCheckoutIntent = !!sessionStorage.getItem("bookingIntent");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <CustomerNavbar />

      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 text-center">
          {status === "capturing" && (
            <>
              <Loader2 size={36} className={`${ACCENT_TEXT} animate-spin mx-auto mb-4`} />
              <h1 className="text-lg font-bold text-gray-900 mb-1">Confirming your payment…</h1>
              <p className="text-sm text-gray-500">
                {slow
                  ? "This is taking a little longer than usual — still working on it. Please keep this page open."
                  : "Please don't close or refresh this page — this only takes a moment."}
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-4" />
              <h1 className="text-lg font-bold text-gray-900 mb-1">Payment confirmed!</h1>
              <p className="text-sm text-gray-500">Taking you to your appointment…</p>
            </>
          )}

          {status === "error" && retryable && (
            <>
              <AlertTriangle size={40} className="text-amber-500 mx-auto mb-4" />
              <h1 className="text-lg font-bold text-gray-900 mb-2">We couldn't confirm your payment yet</h1>
              <p className="text-sm text-gray-600 mb-3">{errorMessage}</p>
              <p className="text-xs text-gray-500 mb-6">
                If PayPal already charged you, please don't pay again — your booking will be
                confirmed automatically within a few minutes and you'll get a notification.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <button
                  type="button"
                  onClick={confirmPayment}
                  className={`inline-flex items-center justify-center px-6 py-2.5 rounded-full text-sm font-semibold text-white ${ACCENT_BTN} transition-colors`}
                >
                  Try again
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/my-appointments", { replace: true })}
                  className="inline-flex items-center justify-center px-6 py-2.5 rounded-full text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  My Appointments
                </button>
              </div>
            </>
          )}

          {status === "error" && !retryable && (
            <>
              <XCircle size={40} className="text-red-500 mx-auto mb-4" />
              <h1 className="text-lg font-bold text-gray-900 mb-2">Payment couldn't be completed</h1>
              <p className="text-sm text-gray-600 mb-6">{errorMessage}</p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => navigate(hasCheckoutIntent ? "/checkout" : "/book-doctor", { replace: true })}
                  className={`inline-flex items-center justify-center px-6 py-2.5 rounded-full text-sm font-semibold text-white ${ACCENT_BTN} transition-colors`}
                >
                  {hasCheckoutIntent ? "Back to Checkout" : "Browse Doctors"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/my-appointments", { replace: true })}
                  className="inline-flex items-center justify-center px-6 py-2.5 rounded-full text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  My Appointments
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      <CustomerFooter />
    </div>
  );
};

export default PaypalReturn;
