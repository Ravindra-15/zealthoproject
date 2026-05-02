/**
 * DOCTOR MODULE — Protected Route Guard
 *
 * Redirect chain:
 *   1. Not authenticated         → /doctor/login
 *   2. mustChangePassword: true  → /doctor/change-password (gate)
 *   3. isProfileComplete: false  → /doctor/complete-profile (gate)
 *   4. All clear                 → render the requested route
 *
 * Allow-list flags let intermediate gates render themselves
 * without infinite redirect loops:
 *   - allowDuringPasswordChange: page can render while mustChangePassword is true
 *   - allowDuringProfileCompletion: page can render while isProfileComplete is false
 */

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useDoctorAuth } from "../../context/DoctorAuthContext";

const ProtectedDoctorRoute = ({
  children,
  allowDuringPasswordChange = false,
  allowDuringProfileCompletion = false,
}) => {
  const {
    isAuthenticated,
    isLoading,
    mustChangePassword,
    isProfileComplete,
  } = useDoctorAuth();
  const location = useLocation();

  // ⏳ Wait for initial token verification to finish
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading…</p>
        </div>
      </div>
    );
  }

  // 🚫 Not logged in
  if (!isAuthenticated) {
    return <Navigate to="/doctor/login" replace state={{ from: location }} />;
  }

  // 🔐 Force password change first
  if (mustChangePassword && !allowDuringPasswordChange) {
    return <Navigate to="/doctor/change-password" replace />;
  }

  // 📝 Force profile completion second
  if (
    !mustChangePassword &&
    !isProfileComplete &&
    !allowDuringProfileCompletion
  ) {
    return <Navigate to="/doctor/complete-profile" replace />;
  }

  // 🛡️ Edge case: someone landed on change-password page after already changing it
  if (!mustChangePassword && allowDuringPasswordChange) {
    if (!isProfileComplete) {
      return <Navigate to="/doctor/complete-profile" replace />;
    }
    return <Navigate to="/doctor/dashboard" replace />;
  }

  // 🛡️ Edge case: someone landed on complete-profile page after already completing it
  if (isProfileComplete && allowDuringProfileCompletion) {
    return <Navigate to="/doctor/dashboard" replace />;
  }

  return children;
};

export default ProtectedDoctorRoute;