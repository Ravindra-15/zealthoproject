import { useEffect, useState } from "react";
import { X } from "lucide-react";

// 🎉 Shown once on Home right after onboarding finishes (flag set by
// ProfileStepTwo). Closes itself after a few seconds or via ✕ / backdrop.
export const ONBOARDING_WELCOME_KEY = "onboardingWelcome";
const AUTO_CLOSE_SECONDS = 5;

const readUser = () => {
  try {
    return (
      JSON.parse(localStorage.getItem("user")) ||
      JSON.parse(sessionStorage.getItem("user"))
    );
  } catch {
    return null;
  }
};

export default function OnboardingWelcomePopup() {
  const [open, setOpen] = useState(
    () => sessionStorage.getItem(ONBOARDING_WELCOME_KEY) === "1"
  );
  const [secondsLeft, setSecondsLeft] = useState(AUTO_CLOSE_SECONDS);
  const [user] = useState(readUser);

  // one-time flag — clear it so a refresh doesn't show the popup again
  useEffect(() => {
    sessionStorage.removeItem(ONBOARDING_WELCOME_KEY);
  }, []);

  // ⏱️ auto-close countdown
  useEffect(() => {
    if (!open) return;
    if (secondsLeft <= 0) {
      setOpen(false);
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [open, secondsLeft]);

  if (!open) return null;

  const name = user?.fullName || user?.nickName;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center px-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative bg-white rounded-3xl w-full max-w-md p-8 text-center shadow-2xl animate-in fade-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* close */}
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute top-5 right-5 text-gray-500 hover:text-gray-700"
        >
          <X size={20} />
        </button>

        {/* heading */}
        <h2 className="text-3xl font-bold text-teal-900 mb-4">
          {name ? `Welcome, ${name}!` : "Welcome to Zealtho!"}
        </h2>

        {/* text */}
        <p className="text-gray-600 text-sm leading-relaxed mb-6">
          Your profile is all set. 🎉
          <br />
          Discover expert doctors, wellness programs, and personalized
          healing journeys — all in one place.
        </p>

        {/* footer */}
        <p className="text-xs text-gray-400">
          This will close in {secondsLeft}s
        </p>
      </div>
    </div>
  );
}
