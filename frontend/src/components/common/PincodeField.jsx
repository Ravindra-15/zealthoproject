/**
 * COMMON — Pincode / postal code field
 * Used next to City on Profile Step 2 and in Edit Profile.
 *
 * - Format is checked as the user types (India: 6 digits, US: ZIP, UK, ...).
 * - India: once 6 digits are in, the backend confirms with India Post that
 *   the pincode exists and is in the selected state, and shows
 *   "District, State" when it is.
 * - Hidden for countries that have no postal codes (e.g. UAE).
 * - Reports { status, message } to the parent through `onStatus` so the
 *   form can block submit while it's checking or invalid
 *   (see pincodeSubmitError in utils/postalCode.js).
 *
 * status: "idle" | "checking" | "valid" | "invalid" | "unverified"
 */

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { checkPincode } from "../../services/authService";
import {
  needsPostalCode,
  normalizePostalCode,
  postalFormatError,
  postalLabel,
  postalMaxLength,
  postalPlaceholder,
  sanitizePostalInput,
} from "../../utils/postalCode";

const PincodeField = ({
  id = "pincode",
  label, // defaults to "Pincode" / "ZIP code" / "Postal code"
  value,
  onChange, // (string) => void
  countryIso,
  stateName,
  onStatus,
  required = true,
  showRequiredMark = false,
  wrapperClassName = "flex flex-col gap-2 w-full",
  labelClassName = "text-sm font-medium text-gray-700",
  inputClassName = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 outline-none",
}) => {
  const iso = String(countryIso || "").toUpperCase();
  const [status, setStatus] = useState({ status: "idle", message: "" });
  const [touched, setTouched] = useState(false);
  const reqId = useRef(0);
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;

  // 🔁 Re-check whenever the pincode, country or state changes
  useEffect(() => {
    const myId = ++reqId.current;
    const v = normalizePostalCode(iso, value);

    if (!iso || !v) {
      setStatus({ status: "idle", message: "" });
      return;
    }
    const fmt = postalFormatError(iso, v);
    if (fmt) {
      setStatus({ status: "invalid", message: fmt });
      return;
    }
    // Only India pincodes can be confirmed against real data
    if (iso !== "IN") {
      setStatus({ status: "valid", message: "" });
      return;
    }

    setStatus({ status: "checking", message: "" });
    const t = setTimeout(async () => {
      try {
        const res = await checkPincode({ countryIso: iso, state: stateName || "", pincode: v });
        if (myId !== reqId.current) return; // a newer value is being checked
        const d = res?.data?.data || {};
        if (d.valid) {
          setStatus({
            status: d.verified ? "valid" : "unverified",
            message: d.verified ? [d.district, d.state].filter(Boolean).join(", ") : "",
          });
        } else {
          setStatus({ status: "invalid", message: d.message || "Enter a valid pincode" });
        }
      } catch {
        if (myId !== reqId.current) return;
        // Server / India Post unreachable — the save re-checks it anyway
        setStatus({ status: "unverified", message: "" });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [iso, value, stateName]);

  useEffect(() => {
    onStatusRef.current?.(status);
  }, [status]);

  if (iso && !needsPostalCode(iso)) return null;

  const text = label || postalLabel(iso);
  const full = normalizePostalCode(iso, value).length >= postalMaxLength(iso);
  // Format errors wait for blur (or a full India pincode); lookup errors show at once
  const showError =
    status.status === "invalid" &&
    (touched || full || !postalFormatError(iso, value));
  const hintId = `${id}-hint`;

  return (
    <div className={wrapperClassName}>
      <label htmlFor={id} className={labelClassName}>
        {text}
        {showRequiredMark && required && <span className="text-red-500"> *</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type="text"
          inputMode={iso === "IN" ? "numeric" : "text"}
          autoComplete="postal-code"
          maxLength={postalMaxLength(iso)}
          disabled={!iso}
          placeholder={!iso ? "Select a country first" : postalPlaceholder(iso)}
          value={value}
          onChange={(e) => onChange(sanitizePostalInput(iso, e.target.value))}
          onBlur={() => setTouched(true)}
          aria-invalid={showError || undefined}
          aria-describedby={hintId}
          className={`${inputClassName} pr-10 disabled:bg-gray-50 disabled:cursor-not-allowed`}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          {status.status === "checking" && <Loader2 size={16} className="animate-spin text-gray-400" />}
          {status.status === "valid" && <CheckCircle2 size={16} className="text-green-600" />}
          {showError && <AlertCircle size={16} className="text-red-500" />}
        </span>
      </div>
      <p id={hintId} aria-live="polite" className="text-xs empty:hidden">
        {status.status === "checking" && (
          <span className="text-gray-500">Checking {text.toLowerCase()}…</span>
        )}
        {status.status === "valid" && status.message && (
          <span className="text-green-700">{status.message}</span>
        )}
        {status.status === "unverified" && (
          <span className="text-gray-500">
            Couldn't verify this pincode right now. You can still continue.
          </span>
        )}
        {showError && <span className="text-red-600">{status.message}</span>}
      </p>
    </div>
  );
};

export default PincodeField;
