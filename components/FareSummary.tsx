"use client";

import { formatMoney } from "@/lib/pricing";
import { CABIN_NAMES, airportLabel, formatDateShort, formatDuration, formatTime } from "@/lib/format";
import { Icon } from "./icons";
import type { Airport, CabinClass, FareBreakdown, Flight } from "@/lib/types";

export function FareSummary({
  flight,
  origin,
  destination,
  cabin,
  fare,
  passengerCount,
}: {
  flight: Flight;
  origin: Airport | undefined;
  destination: Airport | undefined;
  cabin: CabinClass;
  fare: FareBreakdown;
  passengerCount: number;
}) {
  const lines: { label: string; value: number; muted?: boolean }[] = [
    {
      label: `Base fare (${passengerCount} passenger${passengerCount === 1 ? "" : "s"})`,
      value: fare.baseFareTotal,
    },
  ];

  if (fare.cabinSurcharge > 0) {
    lines.push({ label: `${CABIN_NAMES[cabin]} cabin upgrade`, value: fare.cabinSurcharge });
  }
  if (fare.seatSelectionFee > 0) {
    lines.push({ label: "Seat selection", value: fare.seatSelectionFee });
  }
  lines.push({ label: "Taxes (VAT 7.5%)", value: fare.taxes, muted: true });
  lines.push({ label: "Booking service charge", value: fare.serviceCharge, muted: true });

  return (
    <aside className="card-lg sticky top-20 self-start">
      <h2 className="overline">Trip summary</h2>

      <div className="mt-3 border-b border-line pb-4">
        <p className="flex items-center gap-1.5 text-headline font-semibold text-ink">
          {airportLabel(origin)}
          <Icon name="arrowRight" className="h-4 w-4 text-ink-3" />
          {airportLabel(destination)}
        </p>
        <p className="mt-1.5 text-caption text-ink-3">
          {flight.airline} {flight.flightNumber} · {flight.aircraft}
        </p>
        <p className="tabular mt-3 text-footnote font-medium text-ink-2">
          {formatDateShort(flight.departureTime)} · {formatTime(flight.departureTime)} –{" "}
          {formatTime(flight.arrivalTime)}
        </p>
        <p className="mt-1 text-caption text-ink-3">
          {formatDuration(flight.durationMinutes)} · {CABIN_NAMES[cabin]}
        </p>
      </div>

      <dl className="mt-4 space-y-2.5 text-footnote">
        {lines.map((line) => (
          <div key={line.label} className="flex justify-between gap-3">
            <dt className={line.muted ? "text-ink-3" : "text-ink-2"}>{line.label}</dt>
            <dd className={`tabular ${line.muted ? "text-ink-3" : "font-medium text-ink"}`}>
              {formatMoney(line.value, flight.currency)}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-line pt-4">
        <span className="text-footnote font-semibold text-ink">Total to pay</span>
        <span className="tabular text-numeral-sm font-semibold text-ink">
          {formatMoney(fare.total, flight.currency)}
        </span>
      </div>

      <p className="mt-4 text-caption text-ink-3">
        Fares reflect how far ahead the booking is made and how full the cabin is. The service charge
        is not refundable if the booking is later cancelled.
      </p>
    </aside>
  );
}
