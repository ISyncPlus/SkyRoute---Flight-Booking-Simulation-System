"use client";

import Link from "next/link";
import { SearchForm } from "@/components/SearchForm";
import { RouteArc } from "@/components/RouteArc";
import { useApp } from "@/components/AppProvider";
import { Alert, Reveal } from "@/components/ui";
import { DEMO_ADMIN, DEMO_CUSTOMER } from "@/lib/auth";

const FEATURES = [
  {
    title: "Search a live schedule",
    body: "Twenty-one days of departures across sixteen airports, filtered by route, date, cabin and party size.",
  },
  {
    title: "Choose your own seat",
    body: "An interactive seat map per aircraft type, with window, aisle, middle and exit-row pricing.",
  },
  {
    title: "Dynamic fares",
    body: "Prices respond to how far ahead you book and how full the cabin already is, like a real airline.",
  },
  {
    title: "Manage your trips",
    body: "Retrieve a booking by reference, view the itinerary, and cancel with an automatic refund calculation.",
  },
];

const STATS = [
  { value: "16", label: "Airports" },
  { value: "21", label: "Days of departures" },
  { value: "3", label: "Cabin classes" },
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
        {role}
        {admin && <span className="badge bg-warn-soft text-warn-ink">Admin</span>}
      </p>
      <dl className="mt-4 space-y-2 text-footnote">
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-ink-3">Email</dt>
          <dd className="font-mono text-ink-2">{email}</dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-ink-3">Password</dt>
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
      {/* ---------------- Hero ---------------- */}
      <section className="relative isolate overflow-hidden">
        <div aria-hidden="true" className="hero-glow" />

        <div className="container-wide grid items-center gap-14 pb-16 pt-10 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pb-24 lg:pt-24">
          <div className="hero-in">
            <p>
              <span className="badge border border-line bg-surface px-3 py-1.5 text-ink-2 shadow-e1">
                Flight Booking Simulation System
              </span>
            </p>

            <h1 className="mt-7 max-w-[16ch] text-hero font-semibold text-ink">
              The whole booking journey, end to end.
            </h1>

            <p className="mt-7 max-w-xl text-lead text-ink-2">
              Search a live schedule, choose your seat on a real cabin map, watch the fare respond to
              demand, and manage the trip long after you book. Every flight here is fictional. Every
              step of the journey is not.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              {user ? (
                <>
                  <a href="#search" className="btn-primary btn-lg">
                    Search flights
                  </a>
                  <Link href="/bookings" className="btn-secondary btn-lg">
                    My bookings
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/register" className="btn-primary btn-lg">
                    Create your account
                  </Link>
                  <Link href="/login" className="btn-secondary btn-lg">
                    Sign in
                  </Link>
                </>
              )}
            </div>

            <dl className="mt-12 flex flex-wrap gap-x-12 gap-y-6 border-t border-line pt-8">
              {STATS.map((stat) => (
                <div key={stat.label}>
                  <dt className="sr-only">{stat.label}</dt>
                  <dd>
                    <span className="tabular block text-title-1 font-semibold text-ink">
                      {stat.value}
                    </span>
                    <span className="mt-1 block text-caption text-ink-3">{stat.label}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="card-glass p-6 sm:p-10">
            <RouteArc from="LOS" to="ABV" className="h-auto w-full" />
            <p className="mt-6 text-center text-footnote text-ink-2">
              Lagos to Abuja, direct — one of hundreds of departures in the schedule.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- Search ---------------- */}
      <section id="search" aria-labelledby="search-heading" className="container-wide scroll-mt-24 pb-8">
        {!storageAvailable && (
          <div className="mb-8">
            <Alert tone="error" title="Browser storage is unavailable">
              This application stores its data in your browser&apos;s localStorage. It appears to be
              disabled or full — this often happens in private browsing mode. Please open the site in
              a normal window to continue.
            </Alert>
          </div>
        )}

        <Reveal>
          <h2 id="search-heading" className="text-display font-semibold text-ink">
            Where would you like to fly?
          </h2>
          <p className="mt-4 max-w-xl text-lead text-ink-2">
            Pick a route and a date. You can browse the whole schedule without an account — you only
            need one to hold a seat.
          </p>
        </Reveal>

        <Reveal delay={80} className="mt-10">
          <SearchForm />
        </Reveal>
      </section>

      {/* ---------------- Features ---------------- */}
      <section aria-labelledby="features-heading" className="container-wide section">
        <Reveal>
          <h2 id="features-heading" className="max-w-2xl text-display font-semibold text-ink">
            Everything an airline does, simulated honestly.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, index) => (
            <Reveal key={feature.title} delay={index * 80}>
              <div className="card h-full">
                <span
                  aria-hidden="true"
                  className="tabular flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-footnote font-bold text-accent-ink"
                >
                  {index + 1}
                </span>
                <h3 className="mt-5 text-headline font-semibold text-ink">{feature.title}</h3>
                <p className="mt-2.5 text-footnote text-ink-2">{feature.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- Demonstration accounts ---------------- */}
      {!user && (
        <section aria-labelledby="demo-heading" className="container-wide pb-16 sm:pb-24">
          <Reveal>
            <h2 id="demo-heading" className="text-title-1 font-semibold text-ink">
              Prefer not to sign up? Borrow an account.
            </h2>
            <p className="mt-4 max-w-xl text-callout text-ink-2">
              Both accounts are seeded into your browser on first load. The administrator can also
              reach the console that manages the schedule.
            </p>
          </Reveal>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
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
            <div className="card-glass mt-12 flex flex-col items-start gap-6 p-8 sm:p-12 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-title-2 font-semibold text-ink">Ready to hold a seat?</h3>
                <p className="mt-2.5 max-w-lg text-callout text-ink-2">
                  Creating an account takes one form and never leaves your browser. Your details are
                  stored in localStorage and sent nowhere.
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
                <Link href="/register" className="btn-primary btn-lg">
                  Create your account
                </Link>
                <Link href="/login" className="btn-secondary btn-lg">
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
