/**
 * ============================================================
 * TimezoneSelect — searchable IANA timezone picker
 * ============================================================
 * A plain text input backed by a native <datalist>, so the browser
 * provides type-to-search/autocomplete with zero extra dependencies.
 * The list itself comes from `Intl.supportedValuesOf('timeZone')` — the
 * full canonical ~400-zone list built into every modern browser, so
 * there's nothing to bundle or keep in sync.
 *
 * Common zones get a friendly label (e.g. "(GMT+5:30) Mumbai, New Delhi,
 * Kolkata"); everything else falls back to the raw zone name.
 */

import { useMemo } from "react";

// 🏷️ Friendly labels for the zones people actually pick most often.
// Not exhaustive on purpose — the datalist still offers every IANA zone,
// just with a plainer label for the long tail.
const FRIENDLY_LABELS = {
  "Asia/Kolkata": "(GMT+5:30) Mumbai, New Delhi, Kolkata",
  "Asia/Calcutta": "(GMT+5:30) Mumbai, New Delhi, Kolkata",
  "America/New_York": "(GMT-5/-4) New York, Eastern Time",
  "America/Chicago": "(GMT-6/-5) Chicago, Central Time",
  "America/Denver": "(GMT-7/-6) Denver, Mountain Time",
  "America/Los_Angeles": "(GMT-8/-7) Los Angeles, Pacific Time",
  "Europe/London": "(GMT+0/+1) London",
  "Europe/Paris": "(GMT+1/+2) Paris, Berlin",
  "Asia/Dubai": "(GMT+4) Dubai",
  "Asia/Singapore": "(GMT+8) Singapore",
  "Asia/Tokyo": "(GMT+9) Tokyo",
  "Asia/Shanghai": "(GMT+8) Shanghai, Beijing",
  "Australia/Sydney": "(GMT+10/+11) Sydney",
  "Asia/Karachi": "(GMT+5) Karachi",
  "Asia/Dhaka": "(GMT+6) Dhaka",
  "Asia/Bangkok": "(GMT+7) Bangkok",
  "America/Sao_Paulo": "(GMT-3) SÃ£o Paulo",
  "Africa/Johannesburg": "(GMT+2) Johannesburg",
  "Africa/Lagos": "(GMT+1) Lagos",
  "Asia/Riyadh": "(GMT+3) Riyadh",
  "Pacific/Auckland": "(GMT+12/+13) Auckland",
};

const getAllZones = () => {
  try {
    return typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : Object.keys(FRIENDLY_LABELS);
  } catch {
    return Object.keys(FRIENDLY_LABELS);
  }
};

// (validity checking lives in utils/time.js — imported by callers directly,
// so this component file only ever exports the component itself, keeping
// Fast Refresh happy)

const timezoneLabel = (tz) => {
  if (!tz) return "";
  const friendly = FRIENDLY_LABELS[tz];
  return friendly ? `${tz.replace(/_/g, " ")} — ${friendly}` : tz.replace(/_/g, " ");
};

/**
 * @param {string} value - current IANA zone name
 * @param {(tz: string) => void} onChange
 * @param {string} [id]
 * @param {boolean} [disabled]
 */
const TimezoneSelect = ({ value, onChange, id = "timezone-select", disabled = false, className = "" }) => {
  const zones = useMemo(() => getAllZones(), []);
  const listId = `${id}-options`;

  return (
    <>
      <input
        id={id}
        type="text"
        list={listId}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="e.g. Asia/Kolkata"
        className={
          className ||
          "w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors"
        }
      />
      <datalist id={listId}>
        {zones.map((tz) => (
          <option key={tz} value={tz}>
            {timezoneLabel(tz)}
          </option>
        ))}
      </datalist>
    </>
  );
};

export default TimezoneSelect;
