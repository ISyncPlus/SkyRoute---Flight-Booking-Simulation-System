"use client";

/**
 * The SkyRoute logo mark.
 *
 * Three elements, which are the three nouns of the product: a waypoint you
 * leave from, a route, and the aircraft that flies it. The aircraft is the
 * same swept delta the icon set uses, so the mark and the icons read as one
 * family rather than as a logo with some clip art beside it.
 *
 * The disc is the deliberate part. Almost every app icon is a rounded square,
 * so a circle is what makes this one findable in a dock or a tab strip — and a
 * disc reads as a globe, which is the right shape to hang a great-circle route
 * on. Everything sits inside r = 19 of the centre: the aircraft used to break
 * the disc edge, which looks intentional at 88 px and looks broken at 16.
 *
 * Vector source of truth: `design/logo-master.svg` and `design/logo-mono.svg`.
 * Keep the two in step — the SVG files are what the favicon, the home-screen
 * icon and the social card are cut from.
 *
 * Both marks are decorative: every place they appear, the word "SkyRoute" is
 * set beside them, and announcing the name twice helps nobody.
 */

import { useId } from "react";

export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  // Two marks can share a page — the navbar and the e-ticket — and two
  // gradients cannot share an id.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`disc-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#19AD9C" />
          <stop offset="1" stopColor="#0A564D" />
        </linearGradient>
        {/* Vertical white fade, for depth. Invisible below about 32 px, which
            is why the small cut in design/logo-small.svg drops it. */}
        <linearGradient id={`sheen-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".20" />
          <stop offset=".6" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <circle cx="24" cy="24" r="23" fill={`url(#disc-${uid})`} />
      <circle cx="24" cy="24" r="23" fill={`url(#sheen-${uid})`} />

      <path
        d="M11.5 33C16.5 33.6 21 30.6 24.6 24.6"
        fill="none"
        stroke="#ffffff"
        strokeWidth="3.2"
        strokeLinecap="round"
        opacity=".8"
      />
      <circle cx="11.5" cy="33" r="3" fill="#ffffff" />
      <path
        d="M17 0 L-8 -10 L-1 0 L-8 10 Z"
        fill="#ffffff"
        transform="translate(26 21) rotate(-45) scale(.82)"
      />
    </svg>
  );
}

/**
 * Single-colour cut, no badge. Inherits `currentColor`, so it takes the
 * colour of the text around it — which is what makes it the right mark for
 * the footer and for anything that has to survive a black-and-white printer.
 */
export function LogoMono({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <g fill="currentColor" stroke="currentColor">
        <path
          d="M9 36.5C15.4 37.2 21 33.6 25.4 26.2"
          fill="none"
          strokeWidth="3.6"
          strokeLinecap="round"
          opacity=".5"
        />
        <circle cx="9" cy="36.5" r="3.3" stroke="none" />
        <path
          d="M17 0 L-8 -10 L-1 0 L-8 10 Z"
          stroke="none"
          transform="translate(28 20) rotate(-45) scale(1.04)"
        />
      </g>
    </svg>
  );
}
