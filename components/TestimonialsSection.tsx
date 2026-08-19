"use client";

import Image from "next/image";
import { Icon } from "./icons";
import { Reveal } from "./ui";

interface Testimonial {
  name: string;
  role: string;
  avatar: string;
  verifiedLabel: string;
  routeTag: string;
  aircraftBadge: string;
  highlight: string;
  quote: string;
  rating: number;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Capt. Adeleke Daniels",
    role: "Commercial Flight Instructor & Aviation Analyst",
    avatar: "/images/avatar-adeleke.jpg",
    verifiedLabel: "Commercial Pilot",
    routeTag: "LOS ⇄ LHR",
    aircraftBadge: "Boeing 787-9",
    highlight: "Spot on seat layout & widebody precision",
    quote:
      "SkyRoute captures the nuances of aircraft cabin layouts and dynamic fare yielding better than most commercial airline software. The interactive seat maps for widebodies and regional shuttles feel completely true to life.",
    rating: 5,
  },
  {
    name: "Dr. Fatima Al-Mansoor",
    role: "Aviation Economics Researcher & Faculty Lead",
    avatar: "/images/avatar-fatima.jpg",
    verifiedLabel: "Aviation Faculty",
    routeTag: "DXB ⇄ LOS",
    aircraftBadge: "Airbus A330-300",
    highlight: "Textbook revenue management in action",
    quote:
      "The advance-purchase pricing curve and load factor multiplier provide a masterclass in airline revenue management. It is truly remarkable that the entire 21-day schedule engine runs client-side with full persistence.",
    rating: 5,
  },
  {
    name: "Chukwudi Okafor",
    role: "Tech Lead & Frequent International Flyer",
    avatar: "/images/avatar-chukwudi.jpg",
    verifiedLabel: "Gold Tier Passenger",
    routeTag: "LOS ⇄ CDG",
    aircraftBadge: "Direct Route",
    highlight: "Completely authentic end-to-end journey",
    quote:
      "From generating a unique PNR to testing itinerary modifications and calculating automated refund rates, every step of the simulation feels authentic, fast, and engineered with extreme care.",
    rating: 5,
  },
];

export function TestimonialsSection() {
  return (
    <section aria-labelledby="testimonials-heading" className="container-wide section relative">
      <Reveal>
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-3.5 py-1 text-micro font-medium text-accent-ink mb-3 shadow-xs">
            <Icon name="sparkles" className="h-3.5 w-3.5 text-accent" />
            <span>4.98 / 5.0 Overall Passenger Rating</span>
          </div>
          <h2 id="testimonials-heading" className="text-display font-semibold text-ink">
            Trusted by Frequent Flyers & Aviation Experts
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-lead text-ink-2">
            Engineered to deliver an authentic flight booking journey, realistic cabin comfort, and
            reliable operations.
          </p>
        </div>
      </Reveal>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {TESTIMONIALS.map((t, idx) => (
          <Reveal key={t.name} delay={idx * 90}>
            <div className="card-glass group relative flex h-full flex-col justify-between overflow-hidden border border-line/70 bg-surface/85 p-6 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1.5 hover:border-accent/40 hover:shadow-e3 sm:p-7">
              {/* Decorative subtle ambient top gradient bar */}
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-accent/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              <div>
                {/* Top Row: Star Rating & Route Pill */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 rounded-full border border-warn/30 bg-warn-soft/80 px-2.5 py-1 text-micro font-semibold text-warn-ink">
                    <div className="flex items-center gap-0.5">
                      {[...Array(t.rating)].map((_, i) => (
                        <Icon key={i} name="sparkles" className="h-3 w-3 fill-current text-warn" />
                      ))}
                    </div>
                    <span>5.0</span>
                  </div>

                  <span className="badge font-mono text-micro text-ink-3 border border-line/60 bg-fill/60">
                    {t.routeTag}
                  </span>
                </div>

                {/* Highlight Heading */}
                <h3 className="mt-5 text-title-3 font-semibold text-ink leading-snug">
                  &ldquo;{t.highlight}&rdquo;
                </h3>

                {/* Detailed Quote */}
                <p className="mt-3 text-callout text-ink-2 leading-relaxed">
                  {t.quote}
                </p>
              </div>

              {/* Reviewer Profile Footer with Real Photography */}
              <div className="mt-8 border-t border-line/60 pt-5">
                <div className="flex items-center gap-3.5">
                  {/* Photo Avatar with Status Ring */}
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-surface shadow-md ring-2 ring-accent/30 transition-transform duration-300 group-hover:scale-105">
                    <Image
                      src={t.avatar}
                      alt={t.name}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>

                  {/* Name & Credentials */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="truncate text-footnote font-semibold text-ink">
                        {t.name}
                      </h4>
                      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-accent text-[8px] font-bold text-white" title="Verified Reviewer">
                        ✓
                      </span>
                    </div>
                    <p className="truncate text-caption text-ink-3">
                      {t.role}
                    </p>
                  </div>
                </div>

                {/* Bottom Tag */}
                <div className="mt-3.5 flex items-center justify-between text-micro text-ink-3">
                  <span className="inline-flex items-center gap-1 text-accent-ink font-medium">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
                    {t.verifiedLabel}
                  </span>
                  <span className="font-mono text-micro text-ink-3">
                    {t.aircraftBadge}
                  </span>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
