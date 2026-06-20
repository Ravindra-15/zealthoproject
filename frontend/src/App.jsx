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

import LandingPage from "./pages/Customer/Landing/LandingPage";
// 👤 CUSTOMER PAGES
import Signup from "./pages/Signup/Signup";
import ScrollToTop from "./components/common/ScrollToTop";
import { GoogleOAuthProvider } from "@react-oauth/google";
import OtpVerification from "./pages/Signup/OtpVerification";
import ProfileStepOne from "./pages/Signup/ProfileStepOne";
import ProfileStepTwo from "./pages/Signup/ProfileStepTwo";

import Login from "./pages/Customer/Login/Login";
import ForgotPassword from "./pages/Customer/ForgotPassword/ForgotPassword";
import ResetOtp from "./pages/Customer/ForgotPassword/ResetOtp";
import ResetPassword from "./pages/Customer/ForgotPassword/ResetPassword";
import ProtectedRoute from "./components/common/ProtectedRoute";
import BookDoctor from "./pages/Customer/BookDoctor/BookDoctor";

import DoctorDetail from "./pages/Customer/BookDoctor/DoctorDetail";
import Checkout from "./pages/Customer/Checkout/Checkout";
import Confirmation from "./pages/Customer/Confirmation/Confirmation";
import MyAppointments from "./pages/Customer/MyAppointments/MyAppointments";
import BodyProfileWizard from "./pages/Customer/BodyProfile/BodyProfileWizard";

import SelectTenure from "./pages/Customer/Programs/SelectTenure";
import ProgramCheckout from "./pages/Customer/Programs/ProgramCheckout";
import ProgramSuccess from "./pages/Customer/Programs/ProgramSuccess";
import ProgramDashboard from "./pages/Customer/Programs/ProgramDashboard";
import ProtectedProgramRoute from "./components/common/ProtectedProgramRoute";

import MyProfile from "./pages/Customer/MyProfile/MyProfile";
import CustomerNotifications from "./pages/Customer/Notifications/Notifications";
import MyPlansAndBillings from "./pages/Customer/MyPlansAndBillings/MyPlansAndBillings";
import Receipt from "./pages/Customer/Receipt/Receipt";

import PrivacyPolicy from "./pages/Customer/PrivacyPolicy/PrivacyPolicy";
import ReferAndEarnPage from "./pages/Customer/ReferAndEarn/ReferAndEarnPage";
import TermsOfUse from "./pages/Customer/TermsOfUse/TermsOfUse";
import About from "./pages/Customer/About/About";

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

import Enquiries from "./pages/Admin/Enquiries/Enquiries";
import FinancialReports from "./pages/Admin/FinancialReports/FinancialReports";
import AdminReceipt from "./pages/Admin/FinancialReports/AdminReceipt";
import SubscriptionConfigurator from "./pages/Admin/SubscriptionConfigurator/SubscriptionConfigurator";
import AddEditPlan from "./pages/Admin/SubscriptionConfigurator/AddEditPlan";
import ClinicalVideoCMS from "./pages/Admin/ClinicalVideoCMS/ClinicalVideoCMS";
import HabitConfigurator from "./pages/Admin/HabitConfigurator/HabitConfigurator";
import ReferralEngine from "./pages/Admin/Referrals/ReferralEngine";
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
import WhatsAppFloat from "./components/common/WhatsAppFloat";

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
    <Router>
      <ScrollToTop />
      <div>
      {/* <div className="pt-16"> */}
      <Routes>
        {/* ============================================ */}
        {/* 👤 CUSTOMER ROUTES */}
        {/* ============================================ */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-otp" element={<OtpVerification />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-otp" element={<ResetOtp />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-use" element={<TermsOfUse />} />
        <Route path="/about" element={<About />} />
        <Route
          path="/refer-and-earn"
          element={
            <ProtectedRoute>
              <ReferAndEarnPage />
            </ProtectedRoute>
          }
        />
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
        <Route path="/home" element={<LandingPage />} />
        <Route path="/book-doctor" element={<BookDoctor />} />
        <Route path="/book-doctor/:id" element={<DoctorDetail />} />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/booking/confirmation/:id"
          element={
            <ProtectedRoute>
              <Confirmation />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-appointments"
          element={
            <ProtectedRoute>
              <MyAppointments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-profile"
          element={
            <ProtectedRoute>
              <MyProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <CustomerNotifications />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-plans-and-billings"
          element={
            <ProtectedRoute>
              <MyPlansAndBillings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/billing/receipt/:id"
          element={
            <ProtectedRoute>
              <Receipt />
            </ProtectedRoute>
          }
        />

        <Route
          path="/body-profile"
          element={
            <ProtectedRoute>
              <BodyProfileWizard />
            </ProtectedRoute>
          }
        />
        <Route path="/programs/:id/tenure" element={<SelectTenure />} />
        <Route path="/programs/:id/checkout" element={<ProgramCheckout />} />
        <Route path="/programs/:id/success" element={<ProgramSuccess />} />
        <Route
          path="/programs/:id/dashboard"
          element={
            <ProtectedProgramRoute>
              <ProgramDashboard />
            </ProtectedProgramRoute>
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
          <Route path="financial-reports" element={<FinancialReports />} />
          <Route path="enquiries" element={<Enquiries />} />
          <Route path="billing/receipt/:id" element={<AdminReceipt />} />
          <Route path="videos" element={<ClinicalVideoCMS />} />
          <Route path="habits" element={<HabitConfigurator />} />
          <Route path="/admin/referrals" element={<ReferralEngine />} />
          {/* 🆕 Subscription Configurator */}

          <Route path="subscriptions" element={<SubscriptionConfigurator />} />
          <Route path="subscriptions/new" element={<AddEditPlan />} />
          <Route path="subscriptions/:id/edit" element={<AddEditPlan />} />

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
      {/* 💬 floats over every page */}
      <WhatsAppFloat />
      </div>
    </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
