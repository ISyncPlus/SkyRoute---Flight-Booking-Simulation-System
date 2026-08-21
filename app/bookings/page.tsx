"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useApp, useStored } from "@/components/AppProvider";
import { ItineraryCard } from "@/components/ItineraryCard";
import { Alert, EmptyState, Segmented, Spinner } from "@/components/ui";
import { Icon } from "@/components/icons";
import { api } from "@/lib/api";
import { cancelBooking, getFlight, listAirports, listBookingsForUser, listFlights } from "@/lib/repository";
import { calculateRefund, formatMoney, refundRate } from "@/lib/pricing";
import { formatDate } from "@/lib/format";
import type { Airport, Booking, Flight } from "@/lib/types";

type Filter = "upcoming" | "past" | "cancelled" | "all";

export default function BookingsPage() {
  const { ready, user, isGuest, refresh, revision } = useApp();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!ready || !user) return;
    let cancelled = false;

    async function loadBookings() {
      try {
        const apiRes = await api.bookings.listMine();
        if (!cancelled && apiRes.ok) {
          setBookings(apiRes.data.bookings);
          return;
        }
      } catch {
        // Fallback
      }

      if (!cancelled && user) {
        setBookings(listBookingsForUser(user.id));
      }
    }


    void loadBookings();
    return () => {
      cancelled = true;
    };
  }, [ready, user, revision]);

  const airports = useStored(listAirports, [] as Airport[]);
  // The whole schedule, so a multi-leg booking can resolve every one of its flights.
  const allFlights = useStored(listFlights, [] as Flight[]);

  const enriched = useStored(
    () =>
      bookings.map((booking) => {
        const flight = getFlight(booking.flightId);
        const departed = flight ? new Date(flight.departureTime).getTime() < Date.now() : true;
        return { booking, flight, departed };
      }),
    [] as { booking: Booking; flight: Flight | undefined; departed: boolean }[],
    [bookings],
  );

  const visible = useMemo(() => {
    switch (filter) {
      case "upcoming":
        return enriched.filter((item) => item.booking.status === "confirmed" && !item.departed);
      case "past":
        return enriched.filter((item) => item.booking.status === "confirmed" && item.departed);
      case "cancelled":
        return enriched.filter((item) => item.booking.status === "cancelled");
      case "all":
        return enriched;
      default:
        return enriched;
    }
  }, [enriched, filter]);

  async function handleCancel(pnr: string) {
    if (!user) return;

    try {
      const apiRes = await api.bookings.cancel(pnr);
      if (apiRes.ok && apiRes.data.booking) {
        setMessage({
          tone: "success",
          text: `Booking ${pnr} was cancelled. A refund of ${formatMoney(apiRes.data.refund)} will be returned to the original payment method.`,
        });
        const listRes = await api.bookings.listMine();
        if (listRes.ok) setBookings(listRes.data.bookings);
        refresh();
        setConfirming(null);
        window.scrollTo({ top: 0 });
        return;
      }
    } catch {
      // Fallback
    }

    const result = cancelBooking(pnr, { kind: "account", user });
    if (!result.ok) {
      setMessage({ tone: "error", text: result.error });
    } else {
      setMessage({
        tone: "success",
        text: `Booking ${pnr} was cancelled. A refund of ${formatMoney(result.data.refund)} will be returned to the original payment method.`,
      });
      setBookings(listBookingsForUser(user.id));
      refresh();
    }

    setConfirming(null);
    window.scrollTo({ top: 0 });
  }


  if (!ready) {
    return (
      <div className="container-page">
        <Spinner label="Loading your bookings" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container-page max-w-xl">
        <Alert tone="info" title={isGuest ? "You are browsing in Guest Mode" : "This page needs an account"}>
          {isGuest
            ? "Bookings made as a guest are not attached to an account. You can look up and manage your guest trip anytime on the Manage Booking page using your booking reference (PNR) and passenger surname."
            : "Bookings are listed here once they are attached to an account. Booked as a guest, or with a different account? Retrieve that trip from the manage booking page using its reference and the passenger surname."}
        </Alert>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/manage" className="btn-primary">
            <Icon name="search" className="h-4 w-4" />
            Find guest booking
          </Link>
          <Link href="/register" className="btn-secondary">
            <Icon name="plus" className="h-4 w-4" />
            Create permanent account
          </Link>
        </div>
      </div>
    );
  }

  const counts = {
    upcoming: enriched.filter((item) => item.booking.status === "confirmed" && !item.departed).length,
    past: enriched.filter((item) => item.booking.status === "confirmed" && item.departed).length,
    cancelled: enriched.filter((item) => item.booking.status === "cancelled").length,
    all: enriched.length,
  };

  return (
    <div className="container-page">
      <h1 className="text-display font-semibold text-ink">My bookings</h1>
      <p className="mt-3 text-callout text-ink-2">
        Signed in as {user.fullName} ({user.email})
      </p>

      {message && (
        <div className="mt-6">
          <Alert tone={message.tone}>{message.text}</Alert>
        </div>
      )}

      <div className="mt-8">
        <Segmented
          label="Filter bookings"
          value={filter}
          onChange={setFilter}
          items={[
            { key: "upcoming", label: "Upcoming", count: counts.upcoming },
            { key: "past", label: "Past", count: counts.past },
            { key: "cancelled", label: "Cancelled", count: counts.cancelled },
            { key: "all", label: "All", count: counts.all },
          ]}
        />
      </div>

      <div className="mt-8">
        {visible.length === 0 ? (
          <EmptyState
            icon="ticket"
            title={`No ${filter === "all" ? "" : filter} bookings`}
            description="When you complete a booking it will appear here, with your itinerary, seat allocation and the option to cancel."
            action={
              <Link href="/" className="btn-primary">
                <Icon name="search" className="h-4 w-4" />
                Search for a flight
              </Link>
            }
          />
        ) : (
          <div className="space-y-10">
            {visible.map(({ booking, flight, departed }) => {
              const canCancel = booking.status === "confirmed" && !departed && flight;
              const refund = flight ? calculateRefund(booking.fare, flight.departureTime) : 0;
              const hoursToDeparture = flight
                ? (new Date(flight.departureTime).getTime() - Date.now()) / 3_600_000
                : 0;

              return (
                <div key={booking.pnr}>
                  <ItineraryCard
                    booking={booking}
                    flight={flight}
                    origin={airports.find((airport) => airport.code === flight?.originCode)}
                    destination={airports.find(
                      (airport) => airport.code === flight?.destinationCode,
                    )}
                    allFlights={allFlights}
                    airports={airports}
                  />

                  <div className="no-print mt-4 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
                    <Link href={`/confirmation/${booking.pnr}`} className="btn-secondary w-full sm:w-auto text-center justify-center">
                      <Icon name="printer" className="h-4 w-4" />
                      View / print e-ticket
                    </Link>

                    {canCancel &&
                      (confirming === booking.pnr ? (
                        // Confirming a cancellation states the cost before it
                        // asks — a confirmation that carries no new information
                        // is just a speed bump.
                        <div className="enter flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-4 rounded-xl border border-line bg-danger-soft px-5 py-4 w-full">
                          <p className="text-footnote text-danger-ink w-full">
                            Cancel {booking.pnr}? You would be refunded{" "}
                            <strong>{formatMoney(refund)}</strong> of{" "}
                            {formatMoney(booking.fare.total)} (
                            {Math.round(refundRate(hoursToDeparture) * 100)}% of the refundable
                            amount).
                          </p>
                          <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
                            <button
                              type="button"
                              onClick={() => handleCancel(booking.pnr)}
                              className="btn-danger w-full sm:w-auto text-center justify-center"
                            >
                              Yes, cancel it
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirming(null)}
                              className="btn-secondary w-full sm:w-auto text-center justify-center"
                            >
                              Keep booking
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirming(booking.pnr)}
                          className="btn-danger w-full sm:w-auto text-center justify-center"
                        >
                          <Icon name="ban" className="h-4 w-4" />
                          Cancel booking
                        </button>
                      ))}

                    {booking.status === "confirmed" && departed && (
                      <span className="text-footnote text-ink-3">
                        Flown on {flight ? formatDate(flight.departureTime) : "—"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="no-print card mt-12">
        <h2 className="flex items-center gap-2 text-footnote font-semibold text-ink">
          <Icon name="infoCircle" className="h-4 w-4 text-ink-3" />
          Cancellation policy
        </h2>
        <ul className="mt-4 space-y-2 text-footnote text-ink-2">
          <li>7 days or more before departure: 90% of the refundable amount</li>
          <li>3 to 7 days before departure: 70%</li>
          <li>24 to 72 hours before departure: 50%</li>
          <li>Within 24 hours of departure: no refund</li>
        </ul>
        <p className="mt-4 text-caption text-ink-3">
          The booking service charge of {formatMoney(2500)} is never refundable.
        </p>
      </div>
    </div>
  );
}
