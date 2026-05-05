/**
 * DOCTOR MODULE — Weekly Availability Hook (interactive)
 *
 * Loads weekly view, tracks pending click-to-toggle changes locally,
 * and exposes saveTemplate() that merges pending changes with saved template.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import {
  fetchWeeklyView,
  fetchTemplate,
  updateTemplate,
  getMondayOfWeek,
  toIsoDate,
  addDays,
} from "../services/doctorAvailabilityService";

const useAvailabilityWeek = () => {
  // ============================================
  // 📊 STATE
  // ============================================
  const [weekStart, setWeekStart] = useState(() =>
    getMondayOfWeek(new Date())
  );
  const [weekData, setWeekData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 🔧 Pending click-to-toggle changes
  // Keys: "YYYY-MM-DD|HH:MM"
  const [pendingAdd, setPendingAdd] = useState(new Set());
  const [pendingRemove, setPendingRemove] = useState(new Set());
  const [saving, setSaving] = useState(false);

  const isMountedRef = useRef(false);

  // ============================================
  // 📥 FETCH WEEK
  // ============================================
  const loadWeek = useCallback(async () => {
    if (!isMountedRef.current) return;
    setLoading(true);
    setError(null);

    try {
      const data = await fetchWeeklyView(toIsoDate(weekStart));
      if (!isMountedRef.current) return;
      setWeekData(data);
    } catch (err) {
      if (!isMountedRef.current) return;
      const msg = err?.response?.data?.message || "Failed to load week";
      setError(msg);
      toast.error(msg);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    isMountedRef.current = true;
    loadWeek();
    return () => {
      isMountedRef.current = false;
    };
  }, [loadWeek]);

  // ============================================
  // ⏪ ⏩ NAVIGATION
  // ============================================
  const goPrevWeek = useCallback(() => {
    setWeekStart((prev) => addDays(prev, -7));
    setPendingAdd(new Set());
    setPendingRemove(new Set());
  }, []);

  const goNextWeek = useCallback(() => {
    setWeekStart((prev) => addDays(prev, 7));
    setPendingAdd(new Set());
    setPendingRemove(new Set());
  }, []);

  const goToday = useCallback(() => {
    setWeekStart(getMondayOfWeek(new Date()));
    setPendingAdd(new Set());
    setPendingRemove(new Set());
  }, []);

  const todayWeekStart = getMondayOfWeek(new Date());
  const isCurrentWeek = toIsoDate(weekStart) === toIsoDate(todayWeekStart);

  // ============================================
  // 🔧 TOGGLE SLOT (click-to-toggle)
  // ============================================
  const toggleSlot = useCallback((slot, date) => {
    const key = `${date}|${slot.time}`;

    // Block toggling on booked/blocked cells
    if (slot.status === "booked" || slot.status === "blocked") return;

    setPendingAdd((prev) => {
      const next = new Set(prev);
      const isAlreadyAvailable = slot.status === "available";

      if (isAlreadyAvailable) {
        // It's already saved as available → mark for removal
        next.delete(key);
        return next;
      }

      // It's "off" → toggle pending add
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });

    setPendingRemove((prev) => {
      const next = new Set(prev);
      const isAlreadyAvailable = slot.status === "available";

      if (isAlreadyAvailable) {
        // Toggle pending remove
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
      }
      return next;
    });
  }, []);

  const isDirty = pendingAdd.size > 0 || pendingRemove.size > 0;

  const discardChanges = useCallback(() => {
    setPendingAdd(new Set());
    setPendingRemove(new Set());
  }, []);

  // ============================================
  // 💾 SAVE TEMPLATE
  // ============================================
  const saveTemplate = useCallback(async () => {
    if (!isDirty || saving) return;

    try {
      setSaving(true);

      // 1. Fetch current full template
      const currentTemplate = await fetchTemplate();
      const dayMap = new Map();
      for (const day of currentTemplate.weekly) {
        dayMap.set(day.dayOfWeek, new Set(day.slots));
      }

      // 2. Apply pending changes (translate "YYYY-MM-DD|HH:MM" → dayOfWeek + time)
      const applyKey = (key, action) => {
        const [date, time] = key.split("|");
        const dow = new Date(`${date}T00:00:00.000Z`).getUTCDay();
        const set = dayMap.get(dow) || new Set();
        if (action === "add") set.add(time);
        if (action === "remove") set.delete(time);
        dayMap.set(dow, set);
      };

      pendingAdd.forEach((k) => applyKey(k, "add"));
      pendingRemove.forEach((k) => applyKey(k, "remove"));

      // 3. Build full weekly array
      const weekly = Array.from({ length: 7 }, (_, i) => ({
        dayOfWeek: i,
        slots: Array.from(dayMap.get(i) || []).sort(),
      }));

      // 4. Send to backend
      await updateTemplate(weekly);

      if (!isMountedRef.current) return;

      toast.success("Availability saved");
      setPendingAdd(new Set());
      setPendingRemove(new Set());

      // 5. Refetch week to reflect new state
      await loadWeek();
    } catch (err) {
      if (!isMountedRef.current) return;
      const msg = err?.response?.data?.message || "Failed to save availability";
      toast.error(msg);
    } finally {
      if (isMountedRef.current) setSaving(false);
    }
  }, [isDirty, saving, pendingAdd, pendingRemove, loadWeek]);

  return {
    // Data
    weekStart,
    weekData,
    loading,
    error,

    // Navigation
    goPrevWeek,
    goNextWeek,
    goToday,
    isCurrentWeek,

    // Toggling
    pendingAdd,
    pendingRemove,
    isDirty,
    saving,
    toggleSlot,
    discardChanges,
    saveTemplate,

    // Manual refetch (after time-off / cancel)
    refetch: loadWeek,
  };
};

export default useAvailabilityWeek;