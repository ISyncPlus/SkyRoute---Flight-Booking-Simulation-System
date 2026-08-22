"use client";

/**
 * Flight search form.
 * Client-side validated, then serialised into the URL query string so that a
 * result page can be bookmarked, shared or reloaded without losing state.
 */

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { listAirports } from "@/lib/repository";
import { validateSearch, CABIN_LABELS } from "@/lib/validation";
import { dateInputValue } from "@/lib/format";
import type { Airport, CabinClass, SearchCriteria, SearchLeg, TripType } from "@/lib/types";
import { TRIP_TYPE_LABELS } from "@/lib/types";
import { Field } from "./ui";
import { Icon } from "./icons";
import { useApp } from "./AppProvider";

const DEFAULTS: SearchCriteria = {
  originCode: "LOS",
  destinationCode: "ABV",
  departureDate: "",
  tripType: "round-trip",
  cabin: "economy",
  adults: 1,
  children: 0,
  infants: 0,
};

const TRIP_TYPES: TripType[] = ["round-trip", "one-way", "multi-city"];

/** Multi-city is capped so the form cannot grow past what one screen holds. */
const MAX_LEGS = 5;

/** Offset a YYYY-MM-DD date, clamped to the end of the published schedule. */
function addDays(date: string, days: number): string {
  const start = date ? new Date(`${date}T00:00:00`) : new Date();
  start.setDate(start.getDate() + days);
  const shifted = start.toISOString().slice(0, 10);
  const latest = dateInputValue(20);
  return shifted > latest ? latest : shifted;
}

