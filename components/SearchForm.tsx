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
import type { Airport, CabinClass, SearchCriteria } from "@/lib/types";
import { Field } from "./ui";
import { Icon } from "./icons";
import { useApp } from "./AppProvider";

const DEFAULTS: SearchCriteria = {
  originCode: "LOS",
  destinationCode: "ABV",
  departureDate: "",
  cabin: "economy",
  adults: 1,
  children: 0,
  infants: 0,
};

export function SearchForm({ initial }: { initial?: Partial<SearchCriteria> }) {
  const router = useRouter();
  const { ready } = useApp();
  const [airports, setAirports] = useState<Airport[]>([]);
  const [criteria, setCriteria] = useState<SearchCriteria>({
    ...DEFAULTS,
    departureDate: dateInputValue(1),
    ...initial,
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
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }

    const params = new URLSearchParams({
      from: criteria.originCode,
      to: criteria.destinationCode,
      date: criteria.departureDate,
      cabin: criteria.cabin,
      adults: String(criteria.adults),
      children: String(criteria.children),
      infants: String(criteria.infants),
    });
    router.push(`/search?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="card-lg">
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

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Departure date" htmlFor="departureDate" error={errors.departureDate}>
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
        <p className="max-w-md text-caption text-ink-3">
          Children are 2–11 years; infants under 2 travel on an adult&apos;s lap and are not
          allocated a seat.
        </p>
        <button type="submit" className="btn-primary w-full sm:w-auto sm:px-7">
          <Icon name="search" className="h-[1.15rem] w-[1.15rem]" />
          Search flights
        </button>
      </div>
    </form>
  );
}
