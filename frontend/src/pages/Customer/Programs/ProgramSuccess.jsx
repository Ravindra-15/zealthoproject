import { useLocation, useNavigate, useParams } from "react-router-dom";
import successIllustration from "../../../assets/image-Photoroom.png";

export default function ProgramSuccess() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { id } = useParams();

  const programName = state?.programName || "your program";

  return (
    <div className="min-h-screen bg-gray-500/60 flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border-2 border-teal-400">
        <div className="h-1.5 w-full bg-gradient-to-r from-teal-400 to-teal-600" />

        <div className="px-12 py-14 flex flex-col items-center text-center">
          <div className="w-72 h-72 mb-8">
            <img
              src={successIllustration}
              alt="Success"
              className="w-full h-full object-contain"
            />
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3">
            Your Profile is Complete!
          </h2>

          <p className="text-gray-500 text-sm sm:text-base mb-10">
            Welcome to{" "}
            <span className="text-gray-700 font-medium">{programName}</span>{" "}
            <span className="text-orange-500 font-semibold">
              {state?.userName || ""}
            </span>{" "}
            🎉
          </p>

          <button
            onClick={() => navigate(`/programs/${id}/dashboard`)}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3.5 rounded-full transition-colors shadow-[0_4px_14px_rgba(249,115,22,0.35)]"
          >
            Go To Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}