// "Complete your profile first" — shown before an action that needs the
// customer's phone/location. Sends them to Edit Profile (and back after saving).
import { User, X } from "lucide-react";

export default function CompleteProfileModal({
  missing = [],
  onComplete,
  onClose,
  secondaryLabel = "Not now",
  onSecondary,
}) {
  const what = missing.length ? missing.join(" and ") : "details";

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="complete-profile-title"
        className="relative bg-white rounded-3xl w-full max-w-sm p-7 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        <div className="w-14 h-14 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mx-auto mb-4">
          <User size={26} />
        </div>

        <h2 id="complete-profile-title" className="text-xl font-bold text-gray-900 mb-2">
          Complete your profile first
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          Please add your <span className="font-semibold text-gray-800">{what}</span> so
          our team and doctors can reach you about your bookings and plans.
        </p>

        <button
          type="button"
          onClick={onComplete}
          className="w-full py-3 rounded-full text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors"
        >
          Complete Profile
        </button>
        <button
          type="button"
          onClick={onSecondary || onClose}
          className="w-full mt-2 py-2.5 rounded-full text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          {secondaryLabel}
        </button>
      </div>
    </div>
  );
}
