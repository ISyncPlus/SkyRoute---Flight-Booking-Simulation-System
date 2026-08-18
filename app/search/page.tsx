"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { FlightCard } from "@/components/FlightCard";
import { SearchForm } from "@/components/SearchForm";
import { Alert, EmptyState, Spinner } from "@/components/ui";
import { Icon } from "@/components/icons";
import { datesWithFlights, searchFlights } from "@/lib/repository";
import { CABIN_NAMES, formatDate, formatDateShort } from "@/lib/format";
import { validateSearch } from "@/lib/validation";
import { useRouter } from "next/navigation";
import type { CabinClass, FlightSearchResult, SearchCriteria, SearchLeg, TripType } from "@/lib/types";
import { TRIP_TYPE_LABELS } from "@/lib/types";

type SortKey = "departure" | "price" | "duration" | "arrival";

const SORT_LABELS: Record<SortKey, string> = {
  departure: "Departure time",
  price: "Lowest price",
  duration: "Shortest flight",
  arrival: "Arrival time",
};

/** Long enough for the last staggered card to finish. */
const STAGGER_WINDOW_MS = 700;

function SearchResults() {
  const params = useSearchParams();
  const router = useRouter();
  const { ready, revision } = useApp();

  const tripType = (params.get("trip") as TripType | null) ?? "one-way";

  /**
   * The journey flattened into the legs the traveller has to fill, whatever
   * kind of trip it is. A one-way search is simply a journey of one, so the
   * selection machinery below has no special case for it.
   */
  const legs = useMemo<SearchLeg[]>(() => {
    const from = (params.get("from") ?? "").toUpperCase();
    const to = (params.get("to") ?? "").toUpperCase();
    const date = params.get("date") ?? "";
    const first: SearchLeg = { originCode: from, destinationCode: to, departureDate: date };

    if (tripType === "round-trip") {
      const back = params.get("return") ?? "";
      // Without a return date there is no second leg to choose, so it stays a
      // one-leg journey rather than rendering an unfillable step.
      return back
        ? [first, { originCode: to, destinationCode: from, departureDate: back }]
        : [first];
    }

    if (tripType === "multi-city") {
      const encoded = params.get("legs") ?? "";
      const extra = encoded
        .split(",")
        .map((chunk) => chunk.trim())
        .filter(Boolean)
        .map((chunk) => {
          // `LOS-ABV-2026-08-20` — split off the two codes, the rest is the date.
          const [originCode, destinationCode, ...rest] = chunk.split("-");
          return { originCode, destinationCode, departureDate: rest.join("-") };
        })
        .filter((leg) => leg.originCode && leg.destinationCode && leg.departureDate);
      return [first, ...extra];
    }

    return [first];
  }, [params, tripType]);

  /** One chosen flight id per leg; `null` until that leg is filled. */
  const [picked, setPicked] = useState<(string | null)[]>([]);
  const [activeLeg, setActiveLeg] = useState(0);
  const multiLeg = legs.length > 1;

  const criteria = useMemo<SearchCriteria>(
    () => ({
      // Results are always for whichever leg is being filled right now.
      originCode: legs[activeLeg]?.originCode ?? "",
      destinationCode: legs[activeLeg]?.destinationCode ?? "",
      departureDate: legs[activeLeg]?.departureDate ?? "",
      cabin: (params.get("cabin") ?? "economy") as CabinClass,
      adults: Math.max(1, Number(params.get("adults") ?? 1) || 1),
      children: Math.max(0, Number(params.get("children") ?? 0) || 0),
      infants: Math.max(0, Number(params.get("infants") ?? 0) || 0),
    }),
    [params, legs, activeLeg],
  );

  const [results, setResults] = useState<FlightSearchResult[]>([]);
  const [alternativeDates, setAlternativeDates] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>("departure");
  const [airlineFilter, setAirlineFilter] = useState<string>("all");
  const [editing, setEditing] = useState(false);

  const validation = useMemo(() => validateSearch(criteria), [criteria]);
  const searchKey = params.toString();

  /**
   * The entrance belongs to the search, not to the list. Sorting and filtering
   * reorder the same cards many times in a row; replaying the stagger on every
   * one of those would fight the user. The classes come off once the animation
   * has run, so a later reorder has nothing left to restart.
   */
  const [entering, setEntering] = useState(true);
  useEffect(() => {
    setEntering(true);
    const timer = setTimeout(() => setEntering(false), STAGGER_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [searchKey]);

  useEffect(() => {
    if (!ready || !validation.valid) return;
    setResults(searchFlights(criteria));
    setAlternativeDates(
      datesWithFlights(criteria.originCode, criteria.destinationCode).filter(
        (date) => date !== criteria.departureDate,
      ),
    );
  }, [ready, criteria, validation.valid, revision]);

  // Reset the picks whenever the journey itself changes, so a new search never
  // inherits a flight chosen for a different route.
  useEffect(() => {
    setPicked(legs.map(() => null));
    setActiveLeg(0);
  }, [legs]);

  /**
   * Record a choice for the leg being filled. If a later leg is still empty we
   * move to it; once every leg has a flight we hand the whole journey to the
   * wizard as a comma-joined path, which is the shape `/book/[flightId]`
   * already understands.
   */
  function chooseFlight(flightId: string) {
    const next = legs.map((_, index) => (index === activeLeg ? flightId : (picked[index] ?? null)));
    setPicked(next);

    const unfilled = next.findIndex((entry) => entry === null);
    if (unfilled !== -1) {
      setActiveLeg(unfilled);
      window.scrollTo({ top: 0 });
      return;
    }

    const forward = new URLSearchParams({
      trip: tripType,
      cabin: criteria.cabin,
      adults: String(criteria.adults),
      children: String(criteria.children),
      infants: String(criteria.infants),
    });
    const path = next.map((id) => encodeURIComponent(id as string)).join(",");
    router.push(`/book/${path}?${forward.toString()}`);
  }

  const airlines = useMemo(
    () => [...new Set(results.map((result) => result.flight.airline))].sort(),
    [results],
  );

  const visible = useMemo(() => {
    const filtered =
      airlineFilter === "all"
        ? results
        : results.filter((result) => result.flight.airline === airlineFilter);

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "price":
          return a.pricePerAdult - b.pricePerAdult;
        case "duration":
          return a.flight.durationMinutes - b.flight.durationMinutes;
        case "arrival":
          return new Date(a.flight.arrivalTime).getTime() - new Date(b.flight.arrivalTime).getTime();
        default:
          return (
            new Date(a.flight.departureTime).getTime() - new Date(b.flight.departureTime).getTime()
          );
      }
    });
  }, [results, airlineFilter, sort]);

  if (!validation.valid) {
    return (
      <div className="container-page">
        <div className="mb-6">
          <Alert tone="error" title="That search is not valid">
            <ul className="mt-1 list-inside list-disc">
              {Object.values(validation.errors).map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </Alert>
        </div>
        <SearchForm initial={criteria} />
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="container-page">
        <Spinner label="Loading the schedule" />
      </div>
    );
  }

  const passengerCount = criteria.adults + criteria.children + criteria.infants;

  return (
    <div className="container-page">
      <nav
        aria-label="Breadcrumb"
        className="mb-4 flex items-center gap-1.5 text-caption text-ink-3"
      >
        <Link href="/" className="hover:text-ink hover:underline">
          Search
        </Link>
        <Icon name="chevronRight" className="h-3.5 w-3.5" />
        <span className="font-medium text-ink-2">Results</span>
      </nav>

      {multiLeg && (
        /* Which flight of the journey is being chosen, and which are already
           settled. Filled legs stay clickable so a choice can be revisited
           without starting the search again. */
        <div className="card-lg mb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="overline text-ink-3">{TRIP_TYPE_LABELS[tripType]}</p>
            <p className="text-caption text-ink-3">
              {picked.filter(Boolean).length} of {legs.length} flights chosen
            </p>
          </div>
          <ol className="mt-3 flex flex-wrap gap-2">
            {legs.map((leg, index) => {
              const done = Boolean(picked[index]);
              const current = index === activeLeg;
              return (
                <li key={`${leg.originCode}-${leg.destinationCode}-${index}`}>
                  <button
                    type="button"
                    onClick={() => setActiveLeg(index)}
                    aria-current={current ? "step" : undefined}
                    className={`pressable flex items-center gap-2 rounded-lg border px-3 py-2 text-footnote font-medium ${
                      current
                        ? "border-accent bg-accent-soft text-accent-ink"
                        : done
                          ? "border-line bg-fill text-ink-2"
                          : "border-line bg-surface text-ink-3"
                    }`}
                  >
                    {done && <Icon name="checkCircle" className="h-4 w-4 text-positive" />}
                    <span>
                      {leg.originCode} → {leg.destinationCode}
                    </span>
                    <span className="text-caption font-normal text-ink-3">
                      {formatDateShort(`${leg.departureDate}T00:00:00`)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <div className="card-lg mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {multiLeg && (
            <p className="mb-1 text-caption font-medium text-accent-ink">
              Choosing flight {activeLeg + 1} of {legs.length}
            </p>
          )}
          <h1 className="flex items-center gap-2.5 text-title-1 font-semibold text-ink">
            {criteria.originCode}
            <Icon name="arrowRight" className="h-6 w-6 text-ink-3" />
            {criteria.destinationCode}
          </h1>
          <p className="mt-1.5 text-footnote text-ink-2">
            {formatDate(`${criteria.departureDate}T00:00:00`)} · {passengerCount} passenger
            {passengerCount === 1 ? "" : "s"} · {CABIN_NAMES[criteria.cabin]}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing((open) => !open)}
          aria-expanded={editing}
          aria-controls="change-search"
          className="btn-secondary shrink-0 w-full sm:w-auto text-center justify-center"
        >
          <Icon name={editing ? "close" : "search"} className="h-4 w-4" />
          {editing ? "Hide search" : "Change search"}
        </button>
      </div>

      <div id="change-search" className="reveal" data-open={editing}>
        <div>
          <div className="pb-5">
            <SearchForm initial={criteria} />
          </div>
        </div>
      </div>

      {results.length === 0 ? (
        <EmptyState
          icon="search"
          title="No flights match this search"
          description={
            alternativeDates.length > 0
              ? "There are no departures on that date with enough available seats. Try one of the nearby dates below."
              : "This route is not served in the current schedule, or every departure is already full. Try a different route or date."
          }
          action={
            alternativeDates.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-2">
                {alternativeDates.slice(0, 6).map((date) => {
                  const next = new URLSearchParams({
                    from: criteria.originCode,
                    to: criteria.destinationCode,
                    date,
                    cabin: criteria.cabin,
                    adults: String(criteria.adults),
                    children: String(criteria.children),
                    infants: String(criteria.infants),
                  });
                  return (
                    <Link key={date} href={`/search?${next.toString()}`} className="btn-secondary">
                      {formatDateShort(`${date}T00:00:00`)}
                    </Link>
                  );
                })}
              </div>
            ) : (
              <Link href="/" className="btn-primary">
                Start a new search
              </Link>
            )
          }
        />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <p className="text-footnote font-medium text-ink" role="status">
              {visible.length} flight{visible.length === 1 ? "" : "s"} found
            </p>

            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
              <div className="w-full sm:w-auto">
                <label htmlFor="airline" className="label flex items-center gap-1.5">
                  <Icon name="filter" className="h-3.5 w-3.5" />
                  Airline
                </label>
                <select
                  id="airline"
                  className="input py-2 w-full"
                  value={airlineFilter}
                  onChange={(event) => setAirlineFilter(event.target.value)}
                >
                  <option value="all">All airlines</option>
                  {airlines.map((airline) => (
                    <option key={airline} value={airline}>
                      {airline}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full sm:w-auto">
                <label htmlFor="sort" className="label flex items-center gap-1.5">
                  <Icon name="sort" className="h-3.5 w-3.5" />
                  Sort by
                </label>
                <select
                  id="sort"
                  className="input py-2 w-full"
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortKey)}
                >
                  {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                    <option key={key} value={key}>
                      {SORT_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className={`space-y-4 ${entering ? "stagger" : ""}`}>
            {visible.map((result) => (
              <FlightCard
                  key={result.flight.id}
                  result={result}
                  criteria={criteria}
                  onSelect={multiLeg ? chooseFlight : undefined}
                  selected={multiLeg && picked[activeLeg] === result.flight.id}
                  ctaLabel={
                    multiLeg && activeLeg < legs.length - 1 ? "Select and continue" : "Select flight"
                  }
                />
            ))}
          </div>

          {visible.length === 0 && (
            <EmptyState
              icon="filter"
              title="No flights from that airline"
              description="Clear the airline filter to see all available departures on this date."
            />
          )}
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="container-page">
          <Spinner label="Loading results" />
        </div>
      }
    >
      <SearchResults />
    </Suspense>
  );
}
