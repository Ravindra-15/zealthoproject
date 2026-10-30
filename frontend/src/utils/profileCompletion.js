// Profile completeness — which details an action needs before it can go ahead.
// Phone + location are required (bookings/plans/trials); DOB and the rest stay
// optional here and can be added any time from Edit Profile.

// 👤 Human-readable list of what's missing ([] = good to go)
export const getMissingProfileFields = (user) => {
  const missing = [];
  if (!(user?.whatsapp || user?.phone)) missing.push("mobile number");
  if (!user?.country || !user?.city) missing.push("location");
  return missing;
};

// 🔒 Only same-app paths ("/checkout") — never "//host" or full URLs
export const safeNextPath = (next) =>
  typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
    ? next
    : null;

// ✏️ My Profile with the edit form open; `next` = where to return after saving
export const buildCompleteProfilePath = (next) => {
  const safe = safeNextPath(next);
  return `/my-profile?complete=1${safe ? `&next=${encodeURIComponent(safe)}` : ""}`;
};
