// src/App.jsx

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Signup from "./pages/Signup/Signup";
import OtpVerification from "./pages/Signup/OtpVerification";
import ProfileStepOne from "./pages/Signup/ProfileStepOne";
import ProfileStepTwo from "./pages/Signup/ProfileStepTwo";
import Home from "./pages/Home/Home";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Signup />} />
        <Route path="/verify-otp" element={<OtpVerification />} />
        <Route path="/profile-step-1" element={<ProfileStepOne />} />
        <Route path="/profile-step-2" element={<ProfileStepTwo />} />
        <Route path="/home" element={<Home />} />
      </Routes>
    </Router>
  );
}

export default App;