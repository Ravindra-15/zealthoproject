// Zealtho - My Profile Page
// Customer profile view with edit, billing link, past appointments, password & logout
// Route: /my-profile (protected, fully-onboarded users)

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Mail, MapPin, Calendar, Shield, LogOut } from "lucide-react";
import CustomerNavbar from "../../../components/customer/layout/CustomerNavbar";
import CustomerFooter from "../../../components/customer/layout/CustomerFooter";
import { useAuth } from "../../../context/AuthContext";
import { fetchMyProfile } from "../../../services/customerProfileService";
import { listMyAppointments } from "../../../services/customerAppointmentService";
import EditProfileModal from "./components/EditProfileModal";
import ChangePasswordForm from "./components/ChangePasswordForm";
import PastAppointmentCard from "./components/PastAppointmentCard";

export default function MyProfile() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [user, setUser] = useState(null);
  const [pastAppointments, setPastAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const loadProfile = async () => {
    try {
      const data = await fetchMyProfile();
      setUser(data);
    } catch {
      toast.error("Failed to load profile");
    }
  };

  const loadPastAppointments = async () => {
    try {
      const res = await listMyAppointments({ bucket: "past", limit: 10 });
      setPastAppointments(res?.appointments || []);
    } catch {
      // soft fail
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadProfile(), loadPastAppointments()]);
      setLoading(false);
    })();
  }, []);

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/");
  };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleString("en-US", { month: "short", year: "numeric" })
    : "—";

  const maskedPhone = user?.whatsapp
    ? `+${user.whatsapp.slice(0, 2)} ${"*".repeat(Math.max(0, user.whatsapp.length - 4))}${user.whatsapp.slice(-2)}`
    : "—";

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Loading your profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <CustomerNavbar />

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-orange-500 text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">My Profile</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your identity, view clinical history, and secure your account
          </p>
        </div>

        {/* PROFILE CARD */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-6 sm:p-8 mb-6">
          <div className="flex flex-col items-center mb-6">
            <div className="relative w-24 h-24 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
              {user?.profilePhoto ? (
                <img src={user.profilePhoto} alt="profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-gray-400">
                  {user?.fullName?.[0]?.toUpperCase() || "U"}
                </span>
              )}
              <span className="absolute bottom-0 right-0 w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white">
                +
              </span>
            </div>
            <button className="mt-3 text-sm text-gray-500 hover:text-orange-500 transition-colors">
              Add Profile Photo
            </button>
          </div>

          <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 mb-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-gray-800">{user?.fullName || "—"}</h2>
                <p className="text-orange-500 text-sm font-medium mt-0.5">
                  {user?.nickName || "—"}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin size={14} className="text-gray-400" />
                    {user?.city ? `${user.city}, ${user.country || ""}` : "—"}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar size={14} className="text-gray-400" />
                    Member since {memberSince}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail size={14} className="text-gray-400" />
                    <span className="truncate">{user?.email || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-gray-400">Whatsapp</span>
                    <span>{maskedPhone}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => setEditOpen(true)}
                  className="border border-gray-200 hover:border-orange-400 hover:text-orange-500 text-gray-700 text-sm font-semibold px-6 py-2.5 rounded-full transition-colors"
                >
                  Edit Profile
                </button>
                <button
                  onClick={() => navigate("/my-plans-and-billings")}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-6 py-2.5 rounded-full shadow-[0_4px_14px_rgba(249,115,22,0.35)] transition-colors"
                >
                  My Plans and Billings
                </button>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-start gap-3">
            <Shield size={18} className="text-orange-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-800 text-sm">Privacy Protection</p>
              <p className="text-gray-600 text-xs mt-0.5">
                Your contact number is masked from all instructors and doctors to protect your privacy.
              </p>
            </div>
          </div>
        </div>

        {/* PAST APPOINTMENTS */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-6 sm:p-8 mb-6">
          <h3 className="text-base font-bold text-gray-800 mb-5">Past Appointments</h3>
          {pastAppointments.length === 0 ? (
            <p className="text-sm text-gray-400">No past appointments yet.</p>
          ) : (
            <div className="space-y-3">
              {pastAppointments.map((apt) => (
                <PastAppointmentCard key={apt._id || apt.id} appointment={apt} />
              ))}
            </div>
          )}
        </div>

        {/* SETTINGS */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(16,24,40,0.04)] p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={16} className="text-orange-500" />
            <h3 className="text-base font-bold text-gray-800">Settings</h3>
          </div>
          <p className="text-gray-500 text-xs mb-6">
            Manage your password and connected accounts
          </p>

          <ChangePasswordForm />

          <div className="mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full sm:w-auto border border-red-200 hover:bg-red-50 text-red-600 text-sm font-semibold px-6 py-2.5 rounded-full transition-colors"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </main>

      <CustomerFooter />

      {editOpen && (
        <EditProfileModal
          user={user}
          onClose={() => setEditOpen(false)}
          onUpdated={(updated) => {
            setUser(updated);
            setEditOpen(false);
          }}
        />
      )}
    </div>
  );
}