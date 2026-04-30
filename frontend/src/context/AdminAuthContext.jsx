/**
 * ============================================================
 * ADMIN MODULE — Authentication Context
 * ============================================================
 * Provides admin auth state to the entire admin section.
 * Separate from customer AuthContext to prevent crossover.
 *
 * Storage strategy:
 *  - "Remember me" → localStorage (persists across browser restarts)
 *  - Default       → sessionStorage (cleared when browser closes)
 *
 * Exposes:
 *  - admin         (current admin user object)
 *  - isLoading     (boolean — true during initial token verification)
 *  - login()       (saves token + admin)
 *  - logout()      (clears session)
 *  - isAuthenticated (computed boolean)
 * ============================================================
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  getCurrentAdmin,
  adminLogout as adminLogoutApi,
} from "../services/adminService";

const AdminAuthContext = createContext(null);

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // ============================================
  // 🔍 ADMIN: On mount, verify existing token (if any)
  // ============================================
  useEffect(() => {
    const verifyExistingSession = async () => {
      const token =
        localStorage.getItem("adminToken") ||
        sessionStorage.getItem("adminToken");

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        // Verify token with backend & refresh admin data
        const { admin: freshAdmin } = await getCurrentAdmin();
        setAdmin(freshAdmin);

        // Update stored admin data with latest from server
        const storage = localStorage.getItem("adminToken")
          ? localStorage
          : sessionStorage;
        storage.setItem("adminUser", JSON.stringify(freshAdmin));
      } catch (err) {
        // Token invalid/expired — interceptor already cleared storage
        setAdmin(null);
      } finally {
        setIsLoading(false);
      }
    };

    verifyExistingSession();
  }, []);

  // ============================================
  // 🔑 ADMIN: Login — store token + admin in chosen storage
  // ============================================
  const login = useCallback((token, adminData, rememberMe = false) => {
    const storage = rememberMe ? localStorage : sessionStorage;

    // Clear opposite storage to prevent stale data
    const otherStorage = rememberMe ? sessionStorage : localStorage;
    otherStorage.removeItem("adminToken");
    otherStorage.removeItem("adminUser");

    storage.setItem("adminToken", token);
    storage.setItem("adminUser", JSON.stringify(adminData));

    setAdmin(adminData);
  }, []);

  // ============================================
  // 🚪 ADMIN: Logout — clear everything, notify backend
  // ============================================
  const logout = useCallback(async () => {
    try {
      await adminLogoutApi(); // Best-effort backend notification
    } catch (err) {
      // Ignore — logout proceeds regardless
    }

    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    sessionStorage.removeItem("adminToken");
    sessionStorage.removeItem("adminUser");

    setAdmin(null);
  }, []);

  // ============================================
  // 📦 PROVIDE CONTEXT VALUE
  // ============================================
  const value = {
    admin,
    isLoading,
    isAuthenticated: !!admin,
    login,
    logout,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

// ============================================
// 🪝 ADMIN: Hook for consuming context
// ============================================
export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);

  if (!context) {
    throw new Error(
      "useAdminAuth must be used within an <AdminAuthProvider>"
    );
  }

  return context;
};