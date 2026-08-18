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
import { cancelBooking, findBookingByPnrAndSurname, getFlight, listAirports, listFlights } from "@/lib/repository";
import { calculateRefund, formatMoney, refundRate } from "@/lib/pricing";
import { isValidPnr, PNR_LENGTH } from "@/lib/ids";
import type { Booking } from "@/lib/types";

export default function ManageBookingPage() {
  const { ready, user, refresh } = useApp();
  const [pnr, setPnr] = useState("");
  const [surname, setSurname] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notFound, setNotFound] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

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
    setConfirming(false);
    setMessage(null);
    if (!found) setNotFound(true);
    else setBooking(found);
  }

  function handleCancel() {
    if (!booking) return;

    /* Signed in and it is your booking? Cancel as the account. Otherwise fall
       back to the guest route, where the surname just typed into the form is
       the proof — and which the repository will refuse for any booking that
       belongs to an account. */
    const asAccount = user && booking.userId === user.id;
    const result = cancelBooking(
      booking.pnr,
      asAccount ? { kind: "account", user } : { kind: "guest", surname },
    );

    if (!result.ok) {
      setMessage({ tone: "error", text: result.error });
    } else {
      setBooking(result.data.booking);
      setMessage({
        tone: "success",
        text: `Booking ${booking.pnr} was cancelled. A refund of ${formatMoney(result.data.refund)} will be returned to the original payment method.`,
      });
      refresh();
    }

    setConfirming(false);
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
  const allFlights = listFlights();

  const departed = flight ? new Date(flight.departureTime).getTime() <= Date.now() : false;
  /* A booking made while signed in stays the property of that account — the
     reference and a surname are not enough to cancel it from here. */
  const ownedByAnotherAccount = Boolean(booking && booking.userId !== null && booking.userId !== user?.id);
  const canCancel = Boolean(
    booking && booking.status === "confirmed" && flight && !departed && !ownedByAnotherAccount,
  );
  const refund = booking && flight ? calculateRefund(booking.fare, flight.departureTime) : 0;
  const hoursToDeparture = flight
    ? (new Date(flight.departureTime).getTime() - Date.now()) / 3_600_000
    : 0;

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
            allFlights={allFlights}
            airports={airports}
          />
          {message && (
            <div className="mt-5">
              <Alert tone={message.tone} title={message.tone === "success" ? "Booking cancelled" : "Could not cancel"}>
                {message.text}
              </Alert>
            </div>
          )}

          <div className="mt-5 flex flex-col sm:flex-row flex-wrap gap-3">
            <Link href={`/confirmation/${booking.pnr}`} className="btn-secondary w-full sm:w-auto text-center justify-center">
              <Icon name="printer" className="h-4 w-4" />
              View / print e-ticket
            </Link>

            {canCancel &&
              (confirming ? (
                /* States the cost before it asks — a confirmation that carries
                   no new information is just a speed bump. */
                <div className="enter flex w-full flex-col flex-wrap items-start gap-4 rounded-xl border border-line bg-danger-soft px-5 py-4 sm:flex-row sm:items-center">
                  <p className="w-full text-footnote text-danger-ink">
                    Cancel {booking.pnr}? You would be refunded{" "}
                    <strong>{formatMoney(refund)}</strong> of {formatMoney(booking.fare.total)} (
                    {Math.round(refundRate(hoursToDeparture) * 100)}% of the refundable amount).
                  </p>
                  <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="btn-danger w-full justify-center text-center sm:w-auto"
                    >
                      Yes, cancel it
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(false)}
                      className="btn-secondary w-full justify-center text-center sm:w-auto"
                    >
                      Keep booking
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="btn-danger w-full justify-center text-center sm:w-auto"
                >
                  <Icon name="ban" className="h-4 w-4" />
                  Cancel booking
                </button>
              ))}
          </div>

          {booking.status === "confirmed" && !canCancel && flight && (
            <p className="mt-3 text-caption text-ink-3">
              {ownedByAnotherAccount
                ? "This booking belongs to an account. Sign in to that account to cancel it."
                : "This flight has already departed and can no longer be cancelled."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
