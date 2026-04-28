import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Signup from "./pages/Signup/Signup";
import OtpVerification from "./pages/Signup/OtpVerification";
import ProfileStepOne from "./pages/Signup/ProfileStepOne";
import ProfileStepTwo from "./pages/Signup/ProfileStepTwo";
import Home from "./pages/Home/Home";

import ProtectedRoute from "./components/common/ProtectedRoute";

function App() {
  return (
    <Router>
      <Routes>

        {/* Public Routes */}
        <Route path="/" element={<Signup />} />
        <Route path="/verify-otp" element={<OtpVerification />} />

        {/* Protected Routes */}
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

      </Routes>
    </Router>
  );
}

export default App;