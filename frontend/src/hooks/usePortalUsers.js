/**
 * ADMIN MODULE — Portal Users List Hook
 * Paginated list of portal admins with debounced search + status filter.
 * Same structure as useDoctors / useUsers.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { listPortalUsers } from "../services/adminPortalUserService";

const SEARCH_DEBOUNCE_MS = 400;

const usePortalUsers = ({ initialLimit = 50 } = {}) => {
  // ============================================
  // 📊 STATE
  // ============================================
  const [admins, setAdmins] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: initialLimit,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });
  const [loading, setLoading] = useState(true);

  // 🔍 Filter state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  // 🛡️ Avoid state updates after unmount
  const isMountedRef = useRef(false);

  // ⏳ Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  // 🔄 Back to page 1 when the status filter changes
  useEffect(() => {
    setPage(1);
  }, [status]);

  // 📥 Fetch
  const loadAdmins = useCallback(async () => {
    if (!isMountedRef.current) return;
    setLoading(true);

    try {
      const data = await listPortalUsers({
        page,
        limit: initialLimit,
        search: debouncedSearch,
        status,
      });
      if (!isMountedRef.current) return;

      setAdmins(data.admins || []);
      setPagination(data.pagination || {});
    } catch (err) {
      if (!isMountedRef.current) return;
      toast.error(err?.response?.data?.message || "Failed to load admins");
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [page, debouncedSearch, status, initialLimit]);

  useEffect(() => {
    isMountedRef.current = true;
    loadAdmins();
    return () => {
      isMountedRef.current = false;
    };
  }, [loadAdmins]);

  // 📄 Page navigation
  const nextPage = useCallback(() => {
    if (pagination.hasMore) setPage((p) => p + 1);
  }, [pagination.hasMore]);

  const prevPage = useCallback(() => {
    if (page > 1) setPage((p) => p - 1);
  }, [page]);

  return {
    admins,
    pagination,
    loading,
    search,
    setSearch,
    status,
    setStatus,
    page,
    nextPage,
    prevPage,
    refetch: loadAdmins,
  };
};

export default usePortalUsers;
