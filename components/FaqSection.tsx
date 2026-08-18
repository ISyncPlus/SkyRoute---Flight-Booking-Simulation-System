"use client";

import { useState } from "react";
import { Icon } from "./icons";
import { Reveal } from "./ui";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: "Is real money charged during booking?",
    answer:
      "No. SkyRoute operates as a self-contained system. All schedules, flight numbers, aircraft types, fares, and ticket references are securely managed locally. Payment cards are validated client-side without external payment gateway charges.",
  },
  {
    question: "How does SkyRoute persist bookings, schedules, and accounts?",
    answer:
      "The entire application runs client-side using browser localStorage. When you first load SkyRoute, an initial schedule covering 21 days of departures across 16 airports is generated and saved to your browser. Your bookings, registered accounts, and seat selections stay private and never leave your machine.",
  },
  {
    question: "How is dynamic pricing calculated for each flight?",
    answer:
      "Fares are calculated using a multi-factor revenue yield model based on base fare, advance purchase timeline (bookings made 30+ days ahead receive early-bird discounts while last-minute bookings surge by up to 50%), cabin load factor (as seats sell out, demand tiers trigger automatic price increases), cabin class multipliers, and seat selection tier fees.",
  },
  {
    question: "Can I manage, modify, or cancel my reservation?",
    answer:
      "Yes. Using your 6-character PNR (Passenger Name Record) or by logging into your account, you can view your full itemized itinerary, baggage allowances, and cabin seat assignments. You can also cancel your flight with automated refund calculation determined by hours remaining until scheduled departure.",
  },
  {
    question: "What capabilities does the Administrator account offer?",
    answer:
      "Logging in as the Administrator (admin@skyroute.sim) grants access to the Flight Operations Console. From there, you can add new flights to the schedule, edit departure/arrival timings, adjust base pricing, inspect global passenger reservations, and update flight schedules or status flags.",
  },
  {
    question: "How do I test with pre-seeded demonstration accounts?",
    answer:
      "SkyRoute comes pre-loaded with both a Customer account (customer@skyroute.sim / customer123) and an Administrator account (admin@skyroute.sim / admin123). You can sign in with either account instantly from the sign-in page without registration.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section aria-labelledby="faq-heading" className="container-wide section">
      <Reveal>
        <div className="text-center">
          <p className="overline text-accent">Frequently Asked Questions</p>
          <h2 id="faq-heading" className="mt-2 text-display font-semibold text-ink">
            Everything You Need to Know About SkyRoute
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-lead text-ink-2">
            Answers to common questions regarding booking policies, revenue management algorithms,
            and local data persistence.
          </p>
        </div>
      </Reveal>

      <div className="mx-auto mt-12 max-w-3xl space-y-4">
        {FAQS.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <Reveal key={faq.question} delay={idx * 50}>
              <div
                className={`overflow-hidden rounded-xl border transition-all duration-200 backdrop-blur-xl ${
                  isOpen
                    ? "border-line-strong bg-surface/90 shadow-e2"
                    : "border-line/70 bg-surface/80 hover:bg-surface/95 hover:border-line shadow-e1"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between p-5 text-left text-callout font-semibold text-ink sm:p-6"
                >
                  <span className="pr-4">{faq.question}</span>
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fill text-ink-2 transition-transform duration-300 ${
                      isOpen ? "rotate-180 bg-accent-soft text-accent-ink" : ""
                    }`}
                  >
                    <Icon name="chevronDown" className="h-4 w-4" />
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-line px-5 pb-6 pt-4 sm:px-6">
                    <p className="text-footnote leading-relaxed text-ink-2">{faq.answer}</p>
                  </div>
                )}
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
