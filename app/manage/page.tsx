"use client";

/**
 * "Manage my booking" - retrieve a reservation with a PNR and surname,
 * exactly as an airline site allows without an account.
 */

import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/components/AppProvider";
import { ItineraryCard } from "@/components/ItineraryCard";
import { Alert, Field, Spinner } from "@/components/ui";
import { Icon } from "@/components/icons";
import { findBookingByPnrAndSurname, getFlight, listAirports } from "@/lib/repository";
import { isValidPnr, PNR_LENGTH } from "@/lib/ids";
import type { Booking } from "@/lib/types";

export default function ManageBookingPage() {
  const { ready } = useApp();
  const [pnr, setPnr] = useState("");
  const [surname, setSurname] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notFound, setNotFound] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};

    if (!pnr.trim()) nextErrors.pnr = "Enter your booking reference.";
    else if (!isValidPnr(pnr)) nextErrors.pnr = `A booking reference is ${PNR_LENGTH} letters and digits.`;
    if (!surname.trim()) nextErrors.surname = "Enter the surname on the booking.";

    setErrors(nextErrors);
    setNotFound(false);
    setBooking(null);
    if (Object.keys(nextErrors).length > 0) return;

    const found = findBookingByPnrAndSurname(pnr, surname);
    if (!found) setNotFound(true);
    else setBooking(found);
  }

  if (!ready) {
    return (
      <div className="container-page">
        <Spinner />
      </div>
    );
  }

  const flight = booking ? getFlight(booking.flightId) : undefined;
  const airports = listAirports();

  return (
    <div className="container-page max-w-3xl">
      <h1 className="text-display font-semibold text-ink">Manage a booking</h1>
      <p className="mt-4 max-w-xl text-lead text-ink-2">
        Retrieve any booking with its six-character reference and the surname of a passenger on it.
        No account needed.
      </p>

      <form onSubmit={handleSubmit} noValidate className="card-lg mt-10">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Booking reference" htmlFor="pnr" error={errors.pnr} hint="For example, K7T2QM">
            <input
              id="pnr"
              type="text"
              maxLength={PNR_LENGTH}
              className={`input font-mono uppercase tracking-[0.2em] ${errors.pnr ? "input-error" : ""}`}
              value={pnr}
              onChange={(event) => setPnr(event.target.value.toUpperCase())}
            />
          </Field>

          <Field label="Passenger surname" htmlFor="surname" error={errors.surname}>
            <input
              id="surname"
              type="text"
              autoComplete="family-name"
              className={`input ${errors.surname ? "input-error" : ""}`}
              value={surname}
              onChange={(event) => setSurname(event.target.value)}
            />
          </Field>
        </div>

        <button type="submit" className="btn-primary mt-6 w-full sm:w-auto text-center justify-center">
          <Icon name="search" className="h-4 w-4" />
          Find booking
        </button>
      </form>

      {notFound && (
        <div className="mt-6">
          <Alert tone="error" title="No matching booking">
            We could not find a booking with that reference and surname. Check both and try again.
            The surname must match a passenger on the booking exactly.
          </Alert>
        </div>
      )}

      {booking && (
        <div className="mt-8">
          <ItineraryCard
            booking={booking}
            flight={flight}
            origin={airports.find((airport) => airport.code === flight?.originCode)}
            destination={airports.find((airport) => airport.code === flight?.destinationCode)}
          />
          <div className="mt-5 flex flex-col sm:flex-row flex-wrap gap-3">
            <Link href={`/confirmation/${booking.pnr}`} className="btn-secondary w-full sm:w-auto text-center justify-center">
              <Icon name="printer" className="h-4 w-4" />
              View / print e-ticket
            </Link>
            <Link href="/bookings" className="btn-secondary w-full sm:w-auto text-center justify-center">
              <Icon name="signIn" className="h-4 w-4" />
              Sign in to cancel this booking
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
