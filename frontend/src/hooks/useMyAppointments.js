/**
 * CUSTOMER MODULE — My Appointments Hook
 * Fetches user's appointments by bucket (upcoming/past/all).
 * Used on My Appointments page and Confirmation page.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { listMyAppointments } from "../services/customerAppointmentService";

const useMyAppointments = ({ bucket = "all", initialLimit = 20 } = {}) => {
  const [appointments, setAppointments] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: initialLimit,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  const isMountedRef = useRef(false);

  const load = useCallback(async () => {
    if (!isMountedRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const result = await listMyAppointments({ bucket, page, limit: initialLimit });
      if (!isMountedRef.current) return;
      setAppointments(result.appointments || []);
      setPagination(result.pagination || pagination);
    } catch (err) {
      if (!isMountedRef.current) return;
      const msg = err?.response?.data?.message || "Failed to load appointments";
      setError(msg);
      toast.error(msg);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket, page, initialLimit]);

  useEffect(() => {
    isMountedRef.current = true;
    load();
    return () => {
      isMountedRef.current = false;
    };
  }, [load]);

  const nextPage = useCallback(() => {
    if (pagination.hasMore) setPage((p) => p + 1);
  }, [pagination.hasMore]);

  const prevPage = useCallback(() => {
    if (page > 1) setPage((p) => p - 1);
  }, [page]);

  return {
    appointments,
    pagination,
    loading,
    error,
    page,
    nextPage,
    prevPage,
    refetch: load,
  };
};

export default useMyAppointments;