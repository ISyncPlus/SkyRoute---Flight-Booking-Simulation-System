"use client";

/**
 * Theme toggle.
 *
 * A circle wipes out from the point the user clicked, cross-fading the old
 * appearance into the new one via the View Transition API. Browsers without
 * it (Firefox, older Safari) get a plain instant switch — there is no
 * polyfill for the crossfade, only for the theme change itself.
 *
 * Rebuilt in-house, trimmed to what this navbar needs, from a Skiper UI
 * (https://skiper-ui.com) theme-toggle concept — credit where due, but this
 * is no longer that component: no variant/GIF/blur options, no demo scaffold.
 */

import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useEffect, useState, type MouseEvent } from "react";

const REVEAL_MS = 600;
const STYLE_ELEMENT_ID = "theme-toggle-reveal";

/** Rectangle wipes across the viewport from left to right. */
function revealCss(): string {
  return `
    ::view-transition-group(root) {
      animation-duration: ${REVEAL_MS}ms;
      animation-timing-function: cubic-bezier(0.77, 0, 0.175, 1);
    }
    ::view-transition-old(root) {
      animation: none;
      z-index: -1;
    }
    ::view-transition-new(root) {
      animation-name: theme-toggle-reveal;
    }
    @keyframes theme-toggle-reveal {
      from { clip-path: polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%); }
      to { clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%); }
    }
  `;
}

function setRevealStyles(css: string) {
  let style = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ELEMENT_ID;
    document.head.appendChild(style);
  }
  style.textContent = css;
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  // The resolved theme is only known once mounted on the client — rendering
  // it any earlier would disagree with the server-rendered markup.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  function toggle(_event?: MouseEvent<HTMLButtonElement>) {
    const next = isDark ? "light" : "dark";

    if (!document.startViewTransition) {
      setTheme(next);
      return;
    }

    setRevealStyles(revealCss());
    document.startViewTransition(() => setTheme(next));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!mounted}
      aria-label={mounted ? (isDark ? "Switch to light theme" : "Switch to dark theme") : "Toggle theme"}
      className={`pressable hover-fill flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface text-ink-2 disabled:opacity-0 ${className}`}
    >
      <svg viewBox="0 0 240 240" className="h-5 w-5" aria-hidden="true">
        {/* The two inner semicircles form a full disc; rotating them 180°
            swaps which half is "cut out" to match the surface behind it,
            turning the sun's core into the moon's crescent. */}
        <motion.g
          animate={{ rotate: isDark ? -180 : 0 }}
          transition={{ ease: "easeInOut", duration: 0.5 }}
        >
          <path
            d="M120 67.5C149.25 67.5 172.5 90.75 172.5 120C172.5 149.25 149.25 172.5 120 172.5"
            fill="currentColor"
          />
          <path
            d="M120 67.5C90.75 67.5 67.5 90.75 67.5 120C67.5 149.25 90.75 172.5 120 172.5"
            fill="var(--surface)"
          />
        </motion.g>
        <motion.path
          animate={{ rotate: isDark ? 180 : 0 }}
          transition={{ ease: "easeInOut", duration: 0.5 }}
          d="M120 3.75C55.5 3.75 3.75 55.5 3.75 120C3.75 184.5 55.5 236.25 120 236.25C184.5 236.25 236.25 184.5 236.25 120C236.25 55.5 184.5 3.75 120 3.75ZM120 214.5V172.5C90.75 172.5 67.5 149.25 67.5 120C67.5 90.75 90.75 67.5 120 67.5V25.5C172.5 25.5 214.5 67.5 214.5 120C214.5 172.5 172.5 214.5 120 214.5Z"
          fill="currentColor"
        />
      </svg>
    </button>
  );
}
