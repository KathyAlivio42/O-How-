import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // O, How? Coffee & Drinks — sampled from the round logo and poster set.
        brand: {
          DEFAULT: "#5B6E42", // sage/olive green (logo ring + wordmark)
          dark: "#3B4A2A",    // deep olive, for text-on-light and pressed states
          light: "#EEF1E4",   // pale sage tint, for section backgrounds
        },
        cream: "#F7F1E2",     // warm cream from the poster backgrounds
        clay: "#B9773F",      // warm tan/terracotta accent from the branding scripts —
                               // used sparingly for the one deliberate accent (bestseller flame)
        ink: {
          DEFAULT: "#2A2E22", // near-black with a warm/olive cast, not pure black
          muted: "#6B7263",
        },
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
      boxShadow: {
        card: "0 2px 12px rgba(6, 77, 42, 0.08)",
        "card-hover": "0 6px 20px rgba(6, 77, 42, 0.14)",
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
