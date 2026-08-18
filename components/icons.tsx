/**
 * The SkyRoute icon set — 50 icons drawn on one 24 x 24 grid.
 *
 * Every icon is stroked, never filled, at 1.75 units on that grid: heavy
 * enough to survive a 16 px raster, light enough not to shout next to
 * text set at the same size. The exceptions are deliberate — the aircraft,
 * the waypoint and the exit-row occupant are solid, because a 3 px
 * silhouette read as a stroked outline turns to mud.
 *
 * The aircraft is the same swept delta as the logo mark, at 0.44–0.5 scale.
 * The set and the mark are one family, not a mark and some clip art.
 *
 * Colour comes from `currentColor`, so an icon takes the colour of the text
 * it sits beside and needs no per-appearance handling.
 *
 * `design/render-icon-sheet.tsx` renders every icon here to a contact sheet
 * at 28 px and 16 px. An icon that does not read at 16 px there will not read
 * in the interface either.
 */

import { createElement, type ReactNode } from "react";

export interface IconProps {
  /** Size in px. A Tailwind size class on `className` overrides it. */
  size?: number;
  className?: string;
}

/**
 * Icons are decorative by default: `aria-hidden` keeps them out of the
 * accessibility tree, so a button that is nothing but an icon must carry its
 * own `aria-label`. An icon beside a text label would otherwise be announced
 * twice.
 */
function icon(name: string, children: ReactNode) {
  const Glyph = ({ size = 20, className }: IconProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  );

  Glyph.displayName = `Icon.${name}`;
  return Glyph;
}

