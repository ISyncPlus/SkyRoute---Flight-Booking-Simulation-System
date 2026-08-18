"use client";

import { Icon } from "./icons";
import { Reveal } from "./ui";

const TESTIMONIALS = [
  {
    name: "Capt. Adeleke Daniels",
    role: "Commercial Flight Instructor & Aviation Analyst",
    avatar: "AD",
    quote:
      "SkyRoute captures the nuances of aircraft cabin layouts and dynamic fare yielding better than most commercial software demos. The interactive seat maps for widebodies and regional jets are spot on.",
    rating: 5,
    highlight: "Spot on seat layout precision",
  },
  {
    name: "Dr. Fatima Al-Mansoor",
    role: "Aviation Economics Researcher",
    avatar: "FA",
    quote:
      "The advance-purchase pricing curve and load factor multiplier provide a textbook example of airline revenue management in action. Truly impressive that everything runs seamlessly and persistently in the browser.",
    rating: 5,
    highlight: "Textbook revenue management",
  },
  {
    name: "Chukwudi Okafor",
    role: "Frequent Flyer & Tech Lead",
    avatar: "CO",
    quote:
      "From generating a unique PNR to testing itinerary modifications and calculating automated refund rates, the end-to-end simulation feels completely authentic.",
    rating: 5,
    highlight: "Completely authentic journey",
  },
];

export function TestimonialsSection() {
  return (
    <section aria-labelledby="testimonials-heading" className="container-wide section">
      <Reveal>
        <div className="text-center">
          <p className="overline text-accent">Passenger Feedback</p>
          <h2 id="testimonials-heading" className="mt-2 text-display font-semibold text-ink">
            Trusted by Frequent Flyers & Aviation Experts
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-lead text-ink-2">
            Engineered to deliver a seamless flight booking journey, realistic cabin comfort, and
            reliable scheduling.
          </p>
        </div>
      </Reveal>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {TESTIMONIALS.map((t, idx) => (
          <Reveal key={t.name} delay={idx * 80}>
            <div className="card flex h-full flex-col justify-between p-6 sm:p-8 transition-all hover:shadow-e2 text-center sm:text-left items-center sm:items-stretch">
              <div className="flex flex-col items-center sm:items-start w-full">
                {/* Rating stars */}
                <div className="flex items-center justify-center sm:justify-start gap-1 text-warn">
                  {[...Array(t.rating)].map((_, i) => (
                    <Icon key={i} name="sparkles" className="h-4 w-4 fill-current text-warn" />
                  ))}
                </div>

                <p className="mt-4 text-headline font-semibold text-ink">
                  &ldquo;{t.highlight}&rdquo;
                </p>

                <p className="mt-3 text-callout text-ink-2 italic leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>

              {/* User Identity */}
              <div className="mt-8 flex w-full items-center justify-center sm:justify-start gap-3 border-t border-line pt-4 text-left">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-footnote font-semibold text-on-accent">
                  {t.avatar}
                </span>
                <div>
                  <h4 className="text-footnote font-semibold text-ink">{t.name}</h4>
                  <p className="text-caption text-ink-3">{t.role}</p>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
