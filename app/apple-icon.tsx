import { ImageResponse } from "next/og";

/**
 * iOS home-screen icon.
 *
 * Full bleed and fully opaque, with square corners: iOS rounds and masks the
 * tile itself, and a pre-rounded icon shows a dark halo inside Apple's mask.
 * The badge is therefore drawn here as a plain CSS gradient, and only the
 * white mark comes from the vector.
 */

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The mark alone, in white, on a transparent ground — design/logo-mark-white.svg. */
const MARK_WHITE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="180" height="180">
  <path d="M10.5 34C16 34.6 21 31.2 25 24.6" fill="none" stroke="#ffffff" stroke-width="3.4" stroke-linecap="round" opacity=".82"/>
  <circle cx="10.5" cy="34" r="3.1" fill="#ffffff"/>
  <path d="M17 0 L-8 -10 L-1 0 L-8 10 Z" fill="#ffffff" transform="translate(26.6 20.4) rotate(-45) scale(.9)"/>
</svg>`;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #19AD9C 0%, #0A564D 100%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          width={180}
          height={180}
          alt=""
          src={`data:image/svg+xml;utf8,${encodeURIComponent(MARK_WHITE)}`}
        />
      </div>
    ),
    size,
  );
}
