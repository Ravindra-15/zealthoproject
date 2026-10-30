// Profile gate — before actions that need a reachable customer (booking a
// doctor, buying a plan, free trial) make sure the profile has a phone number
// and location; if not, ask them to complete it first.
import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import CompleteProfileModal from "../components/customer/CompleteProfileModal";
import { fetchMyProfile } from "../services/customerProfileService";
import {
  getMissingProfileFields,
  buildCompleteProfilePath,
} from "../utils/profileCompletion";

// ============================================
// 🚧 GATE AN ACTION
// ============================================
// `await requireCompleteProfile("/where-to-return")` → true = go ahead,
// false = modal shown (render `profileGateModal` somewhere on the page).
export function useProfileGate() {
  const navigate = useNavigate();
  const [gate, setGate] = useState(null); // { missing, nextPath }

  const requireCompleteProfile = useCallback(async (nextPath) => {
    let user;
    try {
      user = await fetchMyProfile(); // fresh — stored copy has no phone
    } catch {
      return true; // a failed lookup never blocks; the action's own checks still run
    }
    const missing = getMissingProfileFields(user);
    if (missing.length === 0) return true;
    setGate({ missing, nextPath });
    return false;
  }, []);

  const profileGateModal = gate ? (
    <CompleteProfileModal
      missing={gate.missing}
      onComplete={() => {
        setGate(null);
        navigate(buildCompleteProfilePath(gate.nextPath));
      }}
      onClose={() => setGate(null)}
    />
  ) : null;

  return { requireCompleteProfile, profileGateModal };
}

// ============================================
// 👋 ONE-TIME NUDGE ON "PROFILE" (social sign-ups)
// ============================================
// The first time a Google-signup user with a missing phone/location opens
// their profile, ask them to complete it. Shown once per account per browser.
const NUDGE_KEY = "profileNudgeSeen";

const nudgeKey = () => {
  try {
    const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
    const u = raw ? JSON.parse(raw) : null;
    return `${NUDGE_KEY}:${u?.id || u?._id || "me"}`;
  } catch {
    return `${NUDGE_KEY}:me`;
  }
};
const hasSeen = (key) => {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
};
const markSeen = (key) => {
  try {
    localStorage.setItem(key, "1");
  } catch {
    /* storage blocked — the nudge may simply show again */
  }
};

export function useFirstProfileNudge() {
  const navigate = useNavigate();
  const [missing, setMissing] = useState(null);
  const busyRef = useRef(false);

  const openProfile = useCallback(async () => {
    const key = nudgeKey();
    if (hasSeen(key)) {
      navigate("/my-profile");
      return;
    }
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const user = await fetchMyProfile();
      const gaps = user?.provider === "google" ? getMissingProfileFields(user) : [];
      markSeen(key);
      if (gaps.length) {
        setMissing(gaps);
        return;
      }
    } catch {
      // lookup failed — just open the profile as usual
    } finally {
      busyRef.current = false;
    }
    navigate("/my-profile");
  }, [navigate]);

  const profileNudgeModal = missing ? (
    <CompleteProfileModal
      missing={missing}
      onComplete={() => {
        setMissing(null);
        navigate(buildCompleteProfilePath());
      }}
      secondaryLabel="Not now"
      onSecondary={() => {
        setMissing(null);
        navigate("/my-profile");
      }}
      onClose={() => setMissing(null)}
    />
  ) : null;

  return { openProfile, profileNudgeModal };
}
