"use client";

/** The e-ticket / itinerary view, shared by the confirmation and bookings pages. */

import { StatusBadge } from "./ui";
import { Icon } from "./icons";
import { LogoMark } from "./Brand";
import { formatMoney } from "@/lib/pricing";
import {
  airportLabel,
  CABIN_NAMES,
  formatDate,
  formatDuration,
  formatTime,
} from "@/lib/format";
import type { Airport, Booking, Flight } from "@/lib/types";

export function ItineraryCard({
  booking,
  flight,
  origin,
  destination,
  showFare = true,
}: {
  booking: Booking;
  flight: Flight | undefined;
  origin: Airport | undefined;
  destination: Airport | undefined;
  showFare?: boolean;
}) {
  return (
    <article className="card-lg overflow-hidden p-0">
      {/* The e-ticket is the one thing here that leaves the screen — it gets
          printed and carried — so it is the one thing that has to identify
          itself without the surrounding chrome. */}
      <header className="border-b border-line bg-fill px-5 py-5 sm:px-8">
        <div className="mb-4 flex items-center gap-2 text-footnote font-semibold text-ink">
          <LogoMark className="h-6 w-6" />
          SkyRoute
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="overline">Booking reference</p>
            <p className="tabular mt-1.5 font-mono text-title-2 sm:text-numeral font-semibold tracking-[0.16em] sm:tracking-[0.18em] text-ink">
              {booking.pnr}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <StatusBadge status={booking.status} />
            <p className="mt-1.5 sm:mt-2 text-caption text-ink-3">Booked {formatDate(booking.createdAt)}</p>
          </div>
        </div>
      </header>

      {flight ? (
        <div className="px-5 py-6 sm:px-8 sm:py-7">
          <div className="flex flex-wrap items-center gap-2 text-footnote">
            <span className="flex h-7 items-center rounded bg-fill px-2 text-micro font-bold text-ink-2">
              {flight.airlineCode}
            </span>
            <span className="font-semibold text-ink">{flight.airline}</span>
            <span aria-hidden="true" className="text-ink-3">
              ·
            </span>
            <span className="text-ink-2">{flight.flightNumber}</span>
            <span aria-hidden="true" className="text-ink-3">
              ·
            </span>
            <span className="text-ink-2">{flight.aircraft}</span>
            <span className="badge ml-auto bg-accent-soft text-accent-ink">
              {CABIN_NAMES[booking.cabin]}
            </span>
          </div>

          <div className="mt-6 grid gap-6 rounded-xl border border-line p-5 sm:p-6 sm:grid-cols-[1fr_auto_1fr]">
            <div>
              <p className="tabular text-title-2 sm:text-numeral font-semibold text-ink">
                {formatTime(flight.departureTime)}
              </p>
              <p className="mt-1.5 sm:mt-2 text-callout font-medium text-ink">{airportLabel(origin)}</p>
              <p className="mt-1 text-caption text-ink-3">{origin?.name}</p>
              <p className="mt-2 flex items-center gap-1.5 text-caption text-ink-3">
                <Icon name="planeTakeoff" className="h-3.5 w-3.5" />
                {formatDate(flight.departureTime)}
              </p>
            </div>

            <div className="flex flex-row items-center gap-3 sm:flex-col sm:justify-center sm:px-6">
              <p className="text-caption text-ink-3">{formatDuration(flight.durationMinutes)}</p>
              <div aria-hidden="true" className="flex flex-1 items-center gap-1.5 sm:w-24">
                <span className="h-px flex-1 bg-line-strong" />
                <Icon name="plane" className="h-3.5 w-3.5 text-ink-3" />
                <span className="h-px flex-1 bg-line-strong" />
              </div>
              <p className="text-caption text-ink-3">Direct</p>
            </div>

            <div className="sm:text-right">
              <p className="tabular text-title-2 sm:text-numeral font-semibold text-ink">
                {formatTime(flight.arrivalTime)}
              </p>
              <p className="mt-2 text-callout font-medium text-ink">{airportLabel(destination)}</p>
              <p className="mt-1 text-caption text-ink-3">{destination?.name}</p>
              <p className="mt-2 flex items-center gap-1.5 text-caption text-ink-3 sm:justify-end">
                <Icon name="planeLanding" className="h-3.5 w-3.5" />
                {formatDate(flight.arrivalTime)}
              </p>
            </div>
          </div>

          <div className="mt-7">
            <h3 className="overline flex items-center gap-1.5">
              <Icon name="users" className="h-3.5 w-3.5" />
              Passengers
            </h3>
            <div className="mt-3 overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Type</th>
                    <th scope="col">Seat</th>
                    <th scope="col">Document</th>
                  </tr>
                </thead>
                <tbody>
                  {booking.passengers.map((passenger) => (
                    <tr key={passenger.id}>
                      <td className="font-medium text-ink">
                        {passenger.title} {passenger.firstName} {passenger.lastName}
                      </td>
                      <td className="capitalize">{passenger.type}</td>
                      <td className="font-mono font-semibold text-ink">
                        {passenger.seatId ?? <span className="font-sans text-ink-3">Lap infant</span>}
                      </td>
                      <td className="font-mono text-caption">{passenger.passportNumber || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-7 grid gap-7 sm:grid-cols-2">
            <div>
              <h3 className="overline flex items-center gap-1.5">
                <Icon name="mail" className="h-3.5 w-3.5" />
                Contact
              </h3>
              <p className="mt-3 text-footnote text-ink-2">{booking.contactEmail}</p>
              <p className="text-footnote text-ink-2">{booking.contactPhone}</p>
            </div>

            {showFare && (
              <div>
                <h3 className="overline flex items-center gap-1.5">
                  <Icon name="creditCard" className="h-3.5 w-3.5" />
                  Payment
                </h3>
                <dl className="mt-3 space-y-2 text-footnote">
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-2">Base fare</dt>
                    <dd className="tabular text-ink">{formatMoney(booking.fare.baseFareTotal)}</dd>
                  </div>
                  {booking.fare.cabinSurcharge > 0 && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-2">Cabin upgrade</dt>
                      <dd className="tabular text-ink">{formatMoney(booking.fare.cabinSurcharge)}</dd>
                    </div>
                  )}
                  {booking.fare.seatSelectionFee > 0 && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-2">Seat selection</dt>
                      <dd className="tabular text-ink">
                        {formatMoney(booking.fare.seatSelectionFee)}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-2">Taxes</dt>
                    <dd className="tabular text-ink">{formatMoney(booking.fare.taxes)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-2">Service charge</dt>
                    <dd className="tabular text-ink">{formatMoney(booking.fare.serviceCharge)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-line pt-2">
                    <dt className="font-semibold text-ink">Total paid</dt>
                    <dd className="tabular font-semibold text-ink">
                      {formatMoney(booking.fare.total)}
                    </dd>
                  </div>
                </dl>
                {booking.payment && (
                  <p className="mt-3 text-caption text-ink-3">
                    {booking.payment.maskedCardNumber} · Ref {booking.payment.transactionReference}
                  </p>
                )}
              </div>
            )}
          </div>

          {booking.status === "cancelled" && (
            <div className="mt-7 flex gap-3 rounded-lg border border-line bg-danger-soft px-5 py-4 text-footnote text-danger-ink">
              <Icon name="xCircle" className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
              <div>
                <p className="font-semibold">This booking was cancelled.</p>
                <p className="mt-1">
                  Cancelled on {booking.cancelledAt ? formatDate(booking.cancelledAt) : "—"}. Refund
                  issued: {formatMoney(booking.refundAmount ?? 0)}.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2.5 px-6 py-8 text-footnote text-ink-2 sm:px-8">
          <Icon name="alertTriangle" className="h-4 w-4 shrink-0 text-warn" />
          The flight for this booking is no longer in the schedule.
        </div>
      )}
    </article>
  );
}
