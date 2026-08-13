import type { Config } from "tailwindcss";

/**
 * Design tokens.
 * --------------
 * Colours resolve to CSS custom properties declared in `globals.css`, which is
 * what lets a single class name mean the right thing in both light and dark
 * appearance without a `dark:` variant on every element.
 *
 * The type scale carries its own leading and tracking, because those are
 * size-specific: display text needs negative tracking and tight leading, small
 * text needs positive tracking and looser leading. One global letter-spacing is
 * wrong at one end of the scale or the other.
 */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "var(--canvas)",
        surface: "var(--surface)",
        raised: "var(--raised)",
        fill: "var(--fill)",
        "fill-strong": "var(--fill-strong)",
        line: "var(--line)",
        "line-strong": "var(--line-strong)",

        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        "ink-3": "var(--ink-3)",

        accent: "var(--accent)",
        "accent-hover": "var(--accent-hover)",
        "accent-soft": "var(--accent-soft)",
        "accent-ink": "var(--accent-ink)",
        "on-accent": "var(--on-accent)",

        positive: "var(--positive)",
        "positive-soft": "var(--positive-soft)",
        "positive-ink": "var(--positive-ink)",

        warn: "var(--warn)",
        "warn-soft": "var(--warn-soft)",
        "warn-ink": "var(--warn-ink)",

        danger: "var(--danger)",
        "danger-soft": "var(--danger-soft)",
        "danger-ink": "var(--danger-ink)",
      },

      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "ui-sans-serif",
          "system-ui",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "SF Mono", "Menlo", "monospace"],
      },

      // [size, { lineHeight, letterSpacing }] — tracking tightens as size grows,
      // leading loosens as it shrinks. Sizes are in rem so the whole layout
      // scales with the reader's browser text setting.
      fontSize: {
        hero: ["clamp(2.75rem, 1.9rem + 3.6vw, 5rem)", { lineHeight: "1.02", letterSpacing: "-0.033em" }],
        display: ["clamp(2.25rem, 1.7rem + 2.4vw, 3.25rem)", { lineHeight: "1.08", letterSpacing: "-0.028em" }],
        "title-1": ["2rem", { lineHeight: "1.16", letterSpacing: "-0.024em" }],
        "title-2": ["1.5rem", { lineHeight: "1.24", letterSpacing: "-0.019em" }],
        "title-3": ["1.25rem", { lineHeight: "1.34", letterSpacing: "-0.015em" }],
        headline: ["1.0625rem", { lineHeight: "1.45", letterSpacing: "-0.011em" }],
        lead: ["1.1875rem", { lineHeight: "1.6", letterSpacing: "-0.012em" }],
        body: ["1rem", { lineHeight: "1.62", letterSpacing: "-0.006em" }],
        callout: ["0.9375rem", { lineHeight: "1.56", letterSpacing: "-0.003em" }],
        footnote: ["0.875rem", { lineHeight: "1.5", letterSpacing: "0" }],
        caption: ["0.8125rem", { lineHeight: "1.45", letterSpacing: "0.005em" }],
        micro: ["0.75rem", { lineHeight: "1.35", letterSpacing: "0.015em" }],
        overline: ["0.75rem", { lineHeight: "1.3", letterSpacing: "0.08em" }],
        // Numerals that carry the layout: times, prices, the PNR.
        numeral: ["2rem", { lineHeight: "1", letterSpacing: "-0.032em" }],
        "numeral-sm": ["1.5rem", { lineHeight: "1", letterSpacing: "-0.026em" }],
      },

      borderRadius: {
        sm: "0.5rem",
        DEFAULT: "0.625rem",
        md: "0.75rem",
        lg: "0.875rem",
        xl: "1.125rem",
        "2xl": "1.5rem",
        "3xl": "1.75rem",
      },

      boxShadow: {
        e1: "var(--shadow-1)",
        e2: "var(--shadow-2)",
        e3: "var(--shadow-3)",
        press: "var(--shadow-press)",
      },

      transitionTimingFunction: {
        out: "cubic-bezier(0.23, 1, 0.32, 1)",
        "in-out": "cubic-bezier(0.77, 0, 0.175, 1)",
        drawer: "cubic-bezier(0.32, 0.72, 0, 1)",
      },

      keyframes: {
        // Group entrance for a list the user asked for. Decorative only.
        rise: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        // Marketing tier: more travel, a longer beat, seen once per visit.
        "rise-lg": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "draw-path": {
          from: { "stroke-dashoffset": "1" },
          to: { "stroke-dashoffset": "0" },
        },
        "fly-path": {
          from: { "offset-distance": "0%", opacity: "0" },
          "12%": { opacity: "1" },
          "88%": { opacity: "1" },
          to: { "offset-distance": "100%", opacity: "0" },
        },
        // Wizard steps travel in the direction the user is going.
        "step-forward": {
          from: { opacity: "0", transform: "translateX(20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "step-back": {
          from: { opacity: "0", transform: "translateX(-20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "check-in": {
          from: { opacity: "0", transform: "scale(0.6)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "draw-check": {
          from: { "stroke-dashoffset": "32" },
          to: { "stroke-dashoffset": "0" },
        },
      },

      animation: {
        rise: "rise 340ms cubic-bezier(0.23, 1, 0.32, 1) both",
        "rise-lg": "rise-lg 620ms cubic-bezier(0.23, 1, 0.32, 1) both",
        "draw-path": "draw-path 1600ms cubic-bezier(0.77, 0, 0.175, 1) 200ms both",
        "fly-path": "fly-path 1600ms cubic-bezier(0.77, 0, 0.175, 1) 200ms both",
        "step-forward": "step-forward 260ms cubic-bezier(0.23, 1, 0.32, 1) both",
        "step-back": "step-back 260ms cubic-bezier(0.23, 1, 0.32, 1) both",
        "check-in": "check-in 260ms cubic-bezier(0.23, 1, 0.32, 1) both",
        "draw-check": "draw-check 420ms cubic-bezier(0.23, 1, 0.32, 1) 120ms both",
      },
    },
  },
  plugins: [],
};

export default config;
