/**
 * CUSTOMER — My Enquiries: shared look (this app's colours) + labels
 */

// 🎨 this app's colours (inline styles, so they always apply)
export const THEME = { accent: "#F97316", soft: "#FFF7ED", page: "#F9FAFB", border: "#F3F4F6" };

export const PROGRAM_NAMES = {
  zealtho: "Zealtho",
  yogat20: "YogaT20",
  diabmukt: "Diabmukt",
  mommyfit: "MommyFit",
  slimfitter: "Slimfitter",
};

export const programName = (source) => PROGRAM_NAMES[source] || "Zealtho";

// the 4 statuses a customer sees
export const STATUS = {
  open: { label: "Open", cls: "bg-blue-50 text-blue-700 border-blue-100" },
  waiting: { label: "Waiting for you", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  resolved: { label: "Resolved", cls: "bg-green-50 text-green-700 border-green-100" },
  closed: { label: "Closed", cls: "bg-gray-100 text-gray-600 border-gray-200" },
};

export const ticketText = (n) => `ENQ-${n}`;

export const timeAgo = (date) => {
  if (!date) return "";
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} d ago`;
  return null; // caller shows the date
};
