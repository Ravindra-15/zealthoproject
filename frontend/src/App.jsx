/**
 * ============================================
 * APP — Main Routing Configuration
 * ============================================
 */

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// 👤 CUSTOMER PAGES
import Signup from "./pages/Signup/Signup";
import OtpVerification from "./pages/Signup/OtpVerification";
import ProfileStepOne from "./pages/Signup/ProfileStepOne";
import ProfileStepTwo from "./pages/Signup/ProfileStepTwo";
import Home from "./pages/Home/Home";
import ProtectedRoute from "./components/common/ProtectedRoute";

// 🔐 ADMIN PAGES & GUARDS
import AdminLayout from "./components/admin/layout/AdminLayout";
import Dashboard from "./pages/Admin/Dashboard/Dashboard";
import AdminLogin from "./pages/Admin/Login/AdminLogin";
import ProtectedAdminRoute from "./components/admin/auth/ProtectedAdminRoute";
import DoctorDirectory from "./pages/Admin/Doctors/DoctorDirectory";
import AddDoctor from "./pages/Admin/Doctors/AddDoctor";
import DoctorProfile from "./pages/Admin/Doctors/DoctorProfile";
import EditDoctor from "./pages/Admin/Doctors/EditDoctor";

// 🩺 DOCTOR PAGES & GUARDS
import { DoctorAuthProvider } from "./context/DoctorAuthContext";
import ProtectedDoctorRoute from "./components/common/ProtectedDoctorRoute";
import DoctorLogin from "./pages/Doctor/Login/DoctorLogin";
import ChangePassword from "./pages/Doctor/ChangePassword/ChangePassword";

// 🩺 Tiny inline placeholder used until Batches 4–6 build real pages
const DoctorPlaceholder = ({ title, subtitle }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
    <div className="text-center max-w-md">
      <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
      <p className="mt-2 text-sm text-gray-500">{subtitle}</p>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <Routes>
        {/* ============================================ */}
        {/* 👤 CUSTOMER ROUTES */}
        {/* ============================================ */}
        <Route path="/" element={<Signup />} />
        <Route path="/verify-otp" element={<OtpVerification />} />
        <Route
          path="/profile-step-1"
          element={
            <ProtectedRoute>
              <ProfileStepOne />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile-step-2"
          element={
            <ProtectedRoute>
              <ProfileStepTwo />
            </ProtectedRoute>
          }
        />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />

        {/* ============================================ */}
        {/* 🔐 ADMIN ROUTES */}
        {/* ============================================ */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <ProtectedAdminRoute>
              <AdminLayout />
            </ProtectedAdminRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="doctors" element={<DoctorDirectory />} />
          <Route path="doctors/new" element={<AddDoctor />} />
          <Route path="doctors/:id/edit" element={<EditDoctor />} />
          <Route path="doctors/:id" element={<DoctorProfile />} />
        </Route>

        {/* ============================================ */}
        {/* 🩺 DOCTOR ROUTES (wrapped in DoctorAuthProvider) */}
        {/* ============================================ */}
        <Route
          path="/doctor/*"
          element={
            <DoctorAuthProvider>
              <Routes>
                {/* Public — login */}
                <Route path="login" element={<DoctorLogin />} />

                {/* Placeholder — real page in Batch 4 */}
                <Route
                  path="change-password"
                  element={
                    <ProtectedDoctorRoute allowDuringPasswordChange>
                      <ChangePassword />
                    </ProtectedDoctorRoute>
                  }
                />

                {/* Placeholder — real page in Batch 5 */}
                <Route
                  path="complete-profile"
                  element={
                    <ProtectedDoctorRoute allowDuringProfileCompletion>
                      <DoctorPlaceholder
                        title="📝 Complete Profile"
                        subtitle="Profile completion page — coming in Batch 5."
                      />
                    </ProtectedDoctorRoute>
                  }
                />

                {/* Placeholder — real dashboard in Batch 6 */}
                <Route
                  path="dashboard"
                  element={
                    <ProtectedDoctorRoute>
                      <DoctorPlaceholder
                        title="🩺 Doctor Dashboard"
                        subtitle="Login flow working! Full dashboard coming in Batch 6."
                      />
                    </ProtectedDoctorRoute>
                  }
                />

                {/* Default doctor route → login */}
                <Route index element={<Navigate to="login" replace />} />
                <Route path="*" element={<Navigate to="login" replace />} />
              </Routes>
            </DoctorAuthProvider>
          }
        />

        {/* ============================================ */}
        {/* 🚫 Catch-all */}
        {/* ============================================ */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
