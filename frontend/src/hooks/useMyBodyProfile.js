/**
 * CUSTOMER MODULE — My Body Profile Hook
 * Loads current profile (or null), exposes save/complete actions.
 * Used by wizard + by My Appointments banner (to know if completion is needed).
 */

import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import {
  fetchMyBodyProfile,
  upsertBodyProfile,
  completeBodyProfile,
} from "../services/customerBodyProfileService";

const useMyBodyProfile = ({ autoLoad = true } = {}) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(autoLoad);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isMountedRef = useRef(false);

  // ============================================
  // 📥 LOAD
  // ============================================
  const load = useCallback(async () => {
    if (!isMountedRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchMyBodyProfile();
      if (!isMountedRef.current) return;
      setProfile(result || null);
    } catch (err) {
      if (!isMountedRef.current) return;
      const msg = err?.response?.data?.message || "Failed to load body profile";
      setError(msg);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    if (autoLoad) load();
    return () => {
      isMountedRef.current = false;
    };
  }, [autoLoad, load]);

  // ============================================
  // 💾 SAVE (between wizard steps — partial)
  // ============================================
  const save = useCallback(async (payload) => {
    if (saving) return null;
    try {
      setSaving(true);
      const updated = await upsertBodyProfile(payload);
      if (!isMountedRef.current) return null;
      setProfile(updated);
      return updated;
    } catch (err) {
      if (!isMountedRef.current) return null;
      const msg = err?.response?.data?.message || "Failed to save profile";
      toast.error(msg);
      return null;
    } finally {
      if (isMountedRef.current) setSaving(false);
    }
  }, [saving]);

  // ============================================
  // ✅ COMPLETE (final submit)
  // ============================================
  const complete = useCallback(async (payload) => {
    if (saving) return null;
    try {
      setSaving(true);
      const updated = await completeBodyProfile(payload);
      if (!isMountedRef.current) return null;
      setProfile(updated);
      toast.success("Body profile completed!");
      return updated;
    } catch (err) {
      if (!isMountedRef.current) return null;
      const msg = err?.response?.data?.message || "Failed to complete profile";
      toast.error(msg);
      return null;
    } finally {
      if (isMountedRef.current) setSaving(false);
    }
  }, [saving]);

  // 🔍 Derived flag — used by banner logic
  const isComplete = !!profile?.completedAt;

  return {
    profile,
    loading,
    saving,
    error,
    isComplete,
    load,
    save,
    complete,
  };
};

export default useMyBodyProfile;