export function SearchForm({ initial }: { initial?: Partial<SearchCriteria> }) {
  const router = useRouter();
  const { ready } = useApp();
  const [airports, setAirports] = useState<Airport[]>([]);
  const [criteria, setCriteria] = useState<SearchCriteria>(() => {
    const base: SearchCriteria = { ...DEFAULTS, departureDate: dateInputValue(1), ...initial };
    // The form opens on Round trip, so it has to open with a return date in
    // it too — seeding only on click left the default state showing an empty
    // field the traveller had not done anything to empty.
    if ((base.tripType ?? "one-way") === "round-trip" && !base.returnDate) {
      base.returnDate = dateInputValue(8);
    }
    return base;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  /** Drives the swap control's rotation — each press turns it over again. */
  const [swaps, setSwaps] = useState(0);

  useEffect(() => {
    if (ready) setAirports(listAirports());
  }, [ready]);

  const sortedAirports = useMemo(
    () => [...airports].sort((a, b) => a.city.localeCompare(b.city)),
    [airports],
  );

  function update<K extends keyof SearchCriteria>(key: K, value: SearchCriteria[K]) {
    setCriteria((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key as string];
      return next;
    });
  }

  const tripType: TripType = criteria.tripType ?? "one-way";
  const extraLegs = criteria.extraLegs ?? [];

  /**
   * Switching trip type only ever *adds* the fields that type needs; the ones
   * it does not need are left in state rather than cleared, so flicking
   * between Round trip and One way does not throw away a return date the
   * traveller already picked.
   */
  function changeTripType(next: TripType) {
    setCriteria((current) => {
      const base = { ...current, tripType: next };
      if (next === "round-trip" && !base.returnDate) {
        base.returnDate = addDays(base.departureDate, 7);
      }
      if (next === "multi-city" && !base.extraLegs?.length) {
        base.extraLegs = [
          {
            originCode: base.destinationCode,
            destinationCode: base.originCode,
            departureDate: addDays(base.departureDate, 3),
          },
        ];
      }
      return base;
    });
    setErrors({});
  }

  function updateLeg<K extends keyof SearchLeg>(index: number, key: K, value: SearchLeg[K]) {
    setCriteria((current) => ({
      ...current,
      extraLegs: (current.extraLegs ?? []).map((leg, position) =>
        position === index ? { ...leg, [key]: value } : leg,
      ),
    }));
  }

  function addLeg() {
    setCriteria((current) => {
      const legs = current.extraLegs ?? [];
      const last = legs[legs.length - 1];
      // A new leg starts where the previous one landed, and heads back to
      // where that leg set off from. Using the *first* origin instead sent
      // the third flight from Lagos to Lagos.
      const originCode = last?.destinationCode ?? current.destinationCode;
      const preferred = last?.originCode ?? current.originCode;
      const destinationCode =
        preferred !== originCode
          ? preferred
          : (sortedAirports.find((airport) => airport.code !== originCode)?.code ?? originCode);

      return {
        ...current,
        extraLegs: [
          ...legs,
          {
            originCode,
            destinationCode,
            departureDate: addDays(last?.departureDate ?? current.departureDate, 3),
          },
        ],
      };
    });
  }

  function removeLeg(index: number) {
    setCriteria((current) => ({
      ...current,
      extraLegs: (current.extraLegs ?? []).filter((_, position) => position !== index),
    }));
  }

  function swapAirports() {
    setCriteria((current) => ({
      ...current,
      originCode: current.destinationCode,
      destinationCode: current.originCode,
    }));
    setSwaps((count) => count + 1);
    setErrors({});
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = validateSearch(criteria);
    const extra: Record<string, string> = { ...result.errors };

    if (tripType === "round-trip") {
      if (!criteria.returnDate) extra.returnDate = "Choose a return date.";
      else if (criteria.returnDate < criteria.departureDate) {
        extra.returnDate = "The return cannot be before the departure.";
      }
    }

    if (tripType === "multi-city") {
      extraLegs.forEach((leg, index) => {
        if (leg.originCode === leg.destinationCode) {
          extra.extraLegs = `Flight ${index + 2} departs and arrives at the same airport.`;
        }
      });
    }

    if (Object.keys(extra).length > 0) {
      setErrors(extra);
      return;
    }

    const params = new URLSearchParams();
    params.set("route", `${criteria.originCode}-${criteria.destinationCode}`);
    if (criteria.departureDate) params.set("date", criteria.departureDate);

    if (tripType === "round-trip" && criteria.returnDate) {
      params.set("return", criteria.returnDate);
    } else if (tripType === "multi-city" && extraLegs.length > 0) {
      params.set(
        "legs",
        extraLegs
          .map((leg) => `${leg.originCode}-${leg.destinationCode}-${leg.departureDate}`)
          .join(","),
      );
    }

    if (criteria.cabin !== "economy") {
      params.set("cabin", criteria.cabin);
    }
    if (criteria.adults > 1) {
      params.set("adults", String(criteria.adults));
    }
    if (criteria.children > 0) {
      params.set("children", String(criteria.children));
    }
    if (criteria.infants > 0) {
      params.set("infants", String(criteria.infants));
    }
    router.push(`/search?${params.toString()}`);

  }

  return (
    <form onSubmit={handleSubmit} noValidate className="card-lg">
      <div className="mb-6 flex justify-center sm:justify-start">
        <div
          role="radiogroup"
          aria-label="Trip type"
          className="segmented inline-flex max-w-full overflow-x-auto"
        >
          {TRIP_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={tripType === type}
              onClick={() => changeTripType(type)}
              className="segment whitespace-nowrap"
            >
              {TRIP_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr]">
        <Field label="From" htmlFor="originCode" error={errors.originCode}>
          <select
            id="originCode"
            className={`input ${errors.originCode ? "input-error" : ""}`}
            value={criteria.originCode}
            onChange={(event) => update("originCode", event.target.value)}
          >
            {sortedAirports.map((airport) => (
              <option key={airport.code} value={airport.code}>
                {airport.city} ({airport.code}) - {airport.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="flex justify-center md:self-end md:pb-0.5">
          <button
            type="button"
            onClick={swapAirports}
            aria-label="Swap departure and arrival airports"
            className="pressable hover-fill flex h-10 w-10 items-center justify-center rounded-full border border-line-strong bg-surface text-ink-2"
          >
            <span
              aria-hidden="true"
              className="swap-icon flex"
              style={{ "--swap-rot": `${swaps * 180}deg` } as React.CSSProperties}
            >
              <Icon name="swap" className="h-[1.15rem] w-[1.15rem]" />
            </span>
          </button>
        </div>

        <Field label="To" htmlFor="destinationCode" error={errors.destinationCode}>
          <select
            id="destinationCode"
            className={`input ${errors.destinationCode ? "input-error" : ""}`}
            value={criteria.destinationCode}
            onChange={(event) => update("destinationCode", event.target.value)}
          >
            {sortedAirports.map((airport) => (
              <option key={airport.code} value={airport.code}>
                {airport.city} ({airport.code}) - {airport.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {tripType === "multi-city" && (
        <div className="mt-4 space-y-3">
          {extraLegs.map((leg, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-xl border border-line bg-fill p-4 md:grid-cols-[1fr_1fr_1fr_auto]"
            >
              <Field label={`Flight ${index + 2} from`} htmlFor={`leg-${index}-from`}>
                <select
                  id={`leg-${index}-from`}
                  className="input"
                  value={leg.originCode}
                  onChange={(event) => updateLeg(index, "originCode", event.target.value)}
                >
                  {sortedAirports.map((airport) => (
                    <option key={airport.code} value={airport.code}>
                      {airport.city} ({airport.code})
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="To" htmlFor={`leg-${index}-to`}>
                <select
                  id={`leg-${index}-to`}
                  className="input"
                  value={leg.destinationCode}
                  onChange={(event) => updateLeg(index, "destinationCode", event.target.value)}
                >
                  {sortedAirports.map((airport) => (
                    <option key={airport.code} value={airport.code}>
                      {airport.city} ({airport.code})
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Date" htmlFor={`leg-${index}-date`}>
                <input
                  id={`leg-${index}-date`}
                  type="date"
                  className="input"
                  value={leg.departureDate}
                  min={dateInputValue(0)}
                  max={dateInputValue(20)}
                  onChange={(event) => updateLeg(index, "departureDate", event.target.value)}
                />
              </Field>

              <div className="flex md:items-end md:pb-0.5">
                <button
                  type="button"
                  onClick={() => removeLeg(index)}
                  aria-label={`Remove flight ${index + 2}`}
                  className="pressable hover-fill flex h-10 w-10 items-center justify-center rounded-full border border-line-strong bg-surface text-ink-2"
                >
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          {extraLegs.length + 1 < MAX_LEGS && (
            <button type="button" onClick={addLeg} className="btn-secondary">
              <Icon name="plus" className="h-4 w-4" />
              Add another flight
            </button>
          )}
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field
          label={tripType === "multi-city" ? "Flight 1 date" : "Departure date"}
          htmlFor="departureDate"
          error={errors.departureDate}
        >
          <input
            id="departureDate"
            type="date"
            className={`input ${errors.departureDate ? "input-error" : ""}`}
            value={criteria.departureDate}
            min={dateInputValue(0)}
            max={dateInputValue(20)}
            onChange={(event) => update("departureDate", event.target.value)}
          />
        </Field>

        {tripType === "round-trip" && (
          <Field label="Return date" htmlFor="returnDate" error={errors.returnDate}>
            <input
              id="returnDate"
              type="date"
              className={`input ${errors.returnDate ? "input-error" : ""}`}
              value={criteria.returnDate ?? ""}
              /* Cannot come back before setting off. */
              min={criteria.departureDate || dateInputValue(0)}
              max={dateInputValue(20)}
              onChange={(event) => update("returnDate", event.target.value)}
            />
          </Field>
        )}

        <Field label="Cabin class" htmlFor="cabin">
          <select
            id="cabin"
            className="input"
            value={criteria.cabin}
            onChange={(event) => update("cabin", event.target.value as CabinClass)}
          >
            {(Object.keys(CABIN_LABELS) as CabinClass[]).map((cabin) => (
              <option key={cabin} value={cabin}>
                {CABIN_LABELS[cabin]}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-3 gap-2 sm:col-span-2 lg:col-span-1">
          <Field label="Adults" htmlFor="adults" error={errors.adults}>
            <select
              id="adults"
              className={`input ${errors.adults ? "input-error" : ""}`}
              value={criteria.adults}
              onChange={(event) => update("adults", Number(event.target.value))}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Children" htmlFor="children">
            <select
              id="children"
              className="input"
              value={criteria.children}
              onChange={(event) => update("children", Number(event.target.value))}
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Infants" htmlFor="infants" error={errors.infants}>
            <select
              id="infants"
              className={`input ${errors.infants ? "input-error" : ""}`}
              value={criteria.infants}
              onChange={(event) => update("infants", Number(event.target.value))}
            >
              {[0, 1, 2, 3, 4].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-caption text-ink-3 text-center sm:text-left">
          Children are 2–11 years; infants under 2 travel on an adult&apos;s lap and are not
          allocated a seat.
        </p>
        <button type="submit" className="btn-primary w-full sm:w-auto sm:px-7 justify-center">
          <Icon name="search" className="h-[1.15rem] w-[1.15rem]" />
          Search flights
        </button>
      </div>
    </form>
  );
}
