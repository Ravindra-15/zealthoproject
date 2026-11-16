/**
 * CUSTOMER MODULE — Body Profile progress ("Complete your profile")
 * A ring with the % of the 27-point body profile filled + the 3 wizard
 * steps as a checklist. Clicking it shows all 27 points with the answers.
 *
 *  <BodyProfileProgressCard profile />          → My Appointments (inline card)
 *  <BodyProfileCheckoutRow profile loading error /> → Checkout (compact row)
 *  <BodyProfilePrompt appointmentId />          → Booking confirmed (popup, once per booking)
 *
 * Never blocks booking — every place has a "not now" way out.
 */

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Leaf,
  Heart,
  Check,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ClipboardList,
  HeartPulse,
  Pencil,
  X,
} from "lucide-react";

import BP_THEME from "./bodyProfileTheme";
import useMyBodyProfile from "../../../hooks/useMyBodyProfile";
import { getBodyProfileProgress } from "../../../utils/bodyProfileProgress";

const STEP_ICONS = { 1: Activity, 2: Leaf, 3: Heart };

const wizardUrl = (step, from) => {
  const q = new URLSearchParams();
  if (from) q.set("from", from);
  if (step) q.set("step", String(step));
  return `/body-profile?${q.toString()}`;
};

const stepsLeftText = (p) => {
  const left = p.steps.filter((s) => !s.done).length;
  if (!p.started) return "Not started yet · takes just a few seconds";
  if (left === 0) return "All 27 points answered";
  return `${p.filled} of ${p.total} points answered · ${left} step${left > 1 ? "s" : ""} left`;
};

// ============================================
// ⭕ PROGRESS RING
// ============================================
export const ProgressRing = ({ percent = 0, size = 112, stroke = 14 }) => {
  const gradId = `bpRing${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <span
      className="relative inline-block flex-shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${p}% complete`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={BP_THEME.ringFrom} />
            <stop offset="100%" stopColor={BP_THEME.ringTo} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1F2F6" strokeWidth={stroke} />
        {p > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={stroke}
            strokeLinecap={p < 100 ? "butt" : "round"}
            strokeDasharray={c}
            strokeDashoffset={c * (1 - p / 100)}
            style={{ transition: "stroke-dashoffset 600ms ease" }}
          />
        )}
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center font-bold text-gray-900 tabular-nums"
        style={{ fontSize: Math.max(10, Math.round(size * 0.18)) }}
      >
        {p}%
      </span>
    </span>
  );
};

// ============================================
// ✅ 3-STEP CHECKLIST
// ============================================
const StepStatus = ({ step }) =>
  step.done ? (
    <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" aria-label="done" />
  ) : (
    <span className="text-[10px] font-semibold text-gray-400 tabular-nums flex-shrink-0">
      {step.filled}/{step.total}
    </span>
  );

const StepChecklist = ({ progress }) => (
  <ul className="space-y-2 min-w-0">
    {progress.steps.map((s) => {
      const Icon = STEP_ICONS[s.id];
      return (
        <li key={s.id} className="flex items-center gap-2 min-w-0">
          <Icon size={15} className={`flex-shrink-0 ${s.done ? "text-gray-700" : "text-gray-400"}`} />
          <span
            className={`text-xs sm:text-sm truncate ${s.done ? "font-semibold text-gray-900" : "text-gray-500"}`}
          >
            {s.title}
          </span>
          <StepStatus step={s} />
        </li>
      );
    })}
  </ul>
);

// ============================================
// 🪟 MODAL SHELL — bottom sheet on phones, centred dialog on desktop
// ============================================
const Sheet = ({ titleId, onClose, children }) => {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // runs once per open: lock page scroll, Esc closes, focus the dialog
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/50 flex items-end sm:items-center justify-center sm:px-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 z-10 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
        >
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  );
};

