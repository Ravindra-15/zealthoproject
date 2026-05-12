/**
 * ADMIN MODULE — Dashboard Data Hook
 * Centralized hook for fetching all dashboard data in parallel.
 *
 * Features:
 *  - Parallel API calls on mount
 *  - Auto-refetches when selected program changes (via SelectedProgramContext)
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
import { useSelectedProgram } from "../context/SelectedProgramContext";

const useDashboardData = (initialFilter = "expiring-soon") => {
  // 🏢 Currently selected program from sidebar dropdown
  const { selectedProgramId } = useSelectedProgram();

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
  // Each fetcher reads the latest programId via closure on every call
  // ============================================

  const loadStats = useCallback(async (programId) => {
    if (!isMountedRef.current) return;
    setStatsLoading(true);
    setStatsError(null);

    try {
      const data = await fetchDashboardStats(programId);
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

  const loadTrend = useCallback(async (programId) => {
    if (!isMountedRef.current) return;
    setTrendLoading(true);
    setTrendError(null);

    try {
      const data = await fetchUsersTrend(30, programId);
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

  const loadExpiring = useCallback(async (currentFilter, programId) => {
    if (!isMountedRef.current) return;
    setExpiringLoading(true);
    setExpiringError(null);

    try {
      const data = await fetchExpiringSubscriptions(currentFilter, 10, programId);
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
  // 🔄 LOAD ALL — On mount AND when program changes
  // ============================================
  useEffect(() => {
    isMountedRef.current = true;

    // 🚀 Parallel fetch — much faster than sequential
    Promise.all([
      loadStats(selectedProgramId),
      loadTrend(selectedProgramId),
      loadExpiring(filter, selectedProgramId),
    ]);

    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProgramId]); // 🏢 Refetch when program switches

  // ============================================
  // 🔁 FILTER CHANGE — Refetch only the table
  // ============================================
  useEffect(() => {
    // Skip first run (handled by initial load above)
    if (expiringUsers === null && expiringLoading) return;

    loadExpiring(filter, selectedProgramId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // ============================================
  // 👁️ TAB FOCUS — Auto-refresh when user returns
  // ============================================
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isMountedRef.current) {
        // Refresh stats and trend (but not the filtered table — user might be mid-interaction)
        loadStats(selectedProgramId);
        loadTrend(selectedProgramId);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [loadStats, loadTrend, selectedProgramId]);

  // ============================================
  // 🔄 MANUAL REFETCH — For retry buttons
  // ============================================
  const refetchStats = useCallback(
    () => loadStats(selectedProgramId),
    [loadStats, selectedProgramId]
  );
  const refetchTrend = useCallback(
    () => loadTrend(selectedProgramId),
    [loadTrend, selectedProgramId]
  );
  const refetchExpiring = useCallback(
    () => loadExpiring(filter, selectedProgramId),
    [loadExpiring, filter, selectedProgramId]
  );
  const refetchAll = useCallback(() => {
    Promise.all([
      loadStats(selectedProgramId),
      loadTrend(selectedProgramId),
      loadExpiring(filter, selectedProgramId),
    ]);
  }, [loadStats, loadTrend, loadExpiring, filter, selectedProgramId]);

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

    // Current program (so consumers can show "Showing data for: Yoga T20" etc.)
    selectedProgramId,
  };
};

export default useDashboardData;