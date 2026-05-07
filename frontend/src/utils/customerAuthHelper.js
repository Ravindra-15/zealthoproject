/**
 * CUSTOMER MODULE — Auth Helpers
 * Tiny utilities used across booking flow (Checkout, Confirmation).
 * Wraps token check + login redirect with intended destination.
 */

// ============================================
// 🔍 IS USER LOGGED IN
// ============================================
export const isCustomerLoggedIn = () => {
  return !!(
    localStorage.getItem("token") ||
    sessionStorage.getItem("token")
  );
};

// ============================================
// 🚪 REDIRECT TO LOGIN WITH RETURN PATH
// ============================================
/**
 * Builds a /login URL with ?next=<currentPath> so user returns after auth.
 * @param {string} currentPath - usually location.pathname + location.search
 * @returns {string}
 */
export const buildLoginRedirect = (currentPath) => {
  const safePath = currentPath || "/";
  return `/login?next=${encodeURIComponent(safePath)}`;
};

// ============================================
// 🎯 GET POST-LOGIN DESTINATION
// ============================================
/**
 * Read ?next=... from URL search params. Returns "/" if absent or invalid.
 * Use on Login page after successful auth.
 */
export const getPostLoginRedirect = (searchString) => {
  try {
    const params = new URLSearchParams(searchString);
    const next = params.get("next");

    if (!next) return "/";

    // 🛡️ Prevent external redirects
    if (!next.startsWith("/") || next.startsWith("//")) {
      return "/";
    }

    return decodeURIComponent(next);
  } catch {
    return "/";
  }
};