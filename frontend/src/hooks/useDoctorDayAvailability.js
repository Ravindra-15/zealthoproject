/**
 * CUSTOMER MODULE — Doctor Day Availability Hook
 * Fetches one day's slots when user picks a date in the calendar.
 * Refetches automatically on date change.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { fetchDayAvailability } from "../services/customerAppointmentService";

const useDoctorDayAvailability = (doctorId, date) => {
  const [data, setData] = useState(null); // { date, dayOfWeek, slots: [{ time, isBookable }] }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(false);

  const load = useCallback(async () => {
    if (!doctorId || !date) {
      setData(null);
      return;
    }
    if (!isMountedRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchDayAvailability(doctorId, date);
      if (!isMountedRef.current) return;
      setData(result);
    } catch (err) {
      if (!isMountedRef.current) return;
      const msg = err?.response?.data?.message || "Failed to load availability";
      setError(msg);
      toast.error(msg);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [doctorId, date]);

  useEffect(() => {
    isMountedRef.current = true;
    load();
    return () => {
      isMountedRef.current = false;
    };
  }, [load]);

  return { data, loading, error, refetch: load };
};

export default useDoctorDayAvailability;