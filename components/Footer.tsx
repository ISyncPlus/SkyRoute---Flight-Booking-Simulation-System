"use client";

/**
 * Site footer.
 * ------------
 * The last thing on every page, so it carries the four things a traveller
 * looks for after they have stopped reading: a way back into the schedule,
 * a way back to a booking they already hold, the account controls, and the
 * disclosure that none of this is a real airline.
 *
 * The API status pill is deliberate. Bookings, seat inventory and accounts
 * live on the SkyRoute backend now, so "is the backend up" is real, visible
 * state rather than a detail buried in a console.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "./AppProvider";
import { Icon, type IconName } from "./icons";
import { LogoMark } from "./Brand";
import { api } from "@/lib/api";

const REPO_URL = "https://github.com/ISyncPlus/SkyRoute---Flight-Booking-Simulation-System";

/* Route pairs lifted from the destination showcase, so the two agree. No date
   is carried: the search page falls to the first bookable day, which keeps
   these links static and out of the server/client date mismatch that a
   rendered `new Date()` would cause. */
const POPULAR_ROUTES: { from: string; to: string; label: string }[] = [
  { from: "LOS", to: "LHR", label: "Lagos → London" },
  { from: "LOS", to: "DXB", label: "Lagos → Dubai" },
  { from: "LOS", to: "CDG", label: "Lagos → Paris" },
  { from: "ABV", to: "LOS", label: "Abuja → Lagos" },
];

function routeHref(from: string, to: string) {
  return `/search?from=${from}&to=${to}&cabin=economy&adults=1`;
}

const CONTACT: { icon: IconName; label: string; value: string }[] = [
  { icon: "mail", label: "Email", value: "support@skyroute.sim" },
  { icon: "phone", label: "Reservations", value: "+234 (0) 1 700 0000" },
  { icon: "building", label: "Hub", value: "Murtala Muhammed Intl. (LOS)" },
];

type ApiStatus = "checking" | "online" | "offline";

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-block text-footnote text-ink-2 transition-colors hover:text-ink"
    >
      {children}
    </Link>
  );
}

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="overline">{title}</h3>
      <ul className="mt-4 space-y-2.5">{children}</ul>
    </div>
  );
}

