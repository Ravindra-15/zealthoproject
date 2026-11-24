/**
 * BODY PROFILE SETTINGS — read (public)
 * One request loads all 5 programs; it's kept for a minute so the wizard,
 * progress card and checkout don't each ask again.
 */

import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const TTL = 60 * 1000;

let cache = null; // { at, promise }
let last = null; // the last list that loaded (shown straight away next time)

export const fetchAllBodyProfileConfigs = (force = false) => {
  if (!force && cache && Date.now() - cache.at < TTL) return cache.promise;
  const promise = axios
    .get(`${BASE_URL}/body-profile-config`, { timeout: 15000 })
    .then((r) => {
      const configs = Array.isArray(r.data?.data?.configs) ? r.data.data.configs : [];
      last = configs;
      return configs;
    });
  cache = { at: Date.now(), promise };
  // a failed load isn't kept — the next screen tries again
  promise.catch(() => {
    if (cache?.promise === promise) cache = null;
  });
  return promise;
};

export const getLoadedBodyProfileConfigs = () => last;

export const fetchBodyProfileConfig = async (programId, force = false) => {
  const all = await fetchAllBodyProfileConfigs(force);
  return all.find((c) => c.programId === programId) || null;
};

export const clearBodyProfileConfigCache = () => {
  cache = null;
};
