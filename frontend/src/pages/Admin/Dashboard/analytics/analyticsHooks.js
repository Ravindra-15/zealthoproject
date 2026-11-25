/**
 * ADMIN MODULE — hooks for the dashboard analytics panels
 *  - useRangeFilters → date preset / custom dates / grouping, kept valid
 *  - useAnalyticsData → loads data for the current filters (latest request wins)
 */

import { useEffect, useMemo, useState } from "react";

import {
  RANGE_PRESETS,
  allowedGroupings,
  autoGrouping,
  browserTimezone,
  isDateStr,
  presetRange,
} from "./analyticsUtils";

const PRESET_IDS = RANGE_PRESETS.map((p) => p.id);

export const useRangeFilters = (initial = {}) => {
  const [preset, setPresetState] = useState(PRESET_IDS.includes(initial.preset) ? initial.preset : "30d");
  const [custom, setCustom] = useState({
    from: isDateStr(initial.from) ? initial.from : "",
    to: isDateStr(initial.to) ? initial.to : "",
  });
  const [chosenGroup, setGroup] = useState(initial.granularity || null);

  const range = useMemo(() => presetRange(preset, custom), [preset, custom]);
  const allowed = useMemo(() => allowedGroupings(range), [range]);

  const valid = range.all || (isDateStr(range.from) && isDateStr(range.to) && range.from <= range.to);

  // grouping: the admin's pick if it still fits, else the preset's default, else automatic
  const presetGroup = RANGE_PRESETS.find((p) => p.id === preset)?.group;
  const group = useMemo(() => {
    if (chosenGroup && allowed.includes(chosenGroup)) return chosenGroup;
    if (presetGroup && allowed.includes(presetGroup)) return presetGroup;
    if (!valid) return "day";
    const auto = autoGrouping(range);
    return allowed.includes(auto) ? auto : allowed[allowed.length - 1];
  }, [chosenGroup, presetGroup, allowed, valid, range]);

  const setPreset = (p) => {
    if (p === "custom" && preset !== "custom") {
      // start the custom dates from what was on screen
      const cur = presetRange(preset, custom);
      setCustom({ from: cur.from || custom.from, to: cur.to });
    }
    setPresetState(p);
    setGroup(null); // pick the default grouping for the new range
  };

  const params = valid
    ? {
        ...(range.all ? { all: "true" } : { from: range.from }),
        to: range.to,
        granularity: group,
        tz: browserTimezone() || undefined,
      }
    : null;

  // what goes in the "View more" link
  const shareable = { preset, granularity: group, ...(preset === "custom" ? { from: custom.from, to: custom.to } : {}) };

  return { preset, setPreset, custom, setCustom, group, setGroup, allowed, valid, params, shareable };
};

/**
 * Loads `fetcher(params)` whenever the params change. Old responses that
 * arrive late are ignored, so quick filter clicks never show stale data.
 */
export const useAnalyticsData = (fetcher, params) => {
  const [state, setState] = useState({ doneKey: null, data: null, error: null });
  const [nonce, setNonce] = useState(0);
  const reqKey = params ? `${JSON.stringify(params)}#${nonce}` : null;

  useEffect(() => {
    if (!reqKey) return undefined;
    const controller = new AbortController();
    const query = JSON.parse(reqKey.slice(0, reqKey.lastIndexOf("#")));
    fetcher(query, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setState({ doneKey: reqKey, data, error: null });
      })
      .catch((err) => {
        if (controller.signal.aborted || err?.code === "ERR_CANCELED") return;
        setState((s) => ({
          ...s,
          doneKey: reqKey,
          error: err?.response?.data?.message || "Could not load this chart. Please try again.",
        }));
      });
    return () => controller.abort();
  }, [fetcher, reqKey]);

  // previous data stays on screen while new filters load ("Updating…")
  const loading = reqKey !== null && state.doneKey !== reqKey;
  const error = state.doneKey === reqKey ? state.error : null;
  return { data: state.data, loading, error, retry: () => setNonce((n) => n + 1) };
};
