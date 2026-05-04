/**
 * ADMIN MODULE — Appointments List Hook
 * Mirrors useUsers/useDoctors. Manages paginated appointment list
 * with debounced search, status filter, loading/error state, and
 * optimistic local updates (for future status-change actions).
 */

import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { listAppointments } from "../services/appointmentService";

const SEARCH_DEBOUNCE_MS = 400;

const useAppointments = ({ initialLimit = 10 } = {}) => {
  // ============================================
  // 📊 STATE
  // ============================================
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

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const isMountedRef = useRef(false);

  // ============================================
  // ⏳ DEBOUNCE SEARCH
  // ============================================
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  // ============================================
  // 🔄 RESET PAGE WHEN STATUS CHANGES
  // ============================================
  useEffect(() => {
    setPage(1);
  }, [status]);

  // ============================================
  // 📥 FETCH
  // ============================================
  const loadAppointments = useCallback(async () => {
    if (!isMountedRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const data = await listAppointments({
        page,
        limit: initialLimit,
        search: debouncedSearch,
        status,
      });

      if (!isMountedRef.current) return;

      setAppointments(data.appointments || []);
      setPagination(data.pagination || pagination);
    } catch (err) {
      if (!isMountedRef.current) return;
      const message = err?.response?.data?.message || "Failed to load appointments";
      setError(message);
      toast.error(message);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, status, initialLimit]);

  // ============================================
  // 🔁 LOAD ON FILTER CHANGE
  // ============================================
  useEffect(() => {
    isMountedRef.current = true;
    loadAppointments();
    return () => {
      isMountedRef.current = false;
    };
  }, [loadAppointments]);

  // ============================================
  // 🔄 PAGE NAVIGATION
  // ============================================
  const goToPage = useCallback(
    (newPage) => {
      const safePage = Math.max(1, Math.min(newPage, pagination.totalPages || 1));
      setPage(safePage);
    },
    [pagination.totalPages]
  );

  const nextPage = useCallback(() => {
    if (pagination.hasMore) setPage((p) => p + 1);
  }, [pagination.hasMore]);

  const prevPage = useCallback(() => {
    if (page > 1) setPage((p) => p - 1);
  }, [page]);

  // ============================================
  // 🔧 OPTIMISTIC UPDATES (for future cancel/confirm actions)
  // ============================================
  const updateAppointmentInList = useCallback((updated) => {
    setAppointments((prev) =>
      prev.map((a) => (a._id === updated._id ? updated : a))
    );
  }, []);

  return {
    // Data
    appointments,
    pagination,
    loading,
    error,

    // Filter state + setters
    search,
    setSearch,
    status,
    setStatus,
    page,

    // Pagination
    goToPage,
    nextPage,
    prevPage,

    // Refetch
    refetch: loadAppointments,

    // Optimistic
    updateAppointmentInList,
  };
};

export default useAppointments;