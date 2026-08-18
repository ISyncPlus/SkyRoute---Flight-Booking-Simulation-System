"use client";

import { useState } from "react";
import { Icon } from "./icons";
import { Reveal } from "./ui";

interface AircraftModel {
  id: string;
  name: string;
  category: string;
  rangeKm: string;
  cruiseSpeed: string;
  capacity: string;
  cabinClasses: string;
  description: string;
  badge: string;
  primaryRoutes: string[];
}

const FLEET: AircraftModel[] = [
  {
    id: "b787-9",
    name: "Boeing 787-9 Dreamliner",
    category: "Long-Haul Flagship Widebody",
    rangeKm: "14,140 km",
    cruiseSpeed: "Mach 0.85 (903 km/h)",
    capacity: "290 Passengers",
    cabinClasses: "3-Class (First, Business, Economy)",
    badge: "Ultra Long Range",
    description:
      "Advanced composite airframe with electrochromic dimmable windows, lower cabin altitude pressurization, and quieter GE GEnx engines for long-haul routes.",
    primaryRoutes: ["Lagos (LOS) ⇄ London (LHR)", "Abuja (ABV) ⇄ Dubai (DXB)"],
  },
  {
    id: "a330-300",
    name: "Airbus A330-300",
    category: "Widebody Intercontinental",
    rangeKm: "11,750 km",
    cruiseSpeed: "Mach 0.82 (871 km/h)",
    capacity: "277 Passengers",
    cabinClasses: "3-Class (First, Business, Economy)",
    badge: "High Capacity",
    description:
      "Proven twin-aisle widebody platform featuring spacious overhead stowage, quiet cabin acoustics, and high cargo payload capacity for intercontinental connections.",
    primaryRoutes: ["Lagos (LOS) ⇄ Paris (CDG)", "Kano (KAN) ⇄ Cairo (CAI)"],
  },
  {
    id: "b737-800",
    name: "Boeing 737-800",
    category: "Narrowbody Workhorse",
    rangeKm: "5,436 km",
    cruiseSpeed: "Mach 0.79 (842 km/h)",
    capacity: "162 Passengers",
    cabinClasses: "2-Class (Business, Economy)",
    badge: "High Frequency",
    description:
      "The backbone of domestic and regional aviation. Optimized for rapid turnarounds, high dispatch reliability, and efficient fuel burn across busy city pairs.",
    primaryRoutes: ["Lagos (LOS) ⇄ Abuja (ABV)", "Port Harcourt (PHC) ⇄ Lagos (LOS)"],
  },
  {
    id: "e175",
    name: "Embraer E175",
    category: "Advanced Regional Jet",
    rangeKm: "3,982 km",
    cruiseSpeed: "Mach 0.78 (828 km/h)",
    capacity: "68 Passengers",
    cabinClasses: "2-Class (Business, Economy)",
    badge: "Regional Feeder",
    description:
      "No middle seats anywhere in the cabin. 2-2 cross-section offers guaranteed window or aisle comfort on regional and secondary hub connections.",
    primaryRoutes: ["Port Harcourt (PHC) ⇄ Accra (ACC)", "Enugu (ENU) ⇄ Abuja (ABV)"],
  },
];

export function FleetShowcase() {
  const [activeAircraft, setActiveAircraft] = useState<string>("b787-9");
  const plane = FLEET.find((f) => f.id === activeAircraft) ?? FLEET[0];

  return (
    <section aria-labelledby="fleet-heading" className="container-wide section">
      <Reveal>
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="overline text-accent">Simulated Fleet Specifications</p>
            <h2 id="fleet-heading" className="mt-2 text-display font-semibold text-ink">
              Engineered for Modern Aviation
            </h2>
            <p className="mt-3 max-w-2xl text-lead text-ink-2">
              Our simulation accurately configures seat maps, cabin layouts, and pricing algorithms
              across four distinct commercial aircraft families.
            </p>
          </div>
        </div>
      </Reveal>

      {/* Aircraft Selector Tabs */}
      <Reveal delay={60} className="mt-10">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {FLEET.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveAircraft(f.id)}
              aria-pressed={activeAircraft === f.id}
              className={`pressable flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
                activeAircraft === f.id
                  ? "border-accent bg-accent/5 shadow-e1 ring-1 ring-accent"
                  : "border-line bg-surface hover:border-line-strong"
              }`}
            >
              <span className="badge bg-accent-soft text-accent-ink text-micro font-semibold">
                {f.badge}
              </span>
              <span className="mt-2 text-callout font-semibold text-ink">{f.name}</span>
              <span className="mt-1 text-caption text-ink-3">{f.category}</span>
            </button>
          ))}
        </div>
      </Reveal>

      {/* Active Aircraft Detail Card */}
      <Reveal delay={120} className="mt-8">
        <div className="card-glass p-6 sm:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-title-1 font-semibold text-ink">{plane.name}</h3>
                <span className="badge border border-line bg-surface text-ink-2 font-medium">
                  {plane.category}
                </span>
              </div>

              <p className="mt-4 text-lead text-ink-2">{plane.description}</p>

              {/* Primary Routes */}
              <div className="mt-6">
                <p className="text-footnote font-semibold text-ink">Scheduled Simulation Routes:</p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {plane.primaryRoutes.map((route, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-md bg-fill px-3 py-1.5 font-mono text-footnote text-ink-2 border border-line"
                    >
                      <Icon name="plane" className="h-3.5 w-3.5 text-accent" />
                      {route}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Spec Matrix */}
            <div className="grid grid-cols-2 gap-4 rounded-2xl border border-line bg-surface/80 p-5 shadow-sm">
              <div className="border-b border-r border-line pb-4 pr-4">
                <dt className="text-micro uppercase tracking-wider text-ink-3">Max Range</dt>
                <dd className="mt-1 font-mono text-title-3 font-semibold text-ink">
                  {plane.rangeKm}
                </dd>
              </div>

              <div className="border-b border-line pb-4 pl-2">
                <dt className="text-micro uppercase tracking-wider text-ink-3">Cruise Speed</dt>
                <dd className="mt-1 font-mono text-title-3 font-semibold text-ink">
                  {plane.cruiseSpeed}
                </dd>
              </div>

              <div className="border-r border-line pr-4 pt-4">
                <dt className="text-micro uppercase tracking-wider text-ink-3">Capacity</dt>
                <dd className="mt-1 font-mono text-title-3 font-semibold text-ink">
                  {plane.capacity}
                </dd>
              </div>

              <div className="pl-2 pt-4">
                <dt className="text-micro uppercase tracking-wider text-ink-3">Cabin Layout</dt>
                <dd className="mt-1 text-footnote font-medium text-ink-2">
                  {plane.cabinClasses}
                </dd>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
