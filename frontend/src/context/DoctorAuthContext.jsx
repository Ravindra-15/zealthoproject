/**
 * DOCTOR MODULE — Auth Context
 * Provides doctor auth state to the doctor section of the app.
 * Mirrors AdminAuthContext pattern.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  getCurrentDoctor,
  doctorLogout as doctorLogoutApi,
} from "../services/doctorAuthService";

const DoctorAuthContext = createContext(null);

export const DoctorAuthProvider = ({ children }) => {
  const [doctor, setDoctor] = useState(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ============================================
  // 🔍 On mount, verify existing token
  // ============================================
  useEffect(() => {
    let isMounted = true;

    const verifyExistingSession = async () => {
      const token =
        localStorage.getItem("doctorToken") ||
        sessionStorage.getItem("doctorToken");

      if (!token) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const data = await getCurrentDoctor();
        if (!isMounted) return;

        setDoctor(data.doctor);
        setMustChangePassword(!!data.mustChangePassword);
        setIsProfileComplete(!!data.isProfileComplete);

        const storage = localStorage.getItem("doctorToken")
          ? localStorage
          : sessionStorage;
        storage.setItem("doctorUser", JSON.stringify(data.doctor));
      } catch (err) {
        if (!isMounted) return;
        setDoctor(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    verifyExistingSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // ============================================
  // 🔑 Login — store token + doctor + flags
  // ============================================
  const login = useCallback((token, doctorData, flags = {}, rememberMe = false) => {
    const storage = rememberMe ? localStorage : sessionStorage;
    const otherStorage = rememberMe ? sessionStorage : localStorage;

    otherStorage.removeItem("doctorToken");
    otherStorage.removeItem("doctorUser");

    storage.setItem("doctorToken", token);
    storage.setItem("doctorUser", JSON.stringify(doctorData));

    setDoctor(doctorData);
    setMustChangePassword(!!flags.mustChangePassword);
    setIsProfileComplete(!!flags.isProfileComplete);
  }, []);

  // ============================================
  // 🚪 Logout — clear session
  // ============================================
  const logout = useCallback(async () => {
    try {
      await doctorLogoutApi();
    } catch (err) {
      // ignore — logout proceeds regardless
    }

    localStorage.removeItem("doctorToken");
    localStorage.removeItem("doctorUser");
    sessionStorage.removeItem("doctorToken");
    sessionStorage.removeItem("doctorUser");

    setDoctor(null);
    setMustChangePassword(false);
    setIsProfileComplete(false);
  }, []);

  // ============================================
  // 🔄 Update flags after password change / profile completion
  // ============================================
  const updateAuthFlags = useCallback((flags = {}) => {
    if (flags.mustChangePassword !== undefined) {
      setMustChangePassword(!!flags.mustChangePassword);
    }
    if (flags.isProfileComplete !== undefined) {
      setIsProfileComplete(!!flags.isProfileComplete);
    }
  }, []);

  // ============================================
  // 🔄 Update doctor object (after profile edit)
  // ============================================
  const updateDoctor = useCallback((doctorData) => {
    setDoctor(doctorData);
    const storage = localStorage.getItem("doctorToken")
      ? localStorage
      : sessionStorage;
    storage.setItem("doctorUser", JSON.stringify(doctorData));
  }, []);

  const value = {
    doctor,
    isLoading,
    isAuthenticated: !!doctor,
    mustChangePassword,
    isProfileComplete,
    login,
    logout,
    updateAuthFlags,
    updateDoctor,
  };

  return (
    <DoctorAuthContext.Provider value={value}>
      {children}
    </DoctorAuthContext.Provider>
  );
};

// ============================================
// 🪝 Hook
// ============================================
export const useDoctorAuth = () => {
  const context = useContext(DoctorAuthContext);

  if (!context) {
    throw new Error(
      "useDoctorAuth must be used within a <DoctorAuthProvider>"
    );
  }

  return context;
};