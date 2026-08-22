"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "./icons";
import { Reveal } from "./ui";
import { dateInputValue } from "@/lib/format";

interface DestinationCard {
  id: string;
  originCity: string;
  originCode: string;
  destCity: string;
  destCode: string;
  country: string;
  image: string;
  flightTime: string;
  aircraft: string;
  startingFare: string;
  tag: string;
  featured?: boolean;
}

const DESTINATIONS: DestinationCard[] = [
  {
    id: "los-lhr",
    originCity: "Lagos",
    originCode: "LOS",
    destCity: "London",
    destCode: "LHR",
    country: "United Kingdom",
    image: "/images/dest-london.jpg",
    flightTime: "6h 40m",
    aircraft: "Boeing 787-9 Dreamliner",
    startingFare: "₦1,180,000",
    tag: "Flagship Route",
    featured: true,
  },
  {
    id: "los-dxb",
    originCity: "Lagos",
    originCode: "LOS",
    destCity: "Dubai",
    destCode: "DXB",
    country: "United Arab Emirates",
    image: "/images/dest-dubai.jpg",
    flightTime: "7h 15m",
    aircraft: "Boeing 777-300ER",
    startingFare: "₦1,050,000",
    tag: "High Demand",
    featured: true,
  },
  {
    id: "los-cdg",
    originCity: "Lagos",
    originCode: "LOS",
    destCity: "Paris",
    destCode: "CDG",
    country: "France",
    image: "/images/dest-paris.jpg",
    flightTime: "6h 30m",
    aircraft: "Airbus A330-300",
    startingFare: "₦1,120,000",
    tag: "Popular",
    featured: true,
  },
  {
    id: "abv-los",
    originCity: "Abuja",
    originCode: "ABV",
    destCity: "Lagos",
    destCode: "LOS",
    country: "Nigeria",
    image: "/images/dest-lagos.jpg",
    flightTime: "1h 10m",
    aircraft: "Boeing 737-800",
    startingFare: "₦118,000",
    tag: "Frequent Shuttle",
    featured: true,
  },
];

export function DestinationShowcase() {
  const tomorrow = dateInputValue(1);

  return (
    <section id="destinations" aria-labelledby="destinations-heading" className="container-wide section scroll-mt-24">
      <div className="flex flex-col items-center text-center justify-between gap-6 md:flex-row md:items-end md:text-left">
        <Reveal>
          <div>
            <p className="overline text-accent">Global Route Network</p>
            <h2 id="destinations-heading" className="mt-2 text-display font-semibold text-ink">
              Explore Popular Routes & Hubs
            </h2>
            <p className="mx-auto md:mx-0 mt-3 max-w-2xl text-lead text-ink-2">
              From high-density regional shuttles to intercontinental long-haul flagships. Select any
              destination to experience dynamic pricing across scheduled dates.
            </p>
          </div>
        </Reveal>
        <Reveal delay={80} className="w-full md:w-auto flex justify-center md:justify-end">
          <Link href="/search" className="btn-secondary w-full sm:w-auto text-center justify-center whitespace-nowrap">
            <Icon name="search" className="h-4 w-4 text-accent" />
            Browse all 16 airports
          </Link>
        </Reveal>
      </div>

      <div className="mt-10 sm:mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {DESTINATIONS.map((dest, idx) => (
          <Reveal key={dest.id} delay={idx * 70}>
            <div className="card group relative flex h-full flex-col overflow-hidden p-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-e3">
              {/* Destination Image with Gradient Overlay */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-fill">
                <Image
                  src={dest.image}
                  alt={`${dest.destCity}, ${dest.country}`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  priority={idx < 2}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                
                {/* Top Badge */}
                <div className="absolute left-3 top-3">
                  <span className="badge bg-surface/90 text-micro font-semibold text-ink backdrop-blur-md shadow-sm">
                    {dest.tag}
                  </span>
                </div>

                {/* Bottom Overlay Text */}
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <p className="text-micro uppercase tracking-wider text-white/80">{dest.country}</p>
                  <h3 className="text-title-3 font-semibold text-white drop-shadow-sm">
                    {dest.destCity}
                  </h3>
                </div>
              </div>

              {/* Card Body Details */}
              <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
                <div>
                  <div className="flex items-center justify-between text-footnote font-semibold text-ink">
                    <span className="flex items-center gap-1.5 font-mono text-ink">
                      {dest.originCode}
                      <Icon name="arrowRight" className="h-3.5 w-3.5 text-accent" />
                      {dest.destCode}
                    </span>
                    <span className="text-caption font-normal text-ink-3">
                      {dest.flightTime} · Direct
                    </span>
                  </div>

                  <p className="mt-2 text-micro text-ink-3">
                    Operated by <span className="font-medium text-ink-2">{dest.aircraft}</span>
                  </p>
                </div>

                <div className="mt-6 flex items-end justify-between gap-3 border-t border-line/70 pt-4">
                  <div className="flex flex-col justify-end">
                    <span className="text-micro font-medium uppercase tracking-wider text-ink-3">
                      From
                    </span>
                    <span className="font-mono text-callout sm:text-headline font-semibold text-ink leading-none mt-1">
                      {dest.startingFare}
                    </span>
                  </div>
                  <Link
                    href={`/search?from=${dest.originCode}&to=${dest.destCode}&date=${tomorrow}&cabin=economy&adults=1`}
                    className="btn-primary shrink-0 px-3.5 py-2 text-caption shadow-none inline-flex items-center gap-1.5"
                    aria-label={`Search flights from ${dest.originCity} to ${dest.destCity}`}
                  >
                    <span>Fly route</span>
                    <Icon name="arrowRight" className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
