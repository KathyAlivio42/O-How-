import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // O, How? Coffee & Drinks — creamy white + Apple green.
        brand: {
          DEFAULT: "#4F7A1C", // Apple green, deep enough for ~5:1 contrast with cream text
          dark: "#365112",    // deeper green, for text-on-light and pressed states
          light: "#F0F7E4",   // pale apple-green tint, for section backgrounds
        },
        cream: "#FFFDF6",     // creamy white
        clay: "#B9773F",      // warm tan/terracotta accent from the branding scripts —
                               // used sparingly for the one deliberate accent (bestseller flame)
        ink: {
          DEFAULT: "#242A1E", // near-black with a warm/green cast, not pure black
          muted: "#6B7263",
        },
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
      boxShadow: {
        card: "0 2px 12px rgba(54, 81, 18, 0.08)",
        "card-hover": "0 6px 20px rgba(54, 81, 18, 0.14)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        headline: ["var(--font-headline)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
