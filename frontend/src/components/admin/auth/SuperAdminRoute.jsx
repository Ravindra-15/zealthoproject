/**
 * ============================================================
 * ADMIN MODULE — Super Admin Route Guards
 * ============================================================
 * SuperAdminRoute
 *   Wraps pages only the super admin may open (Dashboard, Financial
 *   Reports, Habit / Subscription configuration, Portal Users).
 *   A portal admin who lands on one — e.g. by typing the URL — is
 *   sent to the first page they ARE allowed to use.
 *   (The API enforces the same rule; this just keeps the UI clean.)
 *
 * AdminHomeRedirect
 *   /admin → Dashboard for the super admin, Doctor Directory for
 *   portal admins (they don't have a Dashboard).
 *
 * Must be rendered inside <ProtectedAdminRoute> (auth already loaded).
 * ============================================================
 */

import { Navigate } from "react-router-dom";
import { useAdminAuth } from "../../../context/AdminAuthContext";

// 🏠 First page a portal admin lands on
export const PORTAL_ADMIN_HOME = "/admin/doctors";

const SuperAdminRoute = ({ children }) => {
  const { isSuperAdmin } = useAdminAuth();

  if (!isSuperAdmin) {
    return <Navigate to={PORTAL_ADMIN_HOME} replace />;
  }

  return children;
};

export const AdminHomeRedirect = () => {
  const { isSuperAdmin } = useAdminAuth();

  return (
    <Navigate
      to={isSuperAdmin ? "/admin/dashboard" : PORTAL_ADMIN_HOME}
      replace
    />
  );
};

export default SuperAdminRoute;