// ============================================
// 📋 ALL 27 POINTS
// ============================================
const DetailsView = ({ progress, onEditStep }) => (
  <div className="space-y-4">
    {progress.steps.map((s) => {
      const Icon = STEP_ICONS[s.id];
      return (
        <section key={s.id} className="rounded-2xl border border-gray-100 bg-gray-50/60 p-3 sm:p-4">
          <div className="flex items-center gap-2.5">
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${BP_THEME.softBg}`}>
              <Icon size={15} className={BP_THEME.icon} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-gray-900">
                Step {s.id} · {s.title}
              </span>
              <span className="block text-[11px] text-gray-500">
                {s.done ? "All answered" : `${s.filled} of ${s.total} answered`}
              </span>
            </span>
            <button
              type="button"
              onClick={() => onEditStep(s.id)}
              className={`inline-flex items-center gap-1 text-xs font-semibold flex-shrink-0 rounded-md px-1 ${BP_THEME.link} ${BP_THEME.focus}`}
            >
              <Pencil size={12} />
              {s.filled === 0 ? "Fill" : "Edit"}
            </button>
          </div>

          {s.groups.map((g) => (
            <div key={g.title} className="mt-3">
              {s.groups.length > 1 && (
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">{g.title}</p>
              )}
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {g.items.map((it) => (
                  <li
                    key={it.key}
                    className="flex items-center justify-between gap-2 rounded-lg bg-white border border-gray-100 px-3 py-2"
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      {it.answered ? (
                        <Check size={12} strokeWidth={3} className="text-emerald-500 flex-shrink-0" />
                      ) : (
                        <span className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0" />
                      )}
                      <span className="text-xs text-gray-600 truncate">{it.label}</span>
                    </span>
                    {it.answered ? (
                      <span className="text-xs font-semibold text-gray-900 text-right break-words min-w-0">
                        {it.value}
                      </span>
                    ) : (
                      <span className="text-[11px] italic text-gray-400 flex-shrink-0">Not added</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      );
    })}
  </div>
);

// ============================================
// 🔲 SUMMARY (ring + checklist) — used by card + popup
// ============================================
// (tap anywhere on it → all 27 points; the "View all" button is the keyboard way)
const Summary = ({ progress, ringSize = 112, onOpenDetails }) => (
  <div onClick={onOpenDetails} className="w-full flex items-center gap-4 sm:gap-6 text-left cursor-pointer">
    <ProgressRing percent={progress.percent} size={ringSize} stroke={Math.round(ringSize / 8)} />
    <span className="min-w-0 flex-1 space-y-2.5">
      <span className="block text-xs text-gray-500 leading-relaxed">
        Your doctor reads these answers before the call — the more you fill, the better the advice.
      </span>
      <StepChecklist progress={progress} />
    </span>
  </div>
);

// ============================================
// 🧾 DETAILS MODAL (used by card + checkout row)
// ============================================
const DetailsModal = ({ progress, onClose, onEditStep, onComplete }) => {
  const titleId = `bpDetails${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <Sheet titleId={titleId} onClose={onClose}>
      <div className="px-5 sm:px-6 pt-5 pb-3 border-b border-gray-100 pr-12">
        <div className="flex items-center gap-3">
          <ProgressRing percent={progress.percent} size={52} stroke={7} />
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-bold text-gray-900">
              Your 27-point body profile
            </h2>
            <p className="text-[11px] text-gray-500">{stepsLeftText(progress)}</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
        <DetailsView progress={progress} onEditStep={onEditStep} />
      </div>
      <div className="px-5 sm:px-6 py-4 border-t border-gray-100 flex flex-col-reverse sm:flex-row gap-2">
        <button
          type="button"
          onClick={onClose}
          className={`flex-1 py-2.5 rounded-full text-sm font-semibold ${BP_THEME.btnOutline} ${BP_THEME.focus}`}
        >
          Close
        </button>
        {!progress.isDone && (
          <button
            type="button"
            onClick={onComplete}
            className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-colors ${BP_THEME.btn} ${BP_THEME.focus}`}
          >
            Complete Profile
          </button>
        )}
      </div>
    </Sheet>
  );
};

// ============================================
// 📌 MY APPOINTMENTS — inline card (hidden once the profile is done)
// ============================================
export const BodyProfileProgressCard = ({ profile }) => {
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = useState(false);
  const progress = useMemo(() => getBodyProfileProgress(profile), [profile]);

  if (progress.isDone) return null;

  return (
    <section
      aria-label="Complete your body profile"
      className={`bg-white rounded-2xl border ${BP_THEME.softBorder} p-4 sm:p-6 shadow-[0_1px_3px_rgba(16,24,40,0.04)]`}
    >
      <div className="flex items-start gap-3">
        <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${BP_THEME.softBg}`}>
          <HeartPulse size={18} className={BP_THEME.icon} />
        </span>
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-gray-900">Complete Your Body Profile</h2>
          <p className="text-xs text-gray-500 mt-0.5">{stepsLeftText(progress)}</p>
        </div>
      </div>

      <div className="border-t border-dashed border-gray-200 my-4" />
      <Summary progress={progress} ringSize={104} onOpenDetails={() => setShowDetails(true)} />
      <div className="border-t border-dashed border-gray-200 my-4" />

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
        <button
          type="button"
          onClick={() => setShowDetails(true)}
          className={`w-full sm:w-auto px-5 py-2.5 rounded-full text-sm font-semibold ${BP_THEME.btnOutline} ${BP_THEME.focus}`}
        >
          View all 27 points
        </button>
        <button
          type="button"
          onClick={() => navigate(wizardUrl(progress.nextStep))}
          className={`w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-full text-sm font-semibold transition-colors ${BP_THEME.btn} ${BP_THEME.focus}`}
        >
          {progress.started ? "Continue Profile" : "Complete Profile"}
          <ChevronRight size={15} />
        </button>
      </div>

      {showDetails && (
        <DetailsModal
          progress={progress}
          onClose={() => setShowDetails(false)}
          onEditStep={(step) => navigate(wizardUrl(step))}
          onComplete={() => navigate(wizardUrl(progress.nextStep))}
        />
      )}
    </section>
  );
};

// ============================================
// 🛒 CHECKOUT — compact row (never blocks paying)
// ============================================
export const BodyProfileCheckoutRow = ({ profile, loading, error }) => {
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = useState(false);
  const progress = useMemo(() => getBodyProfileProgress(profile), [profile]);

  if (loading) return <div className="w-full h-[68px] rounded-2xl bg-gray-100 animate-pulse" />;

  // couldn't load it — plain link to the form, no % we can't trust
  if (error) {
    return (
      <button
        type="button"
        onClick={() => navigate(wizardUrl(null, "checkout"))}
        className={`w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-4 rounded-2xl border ${BP_THEME.softBorder} ${BP_THEME.softBg} ${BP_THEME.focus}`}
      >
        <span className="flex items-center gap-2.5 text-left">
          <HeartPulse size={18} className={`${BP_THEME.icon} flex-shrink-0`} />
          <span className="text-sm font-semibold text-gray-800">Your Body Profile</span>
        </span>
        <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowDetails(true)}
        className={`w-full flex items-center gap-3 px-4 sm:px-5 py-3 rounded-2xl border transition-colors text-left ${
          progress.isDone
            ? `border-gray-100 bg-white ${BP_THEME.hoverBorder}`
            : `${BP_THEME.softBorder} ${BP_THEME.softBg}`
        } ${BP_THEME.focus}`}
      >
        {progress.isDone ? (
          <span className="w-11 h-11 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={20} className="text-emerald-500" />
          </span>
        ) : (
          <ProgressRing percent={progress.percent} size={44} stroke={5} />
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-gray-900">
            {progress.isDone ? "Body Profile completed" : "Complete Your Body Profile"}
          </span>
          <span className="block text-[11px] text-gray-500 mt-0.5">
            {progress.isDone ? "View or edit your 27 points" : `${stepsLeftText(progress)} · helps your doctor`}
          </span>
        </span>
        <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
      </button>

      {showDetails && (
        <DetailsModal
          progress={progress}
          onClose={() => setShowDetails(false)}
          onEditStep={(step) => navigate(wizardUrl(step, "checkout"))}
          onComplete={() => navigate(wizardUrl(progress.nextStep, "checkout"))}
        />
      )}
    </>
  );
};

// ============================================
// 🎉 BOOKING CONFIRMED — popup once per booking, only if not done
// ============================================
const PROMPT_KEY = "bodyProfilePromptShown:";

const alreadyPrompted = (id) => {
  try {
    return localStorage.getItem(PROMPT_KEY + id) === "1";
  } catch {
    return false;
  }
};
const markPrompted = (id) => {
  try {
    localStorage.setItem(PROMPT_KEY + id, "1");
  } catch {
    /* private mode — it may show again, that's fine */
  }
};

export const BodyProfilePrompt = ({ appointmentId }) => {
  const navigate = useNavigate();
  const { profile, loading, error } = useMyBodyProfile();
  const [open, setOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const progress = useMemo(() => getBodyProfileProgress(profile), [profile]);
  const titleId = `bpPrompt${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  useEffect(() => {
    if (!appointmentId || loading || error || progress.isDone || alreadyPrompted(appointmentId)) return undefined;
    // let the "confirmed" screen show first
    const t = setTimeout(() => {
      markPrompted(appointmentId);
      setOpen(true);
    }, 900);
    return () => clearTimeout(t);
  }, [appointmentId, loading, error, progress.isDone]);

  if (!open) return null;
  const close = () => setOpen(false);

  return (
    <Sheet titleId={titleId} onClose={close}>
      {showDetails ? (
        <>
          <div className="px-5 sm:px-6 pt-5 pb-3 border-b border-gray-100 pr-12">
            <button
              type="button"
              onClick={() => setShowDetails(false)}
              className={`inline-flex items-center gap-1 text-xs font-semibold mb-1 ${BP_THEME.link}`}
            >
              <ChevronLeft size={14} /> Back
            </button>
            <h2 id={titleId} className="text-base font-bold text-gray-900">
              Your 27-point body profile
            </h2>
            <p className="text-[11px] text-gray-500">{stepsLeftText(progress)}</p>
          </div>
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
            <DetailsView progress={progress} onEditStep={(step) => navigate(wizardUrl(step))} />
          </div>
        </>
      ) : (
        <div className="overflow-y-auto px-5 sm:px-7 pt-6 pb-5">
          <div className="flex items-center gap-2.5 pr-8">
            <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${BP_THEME.softBg}`}>
              <ClipboardList size={18} className={BP_THEME.icon} />
            </span>
            <h2 id={titleId} className="text-lg font-bold text-gray-900">
              Complete Your Body Profile
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
            Your consultation is booked. Answer a few health questions so your doctor knows you before the call.
          </p>

          <div className="border-t border-dashed border-gray-200 my-4" />
          <Summary progress={progress} ringSize={112} onOpenDetails={() => setShowDetails(true)} />
          <button
            type="button"
            onClick={() => setShowDetails(true)}
            className={`mt-3 text-xs font-semibold ${BP_THEME.link}`}
          >
            See all 27 points
          </button>
          <div className="border-t border-dashed border-gray-200 my-4" />

          <p className="text-xs text-gray-500 leading-relaxed">
            A complete profile helps your doctor personalise your care and saves time on the call.
          </p>
        </div>
      )}

      <div className="px-5 sm:px-7 py-4 border-t border-gray-100 flex flex-col-reverse sm:flex-row gap-2">
        <button
          type="button"
          onClick={close}
          className={`flex-1 py-2.5 rounded-full text-sm font-semibold border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 ${BP_THEME.focus}`}
        >
          Continue Anyway
        </button>
        <button
          type="button"
          onClick={() => navigate(wizardUrl(progress.nextStep))}
          className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-colors ${BP_THEME.btn} ${BP_THEME.focus}`}
        >
          {progress.started ? "Continue Profile" : "Complete Profile"}
        </button>
      </div>
    </Sheet>
  );
};
