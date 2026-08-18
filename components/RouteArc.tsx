"use client";

/**
 * The route drawing itself, with an aircraft flying it.
 *
 * Explanatory motion — it says "a flight from here to there" faster than a
 * sentence does, and it runs once on a surface people see once per visit. Both
 * halves are gated in CSS: reduced motion gets the finished line and no
 * flight, and browsers without CSS motion paths get no aircraft at all.
 *
 * An IntersectionObserver ensures that on mobile devices (where the card sits
 * below the fold), the flight animation only triggers once the reader has
 * scrolled it into view.
 */

import { useEffect, useRef, useState } from "react";

const ROUTE = "M 42 152 Q 200 18 358 66";

/**
 * Nose-up airliner, drawn in a 24×24 box so it can be centred on the path.
 * More wing and fuselage detail than the logo's swept-delta mark needs at
 * this size — at the scale this flies across the hero and auth panel, the
 * plain delta reads as an arrowhead rather than an aircraft.
 */
const PLANE =
  "M21 16.5v-2l-8-4.5V4.2a1.2 1.2 0 0 0-2.4 0V10l-8 4.5v2l8-2.4v4.3l-2.2 1.4v1.5l3.4-1 3.4 1v-1.5L13 18.4v-4.3l8 2.4Z";

export function RouteArc({
  from,
  to,
  className = "",
}: {
  from: string;
  to: string;
  className?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -20px 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <svg
      ref={ref}
      viewBox="0 0 400 200"
      className={className}
      role="img"
      aria-label={`A direct route from ${from} to ${to}`}
    >
      {/* The whole route, faint — so the drawn line has something to fill in. */}
      <path
        d={ROUTE}
        fill="none"
        stroke="var(--line-strong)"
        strokeWidth={1.5}
        strokeDasharray="3 7"
        strokeLinecap="round"
      />

      {/* pathLength normalises the dash maths, so one unit is the whole path
          however the viewBox is scaled. */}
      <path
        className={inView ? "route-line" : undefined}
        style={!inView ? { strokeDasharray: 1, strokeDashoffset: 1 } : undefined}
        d={ROUTE}
        pathLength={1}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2.5}
        strokeLinecap="round"
      />

      <circle cx={42} cy={152} r={5.5} fill="var(--accent)" />
      <circle cx={42} cy={152} r={11} fill="var(--accent)" opacity={0.18} />
      <circle cx={358} cy={66} r={5.5} fill="var(--accent)" />
      <circle cx={358} cy={66} r={11} fill="var(--accent)" opacity={0.18} />

      <text x={42} y={178} textAnchor="middle" fill="var(--ink-2)" fontSize={17} fontWeight={600}>
        {from}
      </text>
      <text x={358} y={40} textAnchor="middle" fill="var(--ink-2)" fontSize={17} fontWeight={600}>
        {to}
      </text>

      {inView && (
        <g className="route-plane" style={{ offsetPath: `path("${ROUTE}")` } as React.CSSProperties}>
          {/* Centred on the origin, then turned to face along the path. */}
          <g transform="rotate(90) translate(-12,-12)">
            <path d={PLANE} fill="var(--accent)" />
          </g>
        </g>
      )}
    </svg>
  );
}
