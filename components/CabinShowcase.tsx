"use client";

import { useState } from "react";
import Image from "next/image";
import { Icon, type IconName } from "./icons";
import { Reveal } from "./ui";

interface CabinTier {
  id: "first" | "business" | "economy";
  name: string;
  badge: string;
  headline: string;
  description: string;
  image: string;
  features: { icon: IconName; label: string }[];
  specs: { label: string; value: string }[];
}

const CABIN_TIERS: CabinTier[] = [
  {
    id: "first",
    name: "First Class Suite",
    badge: "Flagship Luxury",
    headline: "Unrivalled Serenity in Private Enclosed Suites",
    description:
      "Engineered for true privacy with full-height sliding doors, ambient starlight ceilings, bespoke turn-down service, and five-course chef curation at 38,000 feet.",
    image: "/images/cabin-first-class.jpg",
    features: [
      { icon: "seat", label: "Full 180° lie-flat bed with memory foam mattress" },
      { icon: "sparkles", label: "32-inch 4K cinematic entertainment screen" },
      { icon: "food", label: "On-demand fine dining & sommelier cellar" },
      { icon: "luggage", label: "3 ｘ 32kg checked baggage + priority handling" },
      { icon: "wifi", label: "Unlimited high-speed in-flight satellite connectivity" },
      { icon: "shield", label: "Dedicated lounge access and fast-track security" },
    ],
    specs: [
      { label: "Seat Pitch", value: '82"' },
      { label: "Bed Width", value: '28"' },
      { label: "Layout", value: "1-2-1 / 1-1-1" },
      { label: "Power", value: "65W USB-C + Universal AC" },
    ],
  },
  {
    id: "business",
    name: "Business Class",
    badge: "Executive Standard",
    headline: "Direct Aisle Access with Sculpted Privacy",
    description:
      "Every seat offers direct aisle freedom, intuitive touch controls, customizable lumbar support, and dedicated workspaces designed for maximum productivity in flight.",
    image: "/images/cabin-business-class.jpg",
    features: [
      { icon: "seat", label: "Lie-flat seating with adjustable privacy partition" },
      { icon: "sparkles", label: "18-inch touch display with active noise cancellation" },
      { icon: "food", label: "Multi-course gourmet meal with artisanal snacks" },
      { icon: "luggage", label: "2 × 32kg checked bags + carry-on cabin bag" },
      { icon: "wifi", label: "Complimentary messaging and streaming Wi-Fi" },
      { icon: "shield", label: "Priority boarding and premium bag tags" },
    ],
    specs: [
      { label: "Seat Pitch", value: '76"' },
      { label: "Bed Width", value: '22"' },
      { label: "Layout", value: "1-2-1 Staggered" },
      { label: "Power", value: "Dual USB-C + AC" },
    ],
  },
  {
    id: "economy",
    name: "Economy Comfort",
    badge: "Everyday Excellence",
    headline: "Ergonomic Craftsmanship for Every Journey",
    description:
      "Redefining economy with contoured breathable upholstery, six-way adjustable headrests, USB-C rapid charging at every seat, and rich audio-visual entertainment.",
    image: "/images/cabin-economy-comfort.jpg",
    features: [
      { icon: "seat", label: "Ergonomic slimline seats with generous legroom" },
      { icon: "sparkles", label: "13.3-inch HD touch screen with 1,000+ hours of media" },
      { icon: "food", label: "Complimentary hot meals and beverage service" },
      { icon: "luggage", label: "2 × 23kg standard checked baggage" },
      { icon: "wifi", label: "High-speed in-flight Wi-Fi packages available" },
      { icon: "shield", label: "Dedicated overhead bin storage space" },
    ],
    specs: [
      { label: "Seat Pitch", value: '32"-34"' },
      { label: "Seat Width", value: '18"' },
      { label: "Layout", value: "3-3-3 / 3-3" },
      { label: "Power", value: "USB-A & USB-C at seat" },
    ],
  },
];

export function CabinShowcase() {
  const [selectedCabin, setSelectedCabin] = useState<"first" | "business" | "economy">("business");
  const current = CABIN_TIERS.find((c) => c.id === selectedCabin) ?? CABIN_TIERS[1];

  return (
    <section aria-labelledby="cabin-heading" className="container-wide section">
      <Reveal>
        <div className="text-center">
          <p className="overline text-accent">Elevated Onboard Comfort</p>
          <h2 id="cabin-heading" className="mt-2 text-display font-semibold text-ink">
            Experience Our Fleet Cabins
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-lead text-ink-2">
            Every aircraft in our fleet is configured with generous seat pitches, ergonomic contours,
            and tailored cabin class privileges.
          </p>
        </div>
      </Reveal>

      {/* Segmented Tier Switcher */}
      <Reveal delay={60} className="mt-10 flex justify-center px-4">
        <div className="segmented grid w-full max-w-sm grid-cols-2 gap-1.5 p-1.5 shadow-sm sm:inline-flex sm:w-auto sm:max-w-none sm:flex-row sm:flex-nowrap sm:gap-1">
          {CABIN_TIERS.map((tier, idx) => (
            <button
              key={tier.id}
              type="button"
              onClick={() => setSelectedCabin(tier.id)}
              aria-pressed={selectedCabin === tier.id}
              className={`segment whitespace-nowrap px-3.5 py-2.5 text-callout font-medium text-center transition-all ${
                idx === 2
                  ? "col-span-2 justify-self-center w-full sm:col-auto sm:justify-self-auto sm:w-auto sm:px-5"
                  : "w-full sm:w-auto sm:px-5"
              }`}
            >
              {tier.name}
            </button>
          ))}
        </div>
      </Reveal>

      {/* Cabin Details Showcase Card */}
      <Reveal delay={120} className="mt-10">
        <div className="card-glass grid overflow-hidden lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left: High-Res Cabin Photography */}
          <div className="relative min-h-[320px] w-full bg-fill sm:min-h-[420px] lg:min-h-[500px]">
            <Image
              src={current.image}
              alt={current.name}
              fill
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-cover transition-opacity duration-500"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-black/60" />
            <div className="absolute bottom-5 left-5 right-5 text-white">
              <span className="badge bg-white/20 text-white backdrop-blur-md">
                {current.badge}
              </span>
              <h3 className="mt-2 text-title-1 font-semibold text-white drop-shadow-md">
                {current.name}
              </h3>
            </div>
          </div>

          {/* Right: Cabin Features & Specifications */}
          <div className="flex flex-col justify-between p-6 sm:p-10 text-center sm:text-left items-center sm:items-stretch">
            <div className="w-full">
              <h4 className="text-title-2 font-semibold text-ink">{current.headline}</h4>
              <p className="mt-3 text-callout text-ink-2">{current.description}</p>

              {/* Feature Checklist */}
              <ul className="mt-8 space-y-3.5 text-left inline-block sm:block">
                {current.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-footnote text-ink">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
                      <Icon name="check" size={12} />
                    </span>
                    <span className="font-medium text-ink-2">{feature.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Spec Matrix Grid */}
            <div className="mt-8 grid grid-cols-2 gap-3 border-t border-line pt-6 sm:grid-cols-4 w-full">
              {current.specs.map((spec) => (
                <div key={spec.label} className="rounded-lg bg-surface/70 p-3 border border-line text-center sm:text-left">
                  <dt className="text-micro uppercase text-ink-3">{spec.label}</dt>
                  <dd className="mt-1 font-mono text-footnote font-semibold text-ink">
                    {spec.value}
                  </dd>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
