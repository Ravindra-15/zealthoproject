/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      // 🔤 Font
      fontFamily: {
        bricolage: ['"Bricolage Grotesque"', "sans-serif"],
      },

      // 🎨 Brand Colors (use across dashboard)
      colors: {
        primary: {
          DEFAULT: "#6366f1", // indigo-500 vibe
          dark: "#4f46e5",
        },
      },

      // ✨ Shimmer Animation (for skeleton loaders)
      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.5s infinite",
      },

      // 🌫️ Soft Shadows (better UI depth)
      boxShadow: {
        card: "0 10px 25px rgba(0, 0, 0, 0.05)",
        soft: "0 4px 12px rgba(0, 0, 0, 0.08)",
      },

      // 🔵 Blur (glass UI)
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};