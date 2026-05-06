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
import BookDoctor from "./pages/Customer/BookDoctor/BookDoctor";

import DoctorDetail from "./pages/Customer/BookDoctor/DoctorDetail";
import Checkout from "./pages/Customer/Checkout/Checkout";
import Confirmation from "./pages/Customer/Confirmation/Confirmation";
import MyAppointments from "./pages/Customer/MyAppointments/MyAppointments";
import BodyProfileWizard from "./pages/Customer/BodyProfile/BodyProfileWizard";

// 🔐 ADMIN PAGES & GUARDS
import AdminLayout from "./components/admin/layout/AdminLayout";
import Dashboard from "./pages/Admin/Dashboard/Dashboard";
import AdminLogin from "./pages/Admin/Login/AdminLogin";
import ProtectedAdminRoute from "./components/admin/auth/ProtectedAdminRoute";
import DoctorDirectory from "./pages/Admin/Doctors/DoctorDirectory";
import AddDoctor from "./pages/Admin/Doctors/AddDoctor";
import DoctorProfile from "./pages/Admin/Doctors/DoctorProfile";
import EditDoctor from "./pages/Admin/Doctors/EditDoctor";
import UserDirectory from "./pages/Admin/Users/UserDirectory";
import UserProfile from "./pages/Admin/Users/UserProfile";
import EditUser from "./pages/Admin/Users/EditUser";
import AppointmentLog from "./pages/Admin/Appointments/AppointmentLog";

// 🩺 DOCTOR PAGES & GUARDS
import { DoctorAuthProvider } from "./context/DoctorAuthContext";
import ProtectedDoctorRoute from "./components/common/ProtectedDoctorRoute";
import DoctorLayout from "./components/doctor/layout/DoctorLayout";
import DoctorLogin from "./pages/Doctor/Login/DoctorLogin";
import ChangePassword from "./pages/Doctor/ChangePassword/ChangePassword";
import CompleteProfile from "./pages/Doctor/CompleteProfile/CompleteProfile";
import DoctorDashboard from "./pages/Doctor/Dashboard/Dashboard";
import Appointments from "./pages/Doctor/Appointments/Appointments";
import MyPatients from "./pages/Doctor/MyPatients/MyPatients";
import AvailabilityManager from "./pages/Doctor/AvailabilityManager/AvailabilityManager";
import Notifications from "./pages/Doctor/Notifications/Notifications";
import Settings from "./pages/Doctor/Settings/Settings";

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

        <Route path="/book-doctor" element={<BookDoctor />} />
        <Route path="/book-doctor/:id" element={<DoctorDetail />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/booking/confirmation/:id" element={<Confirmation />} />
        <Route path="/my-appointments" element={<MyAppointments />} />
        <Route path="/body-profile" element={<BodyProfileWizard />} />

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
          {/* 👥 USERS */}
          <Route path="users" element={<UserDirectory />} />
          <Route path="users/:id/edit" element={<EditUser />} />
          <Route path="users/:id" element={<UserProfile />} />
          {/* 🗓️ APPOINTMENTS */}
          <Route path="appointments" element={<AppointmentLog />} />
        </Route>

        {/* ============================================ */}
        {/* 🩺 DOCTOR ROUTES (wrapped in DoctorAuthProvider) */}
        {/* ============================================ */}
        <Route
          path="/doctor/*"
          element={
            <DoctorAuthProvider>
              <Routes>
                {/* 🔓 Public — login */}
                <Route path="login" element={<DoctorLogin />} />

                {/* 🚪 Onboarding gates (no sidebar — full-screen flow) */}
                <Route
                  path="change-password"
                  element={
                    <ProtectedDoctorRoute allowDuringPasswordChange>
                      <ChangePassword />
                    </ProtectedDoctorRoute>
                  }
                />
                <Route
                  path="complete-profile"
                  element={
                    <ProtectedDoctorRoute allowDuringProfileCompletion>
                      <CompleteProfile />
                    </ProtectedDoctorRoute>
                  }
                />

                {/* 🏠 Main app (with sidebar layout) */}
                <Route
                  element={
                    <ProtectedDoctorRoute>
                      <DoctorLayout />
                    </ProtectedDoctorRoute>
                  }
                >
                  <Route path="dashboard" element={<DoctorDashboard />} />
                  <Route path="appointments" element={<Appointments />} />
                  <Route path="my-patients" element={<MyPatients />} />
                  <Route
                    path="availability"
                    element={<AvailabilityManager />}
                  />
                  <Route path="notifications" element={<Notifications />} />
                  <Route path="settings" element={<Settings />} />
                </Route>

                {/* 🏁 Defaults */}
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
