"use client";

import Image from "next/image";
import Link from "next/link";
import { SearchForm } from "@/components/SearchForm";
import { RouteArc } from "@/components/RouteArc";
import { useApp } from "@/components/AppProvider";
import { Alert, Reveal } from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";
import FoldText from "@/components/FoldText";
import { SideRays } from "@/components/SideRays";
import { LiveTicker } from "@/components/LiveTicker";
import { DestinationShowcase } from "@/components/DestinationShowcase";
import { CabinShowcase } from "@/components/CabinShowcase";
import { FleetShowcase } from "@/components/FleetShowcase";
import { SimulationPricingExplainer } from "@/components/SimulationPricingExplainer";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { FaqSection } from "@/components/FaqSection";
import { DEMO_ADMIN, DEMO_CUSTOMER } from "@/lib/auth";

const FEATURES: { title: string; body: string; icon: IconName }[] = [
  {
    title: "Search a live schedule",
    body: "Twenty-one days of departures across sixteen airports, filtered by route, date, cabin and party size.",
    icon: "search",
  },
  {
    title: "Choose your own seat",
    body: "An interactive seat map per aircraft type, with window, aisle, middle and exit-row pricing.",
    icon: "seat",
  },
  {
    title: "Dynamic fares",
    body: "Prices respond to how far ahead you book and how full the cabin already is, like a real airline.",
    icon: "trendUp",
  },
  {
    title: "Manage your trips",
    body: "Retrieve a booking by reference, view the itinerary, and cancel with an automatic refund calculation.",
    icon: "ticket",
  },
];

const STATS = [
  { value: "16", label: "International Hubs" },
  { value: "21", label: "Days Live Horizon" },
  { value: "3", label: "Cabin Classes" },
  { value: "4", label: "Aircraft Types" },
];

function DemoAccount({
  role,
  email,
  password,
  admin = false,
}: {
  role: string;
  email: string;
  password: string;
  admin?: boolean;
}) {
  return (
    <div className="card">
      <p className="flex items-center gap-2 text-footnote font-semibold text-ink">
        <Icon name={admin ? "shield" : "user"} className="h-4 w-4 text-ink-3" />
        {role}
        {admin && <span className="badge bg-warn-soft text-warn-ink">Admin</span>}
      </p>
      <dl className="mt-4 space-y-2 text-footnote">
        <div className="flex flex-wrap gap-x-2">
          <dt className="flex items-center gap-1.5 text-ink-3">
            <Icon name="mail" className="h-3.5 w-3.5" />
            Email
          </dt>
          <dd className="font-mono text-ink-2">{email}</dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="flex items-center gap-1.5 text-ink-3">
            <Icon name="lock" className="h-3.5 w-3.5" />
            Password
          </dt>
          <dd className="font-mono text-ink-2">{password}</dd>
        </div>
      </dl>
    </div>
  );
}

