import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import { getMySubscriptions } from "../../services/programService";
const ProtectedProgramRoute = ({ children }) => {
  // ============================================
  // 🔄 STATE
  // ============================================
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  // ============================================
  // 🔐 TOKEN CHECK
  // ============================================
  const customerToken =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

  const doctorToken =
    localStorage.getItem("doctorToken") ||
    sessionStorage.getItem("doctorToken");

  const isAuthenticated = customerToken || doctorToken;

  // ============================================
  // 🚀 VERIFY SUBSCRIPTION
  // ============================================
  useEffect(() => {
    const verifySubscription = async () => {
      try {
        // 🚫 Not logged in
        if (!isAuthenticated) {
          setHasAccess(false);
          return;
        }

        // 📦 Fetch subscriptions
        const data = await getMySubscriptions();

        const subscriptions = data?.subscriptions || [];

        // ✅ Check active + not expired
        const activeSubscription = subscriptions.find((sub) => {
          const isActive = sub.status === "active";

          const expiryDate = new Date(sub.endDate);
          const now = new Date();

          return isActive && expiryDate > now;
        });

        setHasAccess(!!activeSubscription);
      } catch (err) {
        console.error(
          "ProtectedProgramRoute error:",
          err
        );

        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    verifySubscription();
  }, [isAuthenticated]);

  // ============================================
  // ⏳ LOADER
  // ============================================
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />

          <p className="text-sm text-gray-500 font-medium">
            Verifying your subscription...
          </p>
        </div>
      </div>
    );
  }

  // ============================================
  // 🚫 ACCESS DENIED
  // ============================================
  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  // ============================================
  // ✅ ACCESS GRANTED
  // ============================================
  return children;
};

export default ProtectedProgramRoute;