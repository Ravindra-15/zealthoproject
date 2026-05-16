export const formatUtcDate = (iso) => {
  if (!iso) return "—";

  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
};

export const formatUtcTime12h = (iso) => {
  if (!iso) return "—";

  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
};

export const formatUtcTime24h = (iso) => {
  if (!iso) return "—";

  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
};

export const formatUtcDateTime12h = (iso) => {
  if (!iso) return "—";

  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
};

// export const formatSlot12h = (hhmm) => {

//   if (!hhmm) return "";

//   const [h, m] = hhmm.split(":").map(Number);

//   const period = h >= 12 ? "PM" : "AM";
//   const hour12 = h % 12 || 12;

//   return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
// };

export const formatSlot24h = (hhmm) => {
  if (!hhmm) return "";
  return hhmm;
};