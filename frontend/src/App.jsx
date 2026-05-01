/**
 * ============================================
 * APP — Main Routing Configuration
 * ============================================
 * Defines all top-level routes for the application:
 *  - Public routes (signup, OTP verification)
 *  - Protected customer routes (profile setup, home)
 *  - Admin routes (dashboard, user management, etc.)
 *
 * Note: Admin routes are currently UNPROTECTED for development.
 *       Will be wrapped in <ProtectedAdminRoute> once admin
 *       authentication backend is implemented.
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

function App() {
  return (
    <Router>
      <Routes>
        {/* 👤 CUSTOMER ROUTES */}
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

        {/* 🔐 ADMIN — Public login route (NOT wrapped in protection) */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* 🔐 ADMIN — Protected routes (require login) */}
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

        {/* 🚫 Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