export default function HomePage() {
  const { storageAvailable, user } = useApp();

  return (
    <div>
      {/* ---------------- Hero Section ---------------- */}
      <section className="relative isolate overflow-hidden">
        <div aria-hidden="true" className="hero-glow" />
        
        {/* Dynamic Light/Dark SideRays Effect */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-80 transition-opacity duration-700"
        >
          <SideRays
            origin="top-right"
            speed={1.8}
            spread={2.2}
            saturation={1.4}
            blend={0.7}
            lightRayColor1="#0d6b5e"
            lightRayColor2="#0284c7"
            lightIntensity={1.2}
            lightOpacity={0.4}
            lightFalloff={2.2}
            darkRayColor1="#2fc4ae"
            darkRayColor2="#38bdf8"
            darkIntensity={1.8}
            darkOpacity={0.8}
            darkFalloff={1.8}
            className="h-full w-full"
          />
        </div>

        <div className="container-wide grid items-center gap-12 pb-16 pt-8 sm:pt-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:pb-20 lg:pt-20">
          <div className="hero-in">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge gap-1.5 border border-line bg-surface px-3 py-1.5 text-ink-2 shadow-e1">
                <Icon name="sparkles" className="h-3.5 w-3.5 text-accent" />
                Flight Booking Simulation System
              </span>
              <span className="badge border border-positive/30 bg-positive-soft px-2.5 py-1 text-positive-ink font-mono text-micro">
                ● High-Fidelity 2026
              </span>
            </div>

            <h1 className="mt-6 max-w-[16ch] text-hero font-semibold text-ink">
              <FoldText
                text="The whole booking journey, end to end."
                splitBy="word"
                hinge="top"
                fontSize="clamp(2.75rem, 1.9rem + 3.6vw, 5rem)"
                fontWeight={600}
                color="var(--ink)"
              />
            </h1>

            <p className="mt-6 max-w-xl text-lead text-ink-2">
              Search a live schedule, choose your seat on a real cabin map, watch the fare respond to
              demand, and manage the trip long after you book. Every flight here is fictional. Every
              step of the journey is not.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              {user ? (
                <>
                  <a
                    href="#search"
                    className="btn-primary btn-lg w-full sm:w-auto text-center justify-center shadow-e2"
                  >
                    <Icon name="search" className="h-5 w-5" />
                    Search flights
                  </a>
                  <Link
                    href="/bookings"
                    className="btn-secondary btn-lg w-full sm:w-auto text-center justify-center"
                  >
                    <Icon name="ticket" className="h-5 w-5" />
                    My bookings
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="btn-primary btn-lg w-full sm:w-auto text-center justify-center shadow-e2"
                  >
                    Create your account
                    <Icon name="arrowRight" className="h-5 w-5" />
                  </Link>
                  <Link
                    href="/login"
                    className="btn-secondary btn-lg w-full sm:w-auto text-center justify-center"
                  >
                    <Icon name="signIn" className="h-5 w-5" />
                    Sign in
                  </Link>
                </>
              )}
            </div>

            {/* Quick Stats Metrics */}
            <dl className="mt-10 grid grid-cols-2 gap-4 border-t border-line pt-6 sm:grid-cols-4 sm:gap-x-8">
              {STATS.map((stat) => (
                <div key={stat.label}>
                  <dt className="sr-only">{stat.label}</dt>
                  <dd>
                    <span className="tabular block text-title-2 font-semibold text-ink sm:text-title-1">
                      {stat.value}
                    </span>
                    <span className="mt-1 block text-micro text-ink-3">{stat.label}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Right: Rich Photorealistic Aircraft Media Card with Route Overlay */}
          <div className="card-glass relative overflow-hidden p-0 shadow-e3">
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-fill">
              <Image
                src="/images/hero-aircraft.jpg"
                alt="SkyRoute Boeing 787 Dreamliner cruising above sunset clouds"
                fill
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              
              <div className="absolute left-4 top-4">
                <span className="badge bg-black/50 text-white backdrop-blur-md border border-white/20">
                  Boeing 787-9 Dreamliner
                </span>
              </div>

              <div className="absolute bottom-4 left-4 right-4 text-white">
                <p className="text-micro font-mono uppercase tracking-wider text-white/80">
                  FLAGSHIP FLIGHT · LOS ⇄ LHR
                </p>
                <p className="mt-0.5 text-footnote font-medium text-white/95">
                  Simulating altitude 38,000 ft · Cruising speed 903 km/h
                </p>
              </div>
            </div>

            {/* Route Arc Sub-panel */}
            <div className="p-5 sm:p-6 bg-surface/70 backdrop-blur-md">
              <RouteArc from="LOS" to="ABV" className="h-auto w-full" />
              <div className="mt-4 flex items-center justify-between text-footnote text-ink-2">
                <span className="flex items-center gap-1.5 font-mono text-ink">
                  LOS (Lagos)
                  <Icon name="arrowRight" className="h-3.5 w-3.5 text-accent" />
                  ABV (Abuja)
                </span>
                <span className="badge bg-accent-soft text-accent-ink text-micro font-medium">
                  Direct Daily Shuttle
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Live Telemetry Ticker ---------------- */}
      <LiveTicker />

      {/* ---------------- Flight Search Section ---------------- */}
      <section
        id="search"
        aria-labelledby="search-heading"
        className="container-wide scroll-mt-24 py-12 sm:py-16"
      >
        {!storageAvailable && (
          <div className="mb-8">
            <Alert tone="error" title="Browser storage is unavailable">
              This application stores its data in your browser&apos;s localStorage. It appears to be
              disabled or full. This often happens in private browsing mode. Please open the site in
              a normal window to continue.
            </Alert>
          </div>
        )}

        <Reveal>
          <div className="text-center">
            <p className="overline text-accent">Real-Time Schedule Engine</p>
            <h2 id="search-heading" className="mt-2 text-display font-semibold text-ink">
              Where would you like to fly?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-lead text-ink-2">
              Pick a route and departure date. Browse the full 21-day schedule with live seat
              availability and dynamic pricing before holding a reservation.
            </p>
          </div>
        </Reveal>

        <Reveal delay={80} className="mt-10">
          <SearchForm />
        </Reveal>
      </section>

      {/* ---------------- Destination & Route Explorer ---------------- */}
      <DestinationShowcase />

      {/* ---------------- Cabin Class Experience ---------------- */}
      <CabinShowcase />

      {/* ---------------- Fleet & Aircraft Specifications ---------------- */}
      <FleetShowcase />

      {/* ---------------- Dynamic Pricing Architecture ---------------- */}
      <SimulationPricingExplainer />

      {/* ---------------- Architecture & Capabilities ---------------- */}
      <section aria-labelledby="features-heading" className="container-wide section">
        <Reveal>
          <div className="text-center">
            <p className="overline text-accent">Simulation Capabilities</p>
            <h2 id="features-heading" className="mt-2 text-display font-semibold text-ink">
              Everything an Airline Does, Simulated Honestly
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-lead text-ink-2">
              Designed as a comprehensive showcase of modern aviation logic, data modeling, and
              interactive state management.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, index) => (
            <Reveal key={feature.title} delay={index * 80}>
              <div className="card h-full transition-all hover:shadow-e2">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent-ink">
                  <Icon name={feature.icon} className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-headline font-semibold text-ink">{feature.title}</h3>
                <p className="mt-2.5 text-footnote text-ink-2">{feature.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- Testimonials & Social Proof ---------------- */}
      <TestimonialsSection />

      {/* ---------------- Frequently Asked Questions ---------------- */}
      <FaqSection />

      {/* ---------------- Demonstration Accounts & Final Call To Action ---------------- */}
      {!user && (
        <section aria-labelledby="demo-heading" className="container-wide pb-16 sm:pb-24">
          <Reveal>
            <div className="text-center">
              <p className="overline text-accent">Instant Testing Credentials</p>
              <h2 id="demo-heading" className="mt-2 text-title-1 font-semibold text-ink">
                Prefer not to sign up? Borrow an account.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-callout text-ink-2">
                Both demo roles are pre-seeded into your browser on first launch. The administrator can
                manage the global schedule, modify timings, and inspect passenger manifests.
              </p>
            </div>
          </Reveal>

          <div className="mx-auto mt-8 grid max-w-3xl gap-5 sm:grid-cols-2">
            <Reveal>
              <DemoAccount
                role="Customer"
                email={DEMO_CUSTOMER.email}
                password={DEMO_CUSTOMER.password}
              />
            </Reveal>
            <Reveal delay={80}>
              <DemoAccount
                role="Administrator"
                email={DEMO_ADMIN.email}
                password={DEMO_ADMIN.password}
                admin
              />
            </Reveal>
          </div>

          <Reveal delay={120}>
            <div className="card-glass mt-12 flex flex-col items-start gap-6 p-6 sm:p-12 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-title-2 font-semibold text-ink">Ready to hold a seat?</h3>
                <p className="mt-2.5 max-w-lg text-callout text-ink-2">
                  Creating an account takes one form and never leaves your browser. Your details are
                  stored securely in localStorage and sent nowhere.
                </p>
              </div>
              <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row">
                <Link
                  href="/register"
                  className="btn-primary btn-lg w-full sm:w-auto text-center justify-center"
                >
                  Create your account
                  <Icon name="arrowRight" className="h-5 w-5" />
                </Link>
                <Link
                  href="/login"
                  className="btn-secondary btn-lg w-full sm:w-auto text-center justify-center"
                >
                  <Icon name="signIn" className="h-5 w-5" />
                  Sign in
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      )}
    </div>
  );
}
