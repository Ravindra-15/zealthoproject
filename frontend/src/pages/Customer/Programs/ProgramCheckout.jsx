import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { X, Shield, CreditCard, Calendar } from "lucide-react";
import toast from "react-hot-toast";
import { subscribeToProgram } from "../../../services/programService";

export default function ProgramCheckout() {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const customerToken =
    localStorage.getItem("token") || sessionStorage.getItem("token");
  const doctorToken =
    localStorage.getItem("doctorToken") || sessionStorage.getItem("doctorToken");
  const isAuthenticated = customerToken || doctorToken;

  if (!isAuthenticated) {
    navigate("/login");
    return null;
  }

  const tenure = state?.tenure || "12 Months";
  const price = state?.price || 45;
  const programName = state?.programName || id;

  const [form, setForm] = useState({
    cardNumber: "",
    expiry: "",
    cvv: "",
    cardHolder: "",
    referralCode: "",
  });
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const formatCard = (val) =>
    val.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

  const formatExpiry = (val) => {
    const clean = val.replace(/\D/g, "").slice(0, 4);
    if (clean.length >= 3) return clean.slice(0, 2) + "/" + clean.slice(2);
    return clean;
  };

  const submit = async () => {
    if (!form.cardNumber || !form.expiry || !form.cvv || !form.cardHolder) {
      toast.error("Please fill all payment details.");
      return;
    }
    try {
      setLoading(true);
      await subscribeToProgram({
        programId: id,
        tenure,
        referralCode: form.referralCode || null,
      });
      toast.success("Subscription activated successfully!");
      setTimeout(() => {
        navigate(`/programs/${id}/success`, {
          state: { programName, tenure, price },
        });
      }, 400);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to activate subscription."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-500/60 flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-3xl overflow-hidden border border-gray-100">

        {/* HEADER */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-400 px-8 py-6 relative">
          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 right-4 bg-white text-orange-500 rounded-full p-1.5 transition-all hover:bg-orange-50"
          >
            <X size={16} />
          </button>
          <h2 className="text-white text-2xl font-bold text-center">
            Secure Checkout
          </h2>
          <p className="text-orange-100 text-sm text-center mt-1">
            Complete your payment to start your wellness journey
          </p>
        </div>

        {/* BODY */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-7 lg:p-9">

          {/* LEFT */}
          <div>
            {/* tenure header */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 leading-snug">
                  Your{" "}
                  <span className="text-orange-500">{tenure}</span>{" "}
                  Wellness Plan
                </h3>
                <p className="text-gray-500 mt-2 text-sm leading-relaxed">
                  Access guided recovery videos, premium wellness content,
                  expert-led sessions and progress tracking.
                </p>
              </div>
              <div className="bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3 flex flex-col items-center gap-1 shrink-0">
                <Calendar size={18} className="text-orange-500" />
                <span className="text-xs font-semibold text-gray-700 text-center leading-tight">
                  {tenure}
                </span>
              </div>
            </div>

            {/* order summary */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-5">
              <h4 className="font-bold text-gray-800 mb-4 text-base">
                Order Summary
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Program</span>
                  <span className="font-semibold text-gray-800">{programName}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Duration</span>
                  <span className="font-semibold text-gray-800">{tenure}</span>
                </div>
                <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                  <span className="font-bold text-gray-800">Total</span>
                  <span className="text-3xl font-bold text-orange-500">${price}</span>
                </div>
              </div>
            </div>

            {/* referral */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Referral Code
              </label>
              <div className="flex gap-3">
                <input
                  name="referralCode"
                  value={form.referralCode}
                  onChange={handle}
                  placeholder="Enter referral code"
                  className="flex-1 border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-orange-500 transition-colors"
                />
                <button className="px-5 rounded-2xl border border-orange-300 text-orange-500 font-semibold hover:bg-orange-50 transition-colors text-sm">
                  Apply
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div>
            <h4 className="text-xl font-bold text-gray-800 mb-5">
              Payment Details
            </h4>

            <div className="space-y-4">
              {/* card number */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">
                  Card Number
                </label>
                <input
                  name="cardNumber"
                  value={form.cardNumber}
                  onChange={(e) =>
                    setForm({ ...form, cardNumber: formatCard(e.target.value) })
                  }
                  placeholder="1234 5678 9012 3456"
                  className="w-full border border-gray-200 rounded-2xl px-5 py-3.5 text-sm outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              {/* expiry + cvv */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    Expiry
                  </label>
                  <input
                    name="expiry"
                    value={form.expiry}
                    onChange={(e) =>
                      setForm({ ...form, expiry: formatExpiry(e.target.value) })
                    }
                    placeholder="MM/YY"
                    className="w-full border border-gray-200 rounded-2xl px-5 py-3.5 text-sm outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    CVV
                  </label>
                  <input
                    name="cvv"
                    value={form.cvv}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        cvv: e.target.value.replace(/\D/g, "").slice(0, 3),
                      })
                    }
                    placeholder="123"
                    className="w-full border border-gray-200 rounded-2xl px-5 py-3.5 text-sm outline-none focus:border-orange-500 transition-colors"
                  />
                </div>
              </div>

              {/* cardholder */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">
                  Cardholder Name
                </label>
                <input
                  name="cardHolder"
                  value={form.cardHolder}
                  onChange={handle}
                  placeholder="Rahul Sharma"
                  className="w-full border border-gray-200 rounded-2xl px-5 py-3.5 text-sm outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              {/* pay button */}
              <button
                onClick={submit}
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-full transition-all shadow-[0_8px_24px_rgba(249,115,22,0.35)] disabled:opacity-60 mt-2"
              >
                {loading ? "Processing..." : `Pay $${price}`}
              </button>

              {/* trust badges */}
              <div className="flex flex-wrap items-center justify-center gap-5 pt-2">
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Shield size={12} className="text-green-500" />
                  SSL Secure
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Shield size={12} className="text-green-500" />
                  PCI Protected
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <CreditCard size={12} className="text-green-500" />
                  All Cards Accepted
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}