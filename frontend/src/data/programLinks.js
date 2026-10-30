// Zealtho - Program app links
// Landing pages of the 4 program apps (set per environment in .env).
// Shared by the Home hero shortcuts and the Tailored Programs section.

export const PROGRAM_URLS = {
  yogat20: import.meta.env.VITE_YOGAT20_URL || "http://localhost:5174",
  diabmukt: import.meta.env.VITE_DIABMUKT_URL || "#",
  mommyfit: import.meta.env.VITE_MOMMYFIT_URL || "#",
  slimfitter: import.meta.env.VITE_SLIMFITTER_URL || "#",
};
