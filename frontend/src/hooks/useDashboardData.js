/**
 * ADMIN MODULE — Dashboard Data Hook
 * Centralized hook for fetching all dashboard data in parallel.
 *
 * Features:
 *  - Parallel API calls on mount
 *  - Auto-refresh when tab regains focus
 *  - Independent filter for expiring subscriptions table
 *  - Per-section loading and error states
 *  - Cleanup on unmount (prevents memory leaks)
 *  - Manual refetch capability
 */

import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";

import {
  fetchDashboardStats,
  fetchUsersTrend,
  fetchExpiringSubscriptions,
} from "../services/dashboardService";

const useDashboardData = (initialFilter = "expiring-soon") => {
  // ============================================
  // 📊 Per-section state
  // ============================================
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);

  const [trend, setTrend] = useState(null);
  const [trendLoading, setTrendLoading] = useState(true);
  const [trendError, setTrendError] = useState(null);

  const [expiringUsers, setExpiringUsers] = useState(null);
  const [expiringLoading, setExpiringLoading] = useState(true);
  const [expiringError, setExpiringError] = useState(null);

  const [filter, setFilter] = useState(initialFilter);

  // 🛡️ Track mount status to avoid state updates after unmount
  const isMountedRef = useRef(false);

  // ============================================
  // 📥 FETCHERS — Each section is independent
  // ============================================

  const loadStats = useCallback(async () => {
    if (!isMountedRef.current) return;
    setStatsLoading(true);
    setStatsError(null);

    try {
      const data = await fetchDashboardStats();
      if (!isMountedRef.current) return;
      setStats(data);
    } catch (err) {
      if (!isMountedRef.current) return;
      const message =
        err?.response?.data?.message || "Failed to load statistics";
      setStatsError(message);
      toast.error(message);
    } finally {
      if (isMountedRef.current) setStatsLoading(false);
    }
  }, []);

  const loadTrend = useCallback(async () => {
    if (!isMountedRef.current) return;
    setTrendLoading(true);
    setTrendError(null);

    try {
      const data = await fetchUsersTrend(30);
      if (!isMountedRef.current) return;
      setTrend(data);
    } catch (err) {
      if (!isMountedRef.current) return;
      const message =
        err?.response?.data?.message || "Failed to load users trend";
      setTrendError(message);
      toast.error(message);
    } finally {
      if (isMountedRef.current) setTrendLoading(false);
    }
  }, []);

  const loadExpiring = useCallback(async (currentFilter) => {
    if (!isMountedRef.current) return;
    setExpiringLoading(true);
    setExpiringError(null);

    try {
      const data = await fetchExpiringSubscriptions(currentFilter, 10);
      if (!isMountedRef.current) return;
      setExpiringUsers(data);
    } catch (err) {
      if (!isMountedRef.current) return;
      const message =
        err?.response?.data?.message ||
        "Failed to load expiring subscriptions";
      setExpiringError(message);
      toast.error(message);
    } finally {
      if (isMountedRef.current) setExpiringLoading(false);
    }
  }, []);

  // ============================================
  // 🔄 INITIAL LOAD — All 3 in parallel on mount
  // ============================================
  useEffect(() => {
    isMountedRef.current = true;

    // 🚀 Parallel fetch — much faster than sequential
    Promise.all([loadStats(), loadTrend(), loadExpiring(filter)]);

    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount

  // ============================================
  // 🔁 FILTER CHANGE — Refetch only the table
  // ============================================
  useEffect(() => {
    // Skip first run (handled by initial load above)
    if (expiringUsers === null && expiringLoading) return;

    loadExpiring(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // ============================================
  // 👁️ TAB FOCUS — Auto-refresh when user returns
  // ============================================
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isMountedRef.current) {
        // Refresh stats and trend (but not the filtered table — user might be mid-interaction)
        loadStats();
        loadTrend();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [loadStats, loadTrend]);

  // ============================================
  // 🔄 MANUAL REFETCH — For retry buttons
  // ============================================
  const refetchStats = useCallback(() => loadStats(), [loadStats]);
  const refetchTrend = useCallback(() => loadTrend(), [loadTrend]);
  const refetchExpiring = useCallback(
    () => loadExpiring(filter),
    [loadExpiring, filter]
  );
  const refetchAll = useCallback(() => {
    Promise.all([loadStats(), loadTrend(), loadExpiring(filter)]);
  }, [loadStats, loadTrend, loadExpiring, filter]);

  // ============================================
  // 📦 RETURN API
  // ============================================
  return {
    // Data
    stats,
    trend,
    expiringUsers,

    // Loading states
    statsLoading,
    trendLoading,
    expiringLoading,

    // Error states
    statsError,
    trendError,
    expiringError,

    // Filter control (for table)
    filter,
    setFilter,

    // Refetch handlers
    refetchStats,
    refetchTrend,
    refetchExpiring,
    refetchAll,
  };
};

export default useDashboardData;