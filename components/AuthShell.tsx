"use client";

/**
 * Split layout shared by sign-in and registration.
 *
 * The brand panel carries the longer motion — it draws a route and its points
 * arrive in sequence — because nobody types into it. The form column uses the
 * short stagger instead: fields that are still sliding when you reach for them
 * feel slow, however pretty they are. Both sides stay interactive throughout.
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { RouteArc } from "./RouteArc";

export function AuthShell({
  title,
  subtitle,
  points,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  points: { title: string; body: string }[];
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="hero-glow" />

      <div className="container-wide grid items-center gap-12 py-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:py-16">
        {/* Brand panel — decorative, so it is out of the reading order on the
            small screens where it would otherwise come before the form. */}
        <aside className="hero-in hidden lg:block">
          <div className="card-glass p-8">
            <RouteArc from="LOS" to="ABV" className="h-auto w-full" />
          </div>

          <h2 className="mt-10 max-w-sm text-title-1 font-semibold text-ink">
            One account, the whole journey.
          </h2>

          <dl className="mt-8 space-y-6">
            {points.map((point) => (
              <div key={point.title} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-caption font-bold text-accent-ink"
                >
                  ✓
                </span>
                <div>
                  <dt className="text-footnote font-semibold text-ink">{point.title}</dt>
                  <dd className="mt-1 text-footnote text-ink-2">{point.body}</dd>
                </div>
              </div>
            ))}
          </dl>
        </aside>

        <div className="mx-auto w-full max-w-lg">
          <div className="stagger">
            <div>
              <Link
                href="/"
                className="text-footnote font-medium text-ink-3 hover:text-ink hover:underline"
              >
                ← Back to SkyRoute
              </Link>
              <h1 className="mt-6 text-display font-semibold text-ink">{title}</h1>
              <p className="mt-4 text-lead text-ink-2">{subtitle}</p>
            </div>

            <div className="mt-10">{children}</div>

            <div className="mt-8">{footer}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
