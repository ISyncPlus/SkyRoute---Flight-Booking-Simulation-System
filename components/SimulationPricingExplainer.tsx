"use client";

import { useState } from "react";
import { Icon } from "./icons";
import { Reveal } from "./ui";
import {
  advancePurchaseFactor,
  demandFactor,
  CABIN_FACTORS,
  SEAT_FEES,
  VAT_RATE,
  SERVICE_CHARGE,
  formatMoney,
  roundFare,
} from "@/lib/pricing";
import type { CabinClass } from "@/lib/types";

export function SimulationPricingExplainer() {
  const [days, setDays] = useState<number>(14);
  const [loadPct, setLoadPct] = useState<number>(65);
  const [cabin, setCabin] = useState<CabinClass>("economy");
  const [seatType, setSeatType] = useState<keyof typeof SEAT_FEES | "none">("window");

  const baseFare = 65000;
  const load = loadPct / 100;
  const advFactor = advancePurchaseFactor(days);
  const dmdFactor = demandFactor(load);
  const cabinMult = CABIN_FACTORS[cabin];

  const rawFare = baseFare * advFactor * dmdFactor * cabinMult;
  const adultPassengerFare = roundFare(rawFare);
  const seatFeeAmount =
    cabin === "economy" && seatType !== "none" ? SEAT_FEES[seatType as keyof typeof SEAT_FEES] : 0;

  const taxable = adultPassengerFare + seatFeeAmount;
  const taxes = Math.round(taxable * VAT_RATE);
  const totalFare = taxable + taxes + SERVICE_CHARGE;

  return (
    <section aria-labelledby="pricing-engine-heading" className="container-wide section">
      <Reveal>
        <div className="text-center">
          <p className="overline text-accent">Algorithmic Transparency</p>
          <h2 id="pricing-engine-heading" className="mt-2 text-display font-semibold text-ink">
            How Dynamic Fares Work in SkyRoute
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-lead text-ink-2">
            Just like commercial airline revenue management systems, SkyRoute calculates fares
            in real time using advance purchase curves, cabin load factors, and seat tier premiums.
          </p>
        </div>
      </Reveal>

      <Reveal delay={100} className="mt-12">
        <div className="card-glass grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Controls Panel */}
          <div className="space-y-6">
            <h3 className="text-title-2 font-semibold text-ink text-center sm:text-left">
              Interactive Yield Calculator
            </h3>

            {/* Slider 1: Days to Departure */}
            <div>
              <div className="flex items-center justify-between text-footnote font-medium text-ink">
                <span>Days to Departure</span>
                <span className="font-mono font-semibold text-accent">
                  {days} {days === 1 ? "day" : "days"} (×{advFactor} factor)
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="mt-2.5 w-full accent-accent cursor-pointer"
              />
              <div className="flex justify-between text-micro text-ink-3">
                <span>0 days (Last minute: +50%)</span>
                <span>14 days (Standard)</span>
                <span>30+ days (-10% Early bird)</span>
              </div>
            </div>

            {/* Slider 2: Cabin Load */}
            <div>
              <div className="flex items-center justify-between text-footnote font-medium text-ink">
                <span>Cabin Load Factor</span>
                <span className="font-mono font-semibold text-accent">
                  {loadPct}% Occupied (×{dmdFactor} demand factor)
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={loadPct}
                onChange={(e) => setLoadPct(Number(e.target.value))}
                className="mt-2.5 w-full accent-accent cursor-pointer"
              />
              <div className="flex justify-between text-micro text-ink-3">
                <span>10% (Low demand)</span>
                <span>75% (Surge threshold)</span>
                <span>100% (Peak: +35%)</span>
              </div>
            </div>

            {/* Selector: Cabin Class */}
            <div>
              <label className="text-footnote font-medium text-ink">Cabin Class</label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(["economy", "business", "first"] as CabinClass[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCabin(c)}
                    aria-pressed={cabin === c}
                    className={`pressable rounded-lg border px-3 py-2 text-center text-footnote capitalize font-semibold ${
                      cabin === c
                        ? "border-accent bg-accent text-on-accent shadow-sm"
                        : "border-line bg-surface text-ink hover:bg-fill"
                    }`}
                  >
                    {c} (×{CABIN_FACTORS[c]})
                  </button>
                ))}
              </div>
            </div>

            {/* Selector: Seat Selection in Economy */}
            {cabin === "economy" && (
              <div>
                <label className="text-footnote font-medium text-ink">Selected Seat Tier</label>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { id: "none", label: "Random (Free)", fee: 0 },
                    { id: "middle", label: "Middle", fee: SEAT_FEES.middle },
                    { id: "aisle", label: "Aisle", fee: SEAT_FEES.aisle },
                    { id: "window", label: "Window", fee: SEAT_FEES.window },
                    { id: "exitRow", label: "Exit Row", fee: SEAT_FEES.exitRow },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSeatType(s.id as any)}
                      className={`pressable rounded-lg border p-2 text-center text-micro font-medium ${
                        seatType === s.id
                          ? "border-accent bg-accent/10 text-accent-ink font-semibold"
                          : "border-line bg-surface text-ink-2 hover:bg-fill"
                      }`}
                    >
                      <span>{s.label}</span>
                      <span className="block font-mono text-ink-3">
                        {s.fee ? `+₦${s.fee.toLocaleString()}` : "₦0"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Live Calculated Output Card */}
          <div className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-6 shadow-e2">
            <div>
              <div className="flex items-center justify-between border-b border-line pb-4">
                <span className="text-footnote font-semibold uppercase tracking-wider text-ink-3">
                  Live Fare Quote
                </span>
                <span className="badge bg-positive-soft text-positive-ink font-mono text-micro">
                  Real-time Yield
                </span>
              </div>

              <dl className="mt-5 space-y-3 text-footnote">
                <div className="flex justify-between">
                  <dt className="text-ink-2">Base Reference Fare</dt>
                  <dd className="font-mono text-ink">{formatMoney(baseFare)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-2">Advance Purchase Multiplier</dt>
                  <dd className="font-mono text-accent">× {advFactor.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-2">Demand Load Factor</dt>
                  <dd className="font-mono text-accent">× {dmdFactor.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-2">Cabin Upgrade Multiplier</dt>
                  <dd className="font-mono text-accent">× {cabinMult.toFixed(1)}</dd>
                </div>
                <div className="flex justify-between border-t border-line pt-2">
                  <dt className="font-medium text-ink">Derived Adult Airfare</dt>
                  <dd className="font-mono font-semibold text-ink">
                    {formatMoney(adultPassengerFare)}
                  </dd>
                </div>
                {seatFeeAmount > 0 && (
                  <div className="flex justify-between text-ink-2">
                    <dt>Seat Selection ({seatType})</dt>
                    <dd className="font-mono text-ink">+{formatMoney(seatFeeAmount)}</dd>
                  </div>
                )}
                <div className="flex justify-between text-ink-3">
                  <dt>Aviation VAT (7.5%)</dt>
                  <dd className="font-mono text-ink-2">+{formatMoney(taxes)}</dd>
                </div>
                <div className="flex justify-between text-ink-3">
                  <dt>Booking Service Charge</dt>
                  <dd className="font-mono text-ink-2">+{formatMoney(SERVICE_CHARGE)}</dd>
                </div>
              </dl>
            </div>

            <div className="mt-6 border-t border-line pt-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="block text-micro uppercase tracking-wide text-ink-3">
                    Total Price
                  </span>
                  <span className="font-mono text-title-1 font-semibold text-accent-ink">
                    {formatMoney(totalFare)}
                  </span>
                </div>
                <span className="text-micro text-ink-3 font-medium">All taxes & fees included</span>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
