
/**
 * ADMIN MODULE — Users List Hook
 *
 * Mirror of useDoctors. Manages paginated user list with
 * debounced search, status filter, loading/error state,
 * page navigation, and optimistic local updates.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { listUsers } from "../services/userService";

const SEARCH_DEBOUNCE_MS = 400;

const useUsers = ({ initialLimit = 10 } = {}) => {
  // ============================================
  // 📊 STATE
  // ============================================
  const [users, setUsers] = useState([]);
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
  // 📥 FETCH USERS
  // ============================================
  const loadUsers = useCallback(async () => {
    if (!isMountedRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const data = await listUsers({
        page,
        limit: initialLimit,
        search: debouncedSearch,
        status,
      });

      if (!isMountedRef.current) return;

      setUsers(data.users || []);
      setPagination(data.pagination || pagination);
    } catch (err) {
      if (!isMountedRef.current) return;
      const message = err?.response?.data?.message || "Failed to load users";
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
    loadUsers();
    return () => {
      isMountedRef.current = false;
    };
  }, [loadUsers]);

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
  // 🔧 LOCAL UPDATES
  // ============================================
  const updateUserInList = useCallback((updatedUser) => {
    setUsers((prev) =>
      prev.map((u) => (u._id === updatedUser._id ? updatedUser : u))
    );
  }, []);

  const removeUserFromList = useCallback((userId) => {
    setUsers((prev) => prev.filter((u) => u._id !== userId));
    setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
  }, []);

  return {
    // Data
    users,
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
    refetch: loadUsers,

    // Optimistic updates
    updateUserInList,
    removeUserFromList,
  };
};

export default useUsers;