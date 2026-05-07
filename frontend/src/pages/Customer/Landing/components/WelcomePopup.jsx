import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Link } from "react-router-dom";

export default function WelcomePopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const token =
      localStorage.getItem("token") ||
      sessionStorage.getItem("token");

    // show popup only for guest users
    if (!token) {
      setOpen(true);
    }
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center px-4">
      <div className="relative bg-white rounded-3xl w-full max-w-md p-8 text-center shadow-2xl animate-in fade-in zoom-in duration-300">

        {/* close */}
        <button
          onClick={() => setOpen(false)}
          className="absolute top-5 right-5 text-gray-500 hover:text-gray-700"
        >
          <X size={20} />
        </button>

        {/* heading */}
        <h2 className="text-3xl font-bold text-teal-900 mb-4">
          Get Started Today
        </h2>

        {/* text */}
        <p className="text-gray-600 text-sm leading-relaxed mb-8">
          Browse verified specialists and book a consultation for just
          <span className="font-semibold text-orange-500"> $20</span>.
          <br />
          Get instant access to Endocrinologists, Gynecologists,
          and more.
        </p>

        {/* buttons */}
        <div className="flex flex-col gap-3">
          <Link
            to="/signup"
            className="bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-full font-semibold transition-colors"
          >
            Register for Free
          </Link>

          <Link
            to="/login"
            className="border border-gray-300 hover:border-teal-700 hover:text-teal-700 text-gray-700 py-3 rounded-full font-semibold transition-colors"
          >
            Login
          </Link>
        </div>

        {/* footer */}
        <p className="text-xs text-gray-400 mt-6">
          🔥 10K Users Already Registered
        </p>
      </div>
    </div>
  );
}