export function Footer() {
  const { user, isAdmin, ready } = useApp();
  const [status, setStatus] = useState<ApiStatus>("checking");

  useEffect(() => {
    let cancelled = false;
    // A small unauthenticated GET doubles as the reachability probe.
    void api.flights.listAirports().then((result) => {
      if (!cancelled) setStatus(result.ok ? "online" : "offline");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const backToTop = useCallback(() => {
    const win = window as unknown as {
      lenis?: { scrollTo: (target: number | string, options?: object) => void };
    };
    if (win.lenis) win.lenis.scrollTo(0, { duration: 1.25 });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const statusCopy: Record<ApiStatus, string> = {
    checking: "Contacting SkyRoute API…",
    online: "SkyRoute API connected",
    offline: "API unreachable — cached data",
  };

  return (
    <footer className="no-print mt-auto border-t border-line bg-surface/50">
      <div className="container-wide py-14 sm:py-16">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          {/* ---------------- Brand, status and contact ---------------- */}
          <div className="lg:col-span-4 lg:pr-8">
            <Link href="/" className="pressable inline-flex items-center gap-2.5">
              <LogoMark className="h-9 w-9" />
              <span className="text-title-3 font-semibold text-ink">SkyRoute</span>
            </Link>

            <p className="mt-4 max-w-sm text-footnote leading-relaxed text-ink-2">
              A full-scale airline booking system: twenty-one days of live departures across sixteen
              hubs, an interactive seat map per aircraft, and fares that move with demand — all
              served by the SkyRoute API.
            </p>

            <div
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-line bg-fill px-3 py-1.5"
              role="status"
            >
              <span className="relative flex h-2 w-2">
                {status === "online" && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-60" />
                )}
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${
                    status === "online"
                      ? "bg-positive"
                      : status === "offline"
                        ? "bg-warn"
                        : "bg-ink-3"
                  }`}
                />
              </span>
              <span className="text-micro font-medium text-ink-2">{statusCopy[status]}</span>
            </div>

            <dl className="mt-6 space-y-2.5">
              {CONTACT.map((item) => (
                <div key={item.label} className="flex items-start gap-2.5">
                  <dt className="mt-0.5 shrink-0">
                    <span className="sr-only">{item.label}</span>
                    <Icon name={item.icon} className="h-4 w-4 text-ink-3" aria-hidden="true" />
                  </dt>
                  <dd className="text-footnote text-ink-2">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* ---------------- Link columns ---------------- */}
          <div className="grid gap-10 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-4">
            <Column title="Book & fly">
              <li>
                <FooterLink href="/#search">Search flights</FooterLink>
              </li>
              <li>
                <FooterLink href="/#destinations">Destinations</FooterLink>
              </li>
              <li>
                <FooterLink href="/#cabins">Cabin classes</FooterLink>
              </li>
              <li>
                <FooterLink href="/#fleet">Our fleet</FooterLink>
              </li>
              <li>
                <FooterLink href="/#pricing">How fares are set</FooterLink>
              </li>
            </Column>

            <Column title="Popular routes">
              {POPULAR_ROUTES.map((route) => (
                <li key={route.label}>
                  <FooterLink href={routeHref(route.from, route.to)}>{route.label}</FooterLink>
                </li>
              ))}
              <li>
                <FooterLink href="/search">All 16 airports</FooterLink>
              </li>
            </Column>

            <Column title="Your trips">
              <li>
                <FooterLink href="/bookings">My bookings</FooterLink>
              </li>
              <li>
                <FooterLink href="/manage">Find a booking</FooterLink>
              </li>
              <li>
                <FooterLink href="/#faq">Changes &amp; refunds</FooterLink>
              </li>
              <li>
                <FooterLink href="/#faq">Baggage allowance</FooterLink>
              </li>
              {ready && isAdmin && (
                <li>
                  <FooterLink href="/admin">Flight operations</FooterLink>
                </li>
              )}
            </Column>

            <Column title="Support">
              <li>
                <FooterLink href="/#faq">Frequently asked questions</FooterLink>
              </li>
              <li>
                <FooterLink href="/#features">What SkyRoute does</FooterLink>
              </li>
              {ready && !user && (
                <>
                  <li>
                    <FooterLink href="/login">Sign in</FooterLink>
                  </li>
                  <li>
                    <FooterLink href="/register">Create an account</FooterLink>
                  </li>
                </>
              )}
              <li>
                <a
                  href={REPO_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-footnote text-ink-2 transition-colors hover:text-ink"
                >
                  Source on GitHub
                  <Icon name="arrowRight" className="h-3.5 w-3.5 -rotate-45" aria-hidden="true" />
                </a>
              </li>
            </Column>
          </div>
        </div>

        {/* ---------------- Closing call to action ---------------- */}
        <div className="mt-12 flex flex-col items-center gap-4 rounded-2xl border border-line bg-fill p-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="text-headline font-semibold text-ink">Somewhere to be?</p>
            <p className="mt-1 text-footnote text-ink-2">
              Live availability and a fare quote in a few clicks. No account required.
            </p>
          </div>
          <Link href="/#search" className="btn-primary w-full shrink-0 justify-center sm:w-auto">
            <Icon name="search" className="h-4 w-4" />
            Search flights
          </Link>
        </div>
      </div>

      {/* ---------------- Legal bar ---------------- */}
      <div className="border-t border-line">
        <div className="container-wide flex flex-col items-center gap-4 py-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="space-y-1">
            {/* Prerendered at build time, read again at hydration: a page built
                in December and opened in January would otherwise mismatch. */}
            <p className="text-caption text-ink-3" suppressHydrationWarning>
              © {new Date().getFullYear()} SkyRoute. Next.js 15 · React 19 · Express + Prisma API.
            </p>
            <p className="text-caption text-ink-3">
              A simulated airline. No flights are operated, no cards are charged, and every
              schedule, fare and ticket reference is generated for demonstration.
            </p>
          </div>

          <button
            type="button"
            onClick={backToTop}
            className="btn-secondary shrink-0 !px-3 !py-1.5 text-footnote"
          >
            <Icon name="chevronUp" className="h-4 w-4" />
            Back to top
          </button>
        </div>
      </div>
    </footer>
  );
}
