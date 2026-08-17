import { ImageResponse } from "next/og";

/**
 * The social card: mark, wordmark, and one line that says what this is.
 *
 * Dark ground with a diagonal brand wash across it, so the white mark has
 * something to sit on and the card is recognisable at thumbnail size in a
 * timeline, where it is mostly seen.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "SkyRoute — Flight Booking Simulation System";

/** The full disc mark — design/logo-master.svg. */
const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="168" height="168">
  <defs>
    <linearGradient id="b" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#19AD9C"/><stop offset="1" stop-color="#0A564D"/>
    </linearGradient>
    <linearGradient id="s" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".20"/>
      <stop offset=".6" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <circle cx="24" cy="24" r="23" fill="url(#b)"/>
  <circle cx="24" cy="24" r="23" fill="url(#s)"/>
  <path d="M11.5 33C16.5 33.6 21 30.6 24.6 24.6" fill="none" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round" opacity=".8"/>
  <circle cx="11.5" cy="33" r="3" fill="#ffffff"/>
  <path d="M17 0 L-8 -10 L-1 0 L-8 10 Z" fill="#ffffff" transform="translate(26 21) rotate(-45) scale(.82)"/>
</svg>`;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          padding: "0 96px",
          backgroundColor: "#08201D",
          backgroundImage:
            "linear-gradient(135deg, rgba(10,86,77,0.72) 0%, rgba(25,173,156,0.24) 55%, rgba(8,32,29,0) 100%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          width={168}
          height={168}
          alt=""
          src={`data:image/svg+xml;utf8,${encodeURIComponent(MARK)}`}
        />

        <div style={{ display: "flex", fontSize: 86, fontWeight: 700, color: "#ffffff", marginTop: 40 }}>
          SkyRoute
        </div>
        <div style={{ display: "flex", fontSize: 34, color: "#79D9CB", marginTop: 18 }}>
          Flight Booking Simulation System
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#7C9C96", marginTop: 16 }}>
          Search · Choose your seat · Book · Manage
        </div>
      </div>
    ),
    size,
  );
}
