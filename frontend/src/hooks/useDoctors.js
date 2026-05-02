/**
 * ADMIN MODULE — Doctors List Hook
 * Manages paginated list of doctors with search and status filtering.
 *
 * Features:
 *  - Pagination state
 *  - Debounced search (avoids API spam while typing)
 *  - Status filter (all/active/inactive)
 *  - Loading + error states
 *  - Manual refetch capability
 *  - Cleanup on unmount (no memory leaks)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { fetchDoctors } from "../services/doctorService";

const SEARCH_DEBOUNCE_MS = 400;

const useDoctors = ({ initialLimit = 10 } = {}) => {
  // ============================================
  // 📊 STATE
  // ============================================
  const [doctors, setDoctors] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: initialLimit,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 🔍 Filter state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  // 🛡️ Track mount status to avoid state updates after unmount
  const isMountedRef = useRef(false);

  // ============================================
  // ⏳ DEBOUNCE SEARCH
  // ============================================
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 when search changes
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
  // 📥 FETCH DOCTORS
  // ============================================
  const loadDoctors = useCallback(async () => {
    if (!isMountedRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchDoctors({
        page,
        limit: initialLimit,
        search: debouncedSearch,
        status,
      });

      if (!isMountedRef.current) return;

      setDoctors(data.doctors || []);
      setPagination(data.pagination || pagination);
    } catch (err) {
      if (!isMountedRef.current) return;
      const message =
        err?.response?.data?.message || "Failed to load doctors";
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
    loadDoctors();
    return () => {
      isMountedRef.current = false;
    };
  }, [loadDoctors]);

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
  // 🔧 LOCAL UPDATES (avoid full refetch when possible)
  // ============================================

  /**
   * Update a single doctor in the list (e.g., after toggle status).
   * Avoids full refetch for instant UX.
   */
  const updateDoctorInList = useCallback((updatedDoctor) => {
    setDoctors((prev) =>
      prev.map((d) => (d._id === updatedDoctor._id ? updatedDoctor : d))
    );
  }, []);

  /**
   * Remove a doctor from the list (e.g., after delete).
   */
  const removeDoctorFromList = useCallback((doctorId) => {
    setDoctors((prev) => prev.filter((d) => d._id !== doctorId));
    setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
  }, []);

  // ============================================
  // 📦 RETURN API
  // ============================================
  return {
    // Data
    doctors,
    pagination,
    loading,
    error,

    // Filter state + setters
    search,
    setSearch,
    status,
    setStatus,
    page,

    // Pagination actions
    goToPage,
    nextPage,
    prevPage,

    // Manual refetch
    refetch: loadDoctors,

    // Optimistic updates
    updateDoctorInList,
    removeDoctorFromList,
  };
};

export default useDoctors;