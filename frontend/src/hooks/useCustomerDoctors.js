/**
 * CUSTOMER MODULE — Public Doctors List Hook
 *
 * Mirrors useDoctors/useUsers pattern for the Book Doctor page.
 * Manages debounced search, specialty filter, pagination, loading/error state.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { listPublicDoctors } from "../services/customerDoctorService";

const SEARCH_DEBOUNCE_MS = 400;

const useCustomerDoctors = ({ initialLimit = 10 } = {}) => {
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
  const [specialty, setSpecialty] = useState("");
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
  // 🔄 RESET PAGE WHEN SPECIALTY CHANGES
  // ============================================
  useEffect(() => {
    setPage(1);
  }, [specialty]);

  // ============================================
  // 📥 FETCH
  // ============================================
  const loadDoctors = useCallback(async () => {
    if (!isMountedRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const data = await listPublicDoctors({
        page,
        limit: initialLimit,
        search: debouncedSearch,
        specialty,
      });

      if (!isMountedRef.current) return;

      setDoctors(data.doctors || []);
      setPagination(data.pagination || pagination);
    } catch (err) {
      if (!isMountedRef.current) return;
      const message = err?.response?.data?.message || "Failed to load doctors";
      setError(message);
      toast.error(message);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, specialty, initialLimit]);

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
  const nextPage = useCallback(() => {
    if (pagination.hasMore) setPage((p) => p + 1);
  }, [pagination.hasMore]);

  const prevPage = useCallback(() => {
    if (page > 1) setPage((p) => p - 1);
  }, [page]);

  // ============================================
  // 🔧 HELPERS
  // ============================================
  const clearFilters = useCallback(() => {
    setSearch("");
    setSpecialty("");
    setPage(1);
  }, []);

  return {
    // Data
    doctors,
    pagination,
    loading,
    error,

    // Filter state + setters
    search,
    setSearch,
    specialty,
    setSpecialty,
    page,

    // Pagination
    nextPage,
    prevPage,

    // Helpers
    clearFilters,
    refetch: loadDoctors,
  };
};

export default useCustomerDoctors;