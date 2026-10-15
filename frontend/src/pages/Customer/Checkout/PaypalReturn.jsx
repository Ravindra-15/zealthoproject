/**
 * CUSTOMER MODULE — PayPal Return Handler
 * PayPal redirects the buyer here (?token=<orderId>) after they approve
 * payment on PayPal's own page. We capture the order here, then either:
 *  - success → clear the booking intent, go to the existing confirmation page
 *  - failure → show a clear message, let them go back to checkout and retry
 *             (booking intent is NOT cleared on failure, so nothing is lost)
 */

import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import toast from "react-hot-toast";

import CustomerNavbar from "../../../components/customer/layout/CustomerNavbar";
import CustomerFooter from "../../../components/customer/layout/CustomerFooter";
import { captureAppointmentPaypalOrder } from "../../../services/customerAppointmentService";

const PLATFORM = "zealtho";

const PaypalReturn = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState("capturing"); // "capturing" | "success" | "error"
  const [errorMessage, setErrorMessage] = useState("");
  const ranOnce = useRef(false);

  useEffect(() => {
    if (ranOnce.current) return; // StrictMode / re-render guard — never capture twice
    ranOnce.current = true;

    const run = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const orderId = params.get("token");

        const raw = sessionStorage.getItem("bookingIntent");
        const intent = raw ? JSON.parse(raw) : null;
        const problem = sessionStorage.getItem("bookingProblem") || "";

        if (!orderId || !intent?.doctorId || !intent?.scheduledAt) {
          setStatus("error");
          setErrorMessage("We couldn't find your booking details. Please start again.");
          return;
        }

        const result = await captureAppointmentPaypalOrder({
          orderId,
          doctorId: intent.doctorId,
          scheduledAt: intent.scheduledAt,
          notes: problem || undefined,
          platform: PLATFORM,
        });

        sessionStorage.removeItem("bookingIntent");
        sessionStorage.removeItem("bookingProblem");
        setStatus("success");
        toast.success("Appointment confirmed!");
        navigate(`/booking/confirmation/${result.appointment._id}`, { replace: true });
      } catch (err) {
        setStatus("error");
        setErrorMessage(
          err?.response?.data?.message ||
            "Payment could not be completed. If you were charged, contact support."
        );
      }
    };

    run();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <CustomerNavbar />

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          {status === "capturing" && (
            <>
              <Loader2 size={36} className="text-orange-500 animate-spin mx-auto mb-4" />
              <h1 className="text-lg font-bold text-gray-900 mb-1">Confirming your payment…</h1>
              <p className="text-sm text-gray-500">
                Please don't close this page — this only takes a moment.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-4" />
              <h1 className="text-lg font-bold text-gray-900 mb-1">Payment confirmed!</h1>
              <p className="text-sm text-gray-500">Redirecting you to your appointment…</p>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle size={40} className="text-red-500 mx-auto mb-4" />
              <h1 className="text-lg font-bold text-gray-900 mb-2">Payment couldn't be completed</h1>
              <p className="text-sm text-gray-600 mb-6">{errorMessage}</p>
              <button
                type="button"
                onClick={() => navigate("/checkout", { replace: true })}
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-full text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors"
              >
                Back to Checkout
              </button>
            </>
          )}
        </div>
      </main>

      <CustomerFooter />
    </div>
  );
};

export default PaypalReturn;
