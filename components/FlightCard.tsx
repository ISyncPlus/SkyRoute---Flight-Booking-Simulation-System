"use client";

import Link from "next/link";
import { formatMoney } from "@/lib/pricing";
import { airportLabel, CABIN_NAMES, formatDuration, formatTime } from "@/lib/format";
import { Icon } from "./icons";
import type { CabinClass, FlightSearchResult, SearchCriteria } from "@/lib/types";

export function FlightCard({
  result,
  criteria,
}: {
  result: FlightSearchResult;
  criteria: SearchCriteria;
}) {
  const { flight, origin, destination, seatsAvailable, pricePerAdult, estimatedTotal } = result;
  const cabin: CabinClass = flight.cabins.some((c) => c.cabin === criteria.cabin)
    ? criteria.cabin
    : "economy";
  const totalPassengers = criteria.adults + criteria.children + criteria.infants;
  const isLowAvailability = seatsAvailable <= 8;

  const params = new URLSearchParams({
    cabin,
    adults: String(criteria.adults),
    children: String(criteria.children),
    infants: String(criteria.infants),
  });

  return (
    <article className="card-lg hover-lift overflow-hidden p-0">
      <div className="flex flex-col lg:flex-row">
        <div className="flex-1 p-6 sm:p-7">
          <div className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <span className="flex h-7 items-center rounded bg-fill px-2 text-micro font-bold text-ink-2">
              {flight.airlineCode}
            </span>
            <span className="text-footnote font-semibold text-ink">{flight.airline}</span>
            <span aria-hidden="true" className="text-ink-3">
              ·
            </span>
            <span className="text-caption text-ink-3">{flight.flightNumber}</span>
            <span aria-hidden="true" className="text-ink-3">
              ·
            </span>
            <span className="text-caption text-ink-3">{flight.aircraft}</span>
            {flight.status === "delayed" && (
              <span className="badge bg-warn-soft text-warn-ink">Delayed</span>
            )}
          </div>

          <div className="flex items-start justify-between gap-2 sm:gap-5">
            <div className="shrink-0">
              <p className="tabular text-title-2 sm:text-numeral font-semibold text-ink">
                {formatTime(flight.departureTime)}
              </p>
              <p className="mt-1 sm:mt-1.5 text-caption font-medium text-ink-2">{airportLabel(origin)}</p>
            </div>

            <div className="flex min-w-0 flex-1 flex-col items-center pt-1 sm:pt-1.5 px-1 sm:px-3">
              <p className="flex items-center gap-1.5 text-caption font-medium text-ink-3">
                <Icon name="clock" className="h-3.5 w-3.5" />
                {formatDuration(flight.durationMinutes)}
              </p>
              <div aria-hidden="true" className="my-1.5 sm:my-2 flex w-full items-center gap-1.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-line-strong" />
                <span className="h-px flex-1 bg-line" />
                <Icon name="plane" className="h-3.5 w-3.5 text-ink-3" />
                <span className="h-px flex-1 bg-line" />
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-line-strong" />
              </div>
              <p className="text-caption text-ink-3">Direct</p>
            </div>

            <div className="shrink-0 text-right">
              <p className="tabular text-title-2 sm:text-numeral font-semibold text-ink">
                {formatTime(flight.arrivalTime)}
              </p>
              <p className="mt-1 sm:mt-1.5 text-caption font-medium text-ink-2">
                {airportLabel(destination)}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption">
            <span className="text-ink-2">{CABIN_NAMES[cabin]}</span>
            <span aria-hidden="true" className="text-ink-3">
              ·
            </span>
            <span
              className={`inline-flex items-center gap-1.5 ${
                isLowAvailability ? "font-semibold text-danger" : "text-ink-2"
              }`}
            >
              <Icon name="seat" className="h-3.5 w-3.5" />
              {seatsAvailable} seat{seatsAvailable === 1 ? "" : "s"} left
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col justify-center gap-1 border-t border-line bg-fill p-5 sm:p-7 lg:w-64 lg:border-l lg:border-t-0">
          <p className="text-caption text-ink-3">From, per adult</p>
          <p className="tabular text-numeral-sm font-semibold text-ink">
            {formatMoney(pricePerAdult, flight.currency)}
          </p>
          <p className="text-caption text-ink-2">
            {formatMoney(estimatedTotal, flight.currency)} total for {totalPassengers} passenger
            {totalPassengers === 1 ? "" : "s"}
          </p>
          <p className="text-caption text-ink-3">incl. taxes &amp; charges</p>
          <Link
            href={`/book/${encodeURIComponent(flight.id)}?${params.toString()}`}
            className="btn-primary mt-3 w-full text-center justify-center"
          >
            Select flight
          </Link>
        </div>
      </div>
    </article>
  );
}