export const ICONS = {
  /* ---- Chrome and controls ---- */
  menu: icon("menu", <path d="M3.5 7h17M3.5 12h17M3.5 17h17" />),
  close: icon("close", <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />),
  check: icon("check", <path d="M4.5 12.5l4.8 4.8L19.5 6.6" />),
  plus: icon("plus", <path d="M12 4.5v15M4.5 12h15" />),

  /* ---- Direction ---- */
  chevronLeft: icon("chevronLeft", <path d="M14.5 5.5L8 12l6.5 6.5" />),
  chevronRight: icon("chevronRight", <path d="M9.5 5.5L16 12l-6.5 6.5" />),
  chevronDown: icon("chevronDown", <path d="M5.5 9.5L12 16l6.5-6.5" />),
  chevronUp: icon("chevronUp", <path d="M5.5 14.5L12 8l6.5 6.5" />),
  arrowLeft: icon("arrowLeft", <path d="M19.5 12h-15M10.5 6L4.5 12l6 6" />),
  arrowRight: icon("arrowRight", <path d="M4.5 12h15M13.5 6l6 6-6 6" />),

  /* ---- Amenities & Connectivity ---- */
  wifi: icon("wifi",
      <>
        <path d="M5 9.5a10 10 0 0 1 14 0" />
        <path d="M8.5 13a5 5 0 0 1 7 0" />
        <circle cx="12" cy="17" r="1.2" fill="currentColor" stroke="none" />
      </>
    ),
  food: icon("food",
      <>
        <path d="M18 4v16M14 4v4a2 2 0 0 0 2 2v10M6 4v7a3 3 0 0 0 6 0V4M9 4v7" />
      </>
    ),
  radar: icon("radar",
      <>
        <path d="M12 21a9 9 0 1 0-9-9" />
        <path d="M12 17a5 5 0 1 0-5-5" />
        <circle cx="12" cy="12" r="1.5" />
        <path d="M12 12l6-6" />
      </>
    ),

  /* ---- Status ---- */
  checkCircle: icon("checkCircle",
      <>
        <circle cx="12" cy="12" r="8.75" />
        <path d="M8.2 12.3l2.6 2.6 5-5.5" />
      </>
    ),
  xCircle: icon("xCircle",
      <>
        <circle cx="12" cy="12" r="8.75" />
        <path d="M9.3 9.3l5.4 5.4M14.7 9.3l-5.4 5.4" />
      </>
    ),
  alertTriangle: icon("alertTriangle",
      <>
        <path d="M10.9 4.6 2.7 18.9a1.3 1.3 0 0 0 1.1 1.9h16.4a1.3 1.3 0 0 0 1.1-1.9L13.1 4.6a1.3 1.3 0 0 0-2.2 0z" />
        <path d="M12 10v4.2M12 17.6h.01" />
      </>
    ),
  infoCircle: icon("infoCircle",
      <>
        <circle cx="12" cy="12" r="8.75" />
        <path d="M12 11.2v5.1M12 7.9h.01" />
      </>
    ),
  spinner: icon("spinner", <path d="M12 3.25a8.75 8.75 0 1 0 8.75 8.75" />),

  /* ---- Flight ---- */
  plane: icon("plane", <path d="M17 0 L-8 -10 L-1 0 L-8 10 Z" fill="currentColor" stroke="none" transform="translate(12 12) scale(.5)" />),
  planeTakeoff: icon("planeTakeoff",
      <>
        <path d="M3 20.5h18" />
        <path d="M3.6 16.6c3-.4 5.5-2 7.4-4.7" opacity=".55" />
        <path d="M17 0 L-8 -10 L-1 0 L-8 10 Z" fill="currentColor" stroke="none" transform="translate(14.2 9) rotate(-38) scale(.44)" />
      </>
    ),
  planeLanding: icon("planeLanding",
      <>
        <path d="M3 20.5h18" />
        <path d="M3.6 5.4c2.1 3 4.6 5.3 7.6 6.9" opacity=".55" />
        <path d="M17 0 L-8 -10 L-1 0 L-8 10 Z" fill="currentColor" stroke="none" transform="translate(14.4 14.6) rotate(30) scale(.44)" />
      </>
    ),
  route: icon("route",
      <>
        <path d="M4.9 18.6c2.7-.3 5-2 6.9-5.1" opacity=".7" />
        <circle cx="4.4" cy="18.9" r="1.6" fill="currentColor" stroke="none" />
        <path d="M17 0 L-8 -10 L-1 0 L-8 10 Z" fill="currentColor" stroke="none" transform="translate(14.1 9.6) rotate(-45) scale(.46)" />
      </>
    ),

  /* ---- The booking journey ---- */
  search: icon("search",
      <>
        <circle cx="10.8" cy="10.8" r="6.6" />
        <path d="M15.7 15.7l4.6 4.6" />
      </>
    ),
  ticket: icon("ticket",
      <>
        <path d="M3.5 8.6a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v1.5a2.2 2.2 0 0 0 0 4.4v1.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-1.5a2.2 2.2 0 0 0 0-4.4z" />
        <path d="M14.2 6.6v11" strokeDasharray="1.6 2.1" />
      </>
    ),
  luggage: icon("luggage",
      <>
        <rect x="4.2" y="7.4" width="15.6" height="12.2" rx="2.4" />
        <path d="M9 7.4V5.6a1.6 1.6 0 0 1 1.6-1.6h2.8A1.6 1.6 0 0 1 15 5.6v1.8" />
        <path d="M10 11v5.4M14 11v5.4" />
        <path d="M7.8 19.6v1.2M16.2 19.6v1.2" />
      </>
    ),
  seat: icon("seat",
      <>
        <rect x="7" y="4.2" width="10" height="15.4" rx="3.2" />
        <path d="M7 9.8h10" />
        <path d="M4.5 12.6v4.4M19.5 12.6v4.4" />
      </>
    ),
  idCard: icon("idCard",
      <>
        <rect x="2.8" y="4.8" width="18.4" height="14.4" rx="2.4" />
        <circle cx="8.7" cy="10.8" r="2.2" />
        <path d="M5.4 16.2a3.8 3.8 0 0 1 6.6 0" />
        <path d="M14.8 9.8h3.9M14.8 13.4h3.9" />
      </>
    ),
  passport: icon("passport",
      <>
        <path d="M6.2 3.6h9.6a2 2 0 0 1 2 2v12.8a2 2 0 0 1-2 2H6.2a1.7 1.7 0 0 1-1.7-1.7V5.3a1.7 1.7 0 0 1 1.7-1.7z" />
        <circle cx="11" cy="10.2" r="2.7" />
        <path d="M8.6 15.9h4.8" />
      </>
    ),
  creditCard: icon("creditCard",
      <>
        <rect x="2.8" y="5.4" width="18.4" height="13.2" rx="2.4" />
        <path d="M2.8 10h18.4" />
        <path d="M6.4 14.6h3.4" />
      </>
    ),
  lock: icon("lock",
      <>
        <rect x="4.9" y="10.4" width="14.2" height="9.4" rx="2.2" />
        <path d="M8.3 10.4V8a3.7 3.7 0 0 1 7.4 0v2.4" />
        <path d="M12 14.3v1.9" />
      </>
    ),
  exitRow: icon("exitRow",
      <>
        <path d="M5.4 20.4V4.8a1.2 1.2 0 0 1 1.2-1.2h7.4a1.2 1.2 0 0 1 1.2 1.2v15.6" />
        <path d="M3.6 20.4h13" />
        <circle cx="12.4" cy="12.4" r=".9" fill="currentColor" stroke="none" />
        <path d="M21 12h-3.8M18.6 9.6 21 12l-2.4 2.4" />
      </>
    ),
  sparkles: icon("sparkles",
      <>
        <path d="M10.2 3.6l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" />
        <path d="M17.6 14.4l.8 2.1 2.1.8-2.1.8-.8 2.1-.8-2.1-2.1-.8 2.1-.8z" />
      </>
    ),

  /* ---- Trip details ---- */
  calendar: icon("calendar",
      <>
        <rect x="3.5" y="5.2" width="17" height="15.3" rx="2.4" />
        <path d="M3.5 10.2h17" />
        <path d="M8.2 3.4v3.6M15.8 3.4v3.6" />
        <path d="M7.9 14h.01M12 14h.01M16.1 14h.01M7.9 17.4h.01M12 17.4h.01" />
      </>
    ),
  users: icon("users",
      <>
        <circle cx="9" cy="8.2" r="3.6" />
        <path d="M2.8 20.2a6.4 6.4 0 0 1 12.4 0" />
        <path d="M16.4 5.1a3.6 3.6 0 0 1 0 6.9" />
        <path d="M17.7 14.7a5.4 5.4 0 0 1 3.5 5.5" />
      </>
    ),
  swap: icon("swap",
      <>
        <path d="M8 4.6v14.8M4.8 7.8 8 4.6l3.2 3.2" />
        <path d="M16 19.4V4.6M12.8 16.2 16 19.4l3.2-3.2" />
      </>
    ),
  clock: icon("clock",
      <>
        <circle cx="12" cy="12" r="8.75" />
        <path d="M12 7.1V12l3.3 2" />
      </>
    ),
  filter: icon("filter", <path d="M3.6 5.6h16.8l-6.5 7.7v5.5l-3.8 2v-7.5z" />),
  sort: icon("sort",
      <>
        <path d="M4.2 6.4h10M4.2 12h6.8M4.2 17.6h3.9" />
        <path d="M17.4 5.6v12.8M14.4 15.4l3 3 3-3" />
      </>
    ),

  /* ---- Contact and documents ---- */
  building: icon("building",
      <>
        <path d="M4.6 20.4V6.3a1.6 1.6 0 0 1 1.6-1.6h6a1.6 1.6 0 0 1 1.6 1.6v14.1" />
        <path d="M13.8 20.4v-9.3h4.4a1.6 1.6 0 0 1 1.6 1.6v7.7" />
        <path d="M3 20.4h18" />
        <path d="M7.6 8.4h2.6M7.6 12h2.6M7.6 15.6h2.6" />
      </>
    ),
  mail: icon("mail",
      <>
        <rect x="2.8" y="5" width="18.4" height="14" rx="2.4" />
        <path d="M3.4 7.4 10.8 12.9a2 2 0 0 0 2.4 0l7.4-5.5" />
      </>
    ),
  phone: icon("phone", <path d="M6.6 3.6h2.1l1.6 4-2 1.2a10.6 10.6 0 0 0 5 5l1.2-2 4 1.6v2.1a2 2 0 0 1-2.2 2A16.9 16.9 0 0 1 4.6 5.8a2 2 0 0 1 2-2.2z" />),
  printer: icon("printer",
      <>
        <path d="M7.2 9V4.4a.8.8 0 0 1 .8-.8h8a.8.8 0 0 1 .8.8V9" />
        <path d="M7.2 16.4H5.4a2 2 0 0 1-2-2v-3.4a2 2 0 0 1 2-2h13.2a2 2 0 0 1 2 2v3.4a2 2 0 0 1-2 2h-1.8" />
        <path d="M7.2 15.2h9.6v5a.8.8 0 0 1-.8.8H8a.8.8 0 0 1-.8-.8z" />
        <path d="M17.4 12h.01" />
      </>
    ),
  download: icon("download",
      <>
        <path d="M12 3.6v11.2" />
        <path d="M7.8 10.6 12 14.8l4.2-4.2" />
        <path d="M4.6 19.6h14.8" />
      </>
    ),

  /* ---- Account ---- */
  user: icon("user",
      <>
        <circle cx="12" cy="8.4" r="3.9" />
        <path d="M4.6 20.2a7.4 7.4 0 0 1 14.8 0" />
      </>
    ),
  signIn: icon("signIn",
      <>
        <path d="M14.2 3.6h4.2a2 2 0 0 1 2 2v12.8a2 2 0 0 1-2 2h-4.2" />
        <path d="M10.4 8.2 14.2 12l-3.8 3.8" />
        <path d="M14.2 12H3.6" />
      </>
    ),
  signOut: icon("signOut",
      <>
        <path d="M9.8 3.6H5.6a2 2 0 0 0-2 2v12.8a2 2 0 0 0 2 2h4.2" />
        <path d="M16.6 8.2 20.4 12l-3.8 3.8" />
        <path d="M20.4 12H9.2" />
      </>
    ),
  shield: icon("shield",
      <>
        <path d="M12 3.4 4.9 6.4v5.1c0 4.3 3 8.4 7.1 9.5 4.1-1.1 7.1-5.2 7.1-9.5V6.4z" />
        <path d="M9.3 12.2l2 2 3.6-3.9" />
      </>
    ),

  /* ---- Administration ---- */
  chart: icon("chart",
      <>
        <path d="M4 20.4h16" />
        <path d="M7 20.4v-5.6M12 20.4V8.2M17 20.4v-8.6" />
      </>
    ),
  trendUp: icon("trendUp",
      <>
        <path d="M3.6 16.6 9.6 10.6l3.5 3.5 7.3-7.3" />
        <path d="M15.4 6.8h5v5" />
      </>
    ),
  banknote: icon("banknote",
      <>
        <rect x="2.6" y="6" width="18.8" height="12" rx="2.4" />
        <circle cx="12" cy="12" r="2.8" />
        <path d="M6.2 10.4v3.2M17.8 10.4v3.2" />
      </>
    ),
  database: icon("database",
      <>
        <ellipse cx="12" cy="6.2" rx="7.5" ry="2.8" />
        <path d="M4.5 6.2v11.6c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V6.2" />
        <path d="M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8" />
      </>
    ),
  list: icon("list",
      <>
        <path d="M9.4 6.4h10.8M9.4 12h10.8M9.4 17.6h10.8" />
        <path d="M3.6 6.2l1.3 1.3 2.2-2.5M3.6 11.8l1.3 1.3 2.2-2.5M3.6 17.4l1.3 1.3 2.2-2.5" />
      </>
    ),
  trash: icon("trash",
      <>
        <path d="M4.6 6.8h14.8" />
        <path d="M9.5 6.8V5.2a1.6 1.6 0 0 1 1.6-1.6h1.8a1.6 1.6 0 0 1 1.6 1.6v1.6" />
        <path d="M6.6 6.8l.9 12.1a1.6 1.6 0 0 0 1.6 1.5h5.8a1.6 1.6 0 0 0 1.6-1.5l.9-12.1" />
        <path d="M10.3 10.5v6.1M13.7 10.5v6.1" />
      </>
    ),
  ban: icon("ban",
      <>
        <circle cx="12" cy="12" r="8.75" />
        <path d="M5.8 5.8l12.4 12.4" />
      </>
    ),
  refresh: icon("refresh",
      <>
        <path d="M20.3 12a8.3 8.3 0 1 1-2.4-5.9" />
        <path d="M20.6 4.2v4.6H16" />
      </>
    ),
};

export type IconName = keyof typeof ICONS;

/** Look an icon up by name: `<Icon name="planeTakeoff" className="h-4 w-4" />`. */
export function Icon({ name, ...props }: IconProps & { name: IconName }) {
  return createElement(ICONS[name], props);
}
