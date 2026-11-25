/**
 * LEGAL PAGES & DISCLAIMERS — read (public)
 * This app's Privacy Policy, Terms page and disclaimers, as set by the super
 * admin. Kept for a minute so every page (footer, checkout, sign-up) shares
 * one request.
 */

import axios from "axios";
import { PROGRAM_ID } from "../utils/programConfig";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const TTL = 60 * 1000;

let cache = null; // { at, promise }
let last = null; // the last content that loaded (shown straight away next time)

const looksRight = (c) =>
  c && typeof c === "object" && c.privacy && c.terms && Array.isArray(c.notices) && Array.isArray(c.privacy.sections);

export const fetchLegalContent = (force = false) => {
  if (!force && cache && Date.now() - cache.at < TTL) return cache.promise;
  const promise = axios
    .get(`${BASE_URL}/legal-content/${PROGRAM_ID}`, { timeout: 15000 })
    .then((r) => {
      const content = r.data?.data?.content;
      if (!looksRight(content)) throw new Error("Unexpected legal content");
      last = content;
      return content;
    });
  cache = { at: Date.now(), promise };
  // a failed load isn't kept — the next screen tries again
  promise.catch(() => {
    if (cache?.promise === promise) cache = null;
  });
  return promise;
};

export const getLoadedLegalContent = () => last;
