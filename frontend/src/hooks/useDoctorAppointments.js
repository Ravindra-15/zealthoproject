/**
 * DOCTOR MODULE — Doctor Appointments Hook
 * Manages selected date + fetches that date's appointments.
 * Exposes optimistic update for meeting-link changes.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { fetchDoctorAppointments } from "../services/doctorAppointmentService";

// 🗓️ Helper — today as YYYY-MM-DD (UTC)
const todayIso = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
};

const useDoctorAppointments = () => {
  const [date, setDate] = useState(todayIso());
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isMountedRef = useRef(false);

  // ============================================
  // 📥 FETCH
  // ============================================
  const load = useCallback(async () => {
    if (!isMountedRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchDoctorAppointments(date);
      if (!isMountedRef.current) return;
      setAppointments(result.appointments || []);
    } catch (err) {
      if (!isMountedRef.current) return;
      const msg = err?.response?.data?.message || "Failed to load appointments";
      setError(msg);
      toast.error(msg);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    isMountedRef.current = true;
    load();
    return () => {
      isMountedRef.current = false;
    };
  }, [load]);

  // ============================================
  // 🔄 OPTIMISTIC UPDATE (after meeting-link change)
  // ============================================
  const updateAppointmentInList = useCallback((updated) => {
    setAppointments((prev) =>
      prev.map((a) => (a._id === updated._id ? { ...a, ...updated } : a))
    );
  }, []);

  return {
    date,
    setDate,
    appointments,
    loading,
    error,
    refetch: load,
    updateAppointmentInList,
  };
};

export default useDoctorAppointments;