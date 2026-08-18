"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useApp, useStored } from "@/components/AppProvider";
import { ItineraryCard } from "@/components/ItineraryCard";
import { Alert, Spinner } from "@/components/ui";
import { Icon } from "@/components/icons";
import { findBookingByPnr, getFlight, listAirports } from "@/lib/repository";
import type { Airport, Booking, Flight } from "@/lib/types";

/**
 * The one place in this app that spends the delight budget.
 *
 * A confirmation is seen once per booking, at the moment the user most wants
 * reassurance, so the tick draws itself rather than simply being there. It is
 * still a 420ms stroke on a static panel — nothing bounces, nothing blocks the
 * itinerary underneath, and reduced motion gets the finished tick immediately.
 */
function SuccessMark() {
  return (
    <svg viewBox="0 0 52 52" aria-hidden="true" className="h-14 w-14">
      <circle cx="26" cy="26" r="24" fill="var(--positive-soft)" />
      <path
        className="animate-draw-check"
        d="M15 26.5 L23 34.5 L38 18"
        pathLength={32}
        fill="none"
        stroke="var(--positive)"
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={32}
      />
    </svg>
  );
}

export default function ConfirmationPage() {
  const params = useParams<{ pnr: string }>();
  const { ready } = useApp();
  const pnr = (params.pnr ?? "").toUpperCase();

  const booking = useStored(() => findBookingByPnr(pnr), undefined as Booking | undefined, [pnr]);
  const flight = useStored(
    () => (booking ? getFlight(booking.flightId) : undefined),
    undefined as Flight | undefined,
    [booking],
  );
  const airports = useStored(listAirports, [] as Airport[]);

  if (!ready) {
    return (
      <div className="container-page">
        <Spinner label="Retrieving your booking" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container-page max-w-2xl text-center sm:text-left">
        <Alert tone="error" title="Booking not found">
          No booking exists with the reference <strong>{pnr}</strong>.
        </Alert>
        <Link href="/" className="btn-primary mt-6 w-full sm:w-auto text-center justify-center">
          <Icon name="search" className="h-4 w-4" />
          Search for a flight
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page max-w-3xl">
      <div className="animate-rise-lg no-print mb-8 flex flex-col items-center rounded-2xl border border-line bg-surface px-6 py-12 text-center shadow-e2">
        <SuccessMark />
        <h1 className="mt-6 text-display font-semibold text-ink">Your booking is confirmed</h1>
        <p className="mt-4 max-w-md text-lead text-ink-2">
          A confirmation has been sent to {booking.contactEmail}. Quote your reference at check-in.
        </p>
      </div>

      <ItineraryCard
        booking={booking}
        flight={flight}
        origin={airports.find((airport) => airport.code === flight?.originCode)}
        destination={airports.find((airport) => airport.code === flight?.destinationCode)}
      />

      <div className="no-print mt-8 flex flex-col sm:flex-row flex-wrap gap-3">
        <button type="button" onClick={() => window.print()} className="btn-primary w-full sm:w-auto text-center justify-center">
          <Icon name="printer" className="h-4 w-4" />
          Print / save as PDF
        </button>
        <Link href="/bookings" className="btn-secondary w-full sm:w-auto text-center justify-center">
          <Icon name="ticket" className="h-4 w-4" />
          View all my bookings
        </Link>
        <Link href="/" className="btn-secondary w-full sm:w-auto text-center justify-center">
          <Icon name="plane" className="h-4 w-4" />
          Book another flight
        </Link>
      </div>

      <p className="no-print mt-8 text-caption text-ink-3">
        This is a simulated booking created for academic demonstration. It is not valid for travel.
      </p>
    </div>
  );
}
