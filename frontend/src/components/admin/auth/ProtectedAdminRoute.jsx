/**
 * ============================================================
 * ADMIN MODULE — Protected Route Guard
 * ============================================================
 * Wraps admin pages to require authentication.
 *
 * Behavior:
 *  - Shows loading spinner while verifying token on initial load
 *  - Redirects to /admin/login if no valid session
 *  - Preserves intended destination so user lands correctly after login
 *  - Renders children once authenticated
 * ============================================================
 */

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAdminAuth } from "../../../context/AdminAuthContext";

const ProtectedAdminRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAdminAuth();
  const location = useLocation();

  // ⏳ ADMIN: Show loader while initial auth check is running
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f6fa]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm text-gray-500">Verifying session...</p>
        </div>
      </div>
    );
  }

  // 🚫 ADMIN: Not logged in → redirect to login
  // Pass current location in state so login can redirect back
  if (!isAuthenticated) {
    return (
      <Navigate to="/admin/login" replace state={{ from: location }} />
    );
  }

  // ✅ ADMIN: Authenticated — render children
  return children;
};

export default ProtectedAdminRoute;