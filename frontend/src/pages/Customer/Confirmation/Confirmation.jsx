/**
 * CUSTOMER MODULE — Booking Confirmation Page
 * Loads the just-created appointment, shows success state + reused ConsultationCard.
 * Auth-gated. Linked to from Checkout post-payment.
 */

import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { CheckCircle2, ArrowRight, PartyPopper } from "lucide-react";

import successImage from "../../../assets/image-Photoroom.png";

import CustomerNavbar from "../../../components/customer/layout/CustomerNavbar";
import CustomerFooter from "../../../components/customer/layout/CustomerFooter";
import ConsultationCard from "../Checkout/components/ConsultationCard";

import { getMyAppointment } from "../../../services/customerAppointmentService";
import {
  isCustomerLoggedIn,
  buildLoginRedirect,
} from "../../../utils/customerAuthHelper";

const Confirmation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isMountedRef = useRef(false);

  // ============================================
  // 🔒 AUTH GATE
  // ============================================
  useEffect(() => {
    if (!isCustomerLoggedIn()) {
      navigate(buildLoginRedirect(location.pathname), { replace: true });
    }
  }, [navigate, location]);

  // ============================================
  // 📥 LOAD APPOINTMENT
  // ============================================
  useEffect(() => {
    isMountedRef.current = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getMyAppointment(id);
        if (!isMountedRef.current) return;
        setAppointment(result);
      } catch (err) {
        if (!isMountedRef.current) return;
        const msg =
          err?.response?.data?.message || "Failed to load appointment";
        setError(msg);
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    };

    if (isCustomerLoggedIn()) load();

    return () => {
      isMountedRef.current = false;
    };
  }, [id]);

  // ============================================
  // 🎨 RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <CustomerNavbar />

      <main className="flex-1 py-14 sm:py-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 sm:pt-4 pb-10 space-y-6">
          {/* ============================================ */}
          {/* 🎉 CELEBRATION HEADER                         */}
          {/* ============================================ */}
          <div className="text-center">
            <div className="relative flex justify-center">
              {successImage ? (
                <img
                  src={successImage}
                  alt="Consultation Confirmed"
                  className="w-48 sm:w-64 md:w-72 h-auto object-contain"
                />
              ) : (
                <div
                  className="
                        w-20 h-20 rounded-full
                        bg-gradient-to-br from-orange-100 to-pink-100
                        flex items-center justify-center
                        relative
                    "
                >
                  <PartyPopper size={32} className="text-orange-500" />

                  <CheckCircle2
                    size={20}
                    className="
                        absolute -bottom-1 -right-1
                        text-emerald-500 bg-white
                        rounded-full p-0.5
                        "
                  />
                </div>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-4 tracking-tight">
              Your Consultation is Confirmed!
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1.5">
              You will receive a reminder 15 minutes before your appointment
            </p>
          </div>

          {/* ============================================ */}
          {/* 📋 DETAILS                                    */}
          {/* ============================================ */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse h-56" />
          ) : error || !appointment ? (
            <div className="bg-white rounded-2xl border border-gray-100 px-6 py-12 text-center">
              <p className="text-sm font-medium text-gray-700 mb-1">
                {error || "Appointment not found"}
              </p>
              <button
                type="button"
                onClick={() => navigate("/my-appointments")}
                className="mt-3 text-xs font-semibold text-orange-600 hover:underline"
              >
                View my appointments
              </button>
            </div>
          ) : (
            <>
              <ConsultationCard
                doctor={appointment.doctor}
                scheduledAt={appointment.scheduledAt}
                fee={appointment.fee}
                showTotals={false}
              />

              {/* CTA */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => navigate("/my-appointments")}
                  className="
                    inline-flex items-center gap-1.5
                    px-5 py-2 rounded-full
                    text-sm font-semibold text-orange-600
                    hover:underline
                    transition-colors
                  "
                >
                  My Appointments
                  <ArrowRight size={14} />
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

export default Confirmation;
