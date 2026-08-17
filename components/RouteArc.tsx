"use client";

/**
 * The route drawing itself, with an aircraft flying it.
 *
 * Explanatory motion — it says "a flight from here to there" faster than a
 * sentence does, and it runs once on a surface people see once per visit. Both
 * halves are gated in CSS: reduced motion gets the finished line and no
 * flight, and browsers without CSS motion paths get no aircraft at all.
 */

const ROUTE = "M 42 152 Q 200 18 358 66";

/**
 * The aircraft from the logo mark: a swept delta, nose along +X, drawn about
 * the origin so `offset-rotate: auto` can turn it to face along the path.
 * The same silhouette as design/logo-master.svg and the `plane` icon.
 */
const PLANE = "M17 0 L-8 -10 L-1 0 L-8 10 Z";

export function RouteArc({
  from,
  to,
  className = "",
}: {
  from: string;
  to: string;
  className?: string;
}) {
  return (
    <svg
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
        className="route-line"
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

      <g className="route-plane" style={{ offsetPath: `path("${ROUTE}")` } as React.CSSProperties}>
        {/* Scaled to the viewBox, then shifted so the aircraft's own centre —
            not the tail — is what rides the path. */}
        <path d={PLANE} fill="var(--accent)" transform="translate(-3.6 0) scale(.8)" />
      </g>
    </svg>
  );
}
