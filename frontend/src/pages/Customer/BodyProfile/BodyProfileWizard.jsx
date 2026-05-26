/**
 * CUSTOMER MODULE — Body Profile Wizard
 * 3-step form: Physical → Lifestyle → Symptoms+Family.
 * Auto-saves between steps; final step calls complete().
 * Auth-gated. Returns to /my-appointments on success.
 */

import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Check,
  Activity,
  Leaf,
  Heart,
} from "lucide-react";
import toast from "react-hot-toast";

import CustomerNavbar from "../../../components/customer/layout/CustomerNavbar";
import CustomerFooter from "../../../components/customer/layout/CustomerFooter";

import Step1Physical from "./components/Step1Physical";
import Step2Lifestyle from "./components/Step2Lifestyle";
import Step3SymptomsFamily from "./components/Step3SymptomsFamily";

import useMyBodyProfile from "../../../hooks/useMyBodyProfile";
import {
  isCustomerLoggedIn,
  buildLoginRedirect,
} from "../../../utils/customerAuthHelper";

// ============================================
// 📑 STEP META
// ============================================
const STEPS = [
  {
    id: 1,
    title: "Physical Attributes",
    subtitle: "Body measurements & metabolic markers",
    icon: Activity,
  },
  {
    id: 2,
    title: "Lifestyle & Habits",
    subtitle: "Sleep, stress, activity, hydration",
    icon: Leaf,
  },
  {
    id: 3,
    title: "Symptoms & Family",
    subtitle: "Well-being and medical history",
    icon: Heart,
  },
];

// ============================================
// 🧭 STEP INDICATOR — Figma styled
// ============================================
const StepIndicator = ({ currentStep }) => (
  <div className="flex items-start justify-between max-w-3xl mx-auto mb-10 relative px-2">
    {STEPS.map((step, idx) => {
      const isCompleted = step.id < currentStep;
      const isActive = step.id === currentStep;
      const Icon = step.icon;
      const isLast = idx === STEPS.length - 1;

      return (
        <React.Fragment key={step.id}>
          {/* Node + label */}
          <div className="flex flex-col items-center relative z-10 shrink-0">
            <div
              className={`
                w-12 h-12 rounded-full flex items-center justify-center
                border-2 transition-all duration-300
                ${
                  isCompleted
                    ? "bg-orange-500 border-orange-500 text-white"
                    : isActive
                    ? "bg-orange-500 border-orange-500 text-white shadow-[0_6px_18px_rgba(249,115,22,0.35)]"
                    : "bg-white border-gray-200 text-gray-300"
                }
              `}
            >
              {isCompleted ? (
                <Check size={20} strokeWidth={3} />
              ) : (
                <Icon size={20} />
              )}
            </div>
            <p
              className={`
                mt-2.5 text-[11px] sm:text-xs font-semibold text-center
                leading-tight max-w-[110px]
                ${
                  isActive || isCompleted
                    ? "text-orange-500"
                    : "text-gray-400"
                }
              `}
            >
              {step.title}
            </p>
          </div>

          {/* Connecting line (between nodes only) */}
          {!isLast && (
            <div className="flex-1 h-0.5 mt-6 mx-1 sm:mx-2 rounded-full overflow-hidden bg-gray-200">
              <div
                className={`h-full bg-orange-500 transition-all duration-300 ${
                  step.id < currentStep ? "w-full" : "w-0"
                }`}
              />
            </div>
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ============================================
// 📋 MAIN WIZARD
// ============================================
const BodyProfileWizard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { profile, loading: profileLoading, saving, save, complete } =
    useMyBodyProfile();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({});

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
  // 🔄 SEED FORM FROM EXISTING PROFILE
  // ============================================
  useEffect(() => {
    isMountedRef.current = true;
    if (profile) {
      setFormData({
        metabolic: profile.metabolic || {},
        physical: profile.physical || {},
        lifestyle: profile.lifestyle || {},
        symptoms: profile.symptoms || {},
        familyHistory: profile.familyHistory || {},
      });
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [profile]);

  // ============================================
  // ⏭️ NEXT
  // ============================================
  const handleNext = async () => {
    const result = await save(formData);
    if (!result) return;

    if (step < STEPS.length) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // ============================================
  // ⏮️ BACK
  // ============================================
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate(-1);
    }
  };

  // ============================================
  // ✅ FINAL SUBMIT
  // ============================================
  const handleComplete = async () => {
    const result = await complete(formData);
    if (!result) return;

    toast.success("Body profile completed!");
    navigate("/my-appointments");
  };

  const currentMeta = STEPS[step - 1];

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
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-orange-500 transition-colors"
            disabled={saving}
          >
            <ArrowLeft size={16} />
            Back
          </button>

          {/* 🏷️ Page title */}
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Your Body Profile
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Help your doctor personalize your care
            </p>
          </div>

          {/* 📊 Step indicator */}
          <StepIndicator currentStep={step} />

          {/* ============================================ */}
          {/* 📋 WIZARD CARD                                */}
          {/* ============================================ */}
          <div
            className="
              bg-white rounded-2xl border border-gray-100
              shadow-[0_1px_3px_rgba(16,24,40,0.04)]
              p-5 sm:p-7
            "
          >
            {/* Step header */}
            <div className="mb-6">
              <h2 className="text-base font-bold text-gray-900">
                {currentMeta.title}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {currentMeta.subtitle}
              </p>
            </div>

            {/* Step content */}
            {profileLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-12 bg-gray-100 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <>
                {step === 1 && (
                  <Step1Physical data={formData} onChange={setFormData} />
                )}
                {step === 2 && (
                  <Step2Lifestyle data={formData} onChange={setFormData} />
                )}
                {step === 3 && (
                  <Step3SymptomsFamily data={formData} onChange={setFormData} />
                )}
              </>
            )}

            {/* ============================================ */}
            {/* ⬆️ NAV BUTTONS                                */}
            {/* ============================================ */}
            <div className="mt-7 pt-5 border-t border-gray-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleBack}
                disabled={saving}
                className="
                  inline-flex items-center gap-1.5
                  px-4 py-2 rounded-full
                  text-xs font-semibold text-gray-600
                  bg-white border border-gray-200
                  hover:bg-gray-50
                  transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                <ArrowLeft size={13} />
                {step === 1 ? "Cancel" : "Previous"}
              </button>

              {step < STEPS.length ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={saving}
                  className="
                    inline-flex items-center justify-center gap-1.5
                    px-6 py-2.5 rounded-full
                    text-sm font-semibold text-white
                    bg-orange-500 hover:bg-orange-600
                    transition-colors
                    shadow-[0_4px_14px_rgba(249,115,22,0.3)]
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      {STEPS[step].title}
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={saving}
                  className="
                    inline-flex items-center justify-center gap-1.5
                    px-6 py-2.5 rounded-full
                    text-sm font-semibold text-white
                    bg-orange-500 hover:bg-orange-600
                    transition-colors
                    shadow-[0_4px_14px_rgba(249,115,22,0.3)]
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      Done
                      <Check size={14} strokeWidth={3} />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      <CustomerFooter />
    </div>
  );
};

export default BodyProfileWizard;