"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useApp, useStored } from "@/components/AppProvider";
import { ItineraryCard } from "@/components/ItineraryCard";
import { Alert, BookingCardSkeleton, ButtonSpinner, EmptyState, Segmented, Spinner } from "@/components/ui";

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
  const [loading, setLoading] = useState(true);
  const [cancellingPnr, setCancellingPnr] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);


  useEffect(() => {
    if (!ready || !user) return;
    let cancelled = false;

    async function loadBookings() {
      setLoading(true);
      try {
        const apiRes = await api.bookings.listMine();
        if (!cancelled && apiRes.ok) {
          setBookings(apiRes.data.bookings);
          setLoading(false);
          return;
        }
      } catch {
        // Fallback
      }

      if (!cancelled && user) {
        setBookings(listBookingsForUser(user.id));
        setLoading(false);
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
    setCancellingPnr(pnr);

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
    } finally {
      setCancellingPnr(null);
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
      <div className="container-page max-w-4xl space-y-6">
        <BookingCardSkeleton />
        <BookingCardSkeleton />
      </div>
    );
  }

  if (isGuest || !user) {
    return (
      <div className="container-page max-w-lg">
        <EmptyState
          icon="ticket"
          title="Sign in to view your bookings"
          description="Your reservations are tied to your SkyRoute account. Sign in to view your itinerary, change seats or cancel."
          action={
            <Link href="/login" className="btn-primary">
              <Icon name="signIn" className="h-4 w-4" />
              Sign in to your account
            </Link>
          }
        />
        <p className="mt-6 text-center text-callout text-ink-2">
          Booked as a guest?{" "}
          <Link href="/manage" className="font-semibold text-accent-ink hover:underline">
            Manage a reservation with your reference and surname
          </Link>
        </p>
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
    <div className="container-page max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="overline">Your reservations</p>
          <h1 className="text-display font-semibold text-ink">My bookings</h1>
          <p className="mt-1 text-callout text-ink-2">
            View itineraries, download boarding passes and manage cancellations.
          </p>
        </div>
        <Link href="/" className="btn-primary shrink-0 w-full sm:w-auto text-center justify-center">
          <Icon name="search" className="h-4 w-4" />
          Book another flight
        </Link>
      </div>

      {message && (
        <div className="mt-6">
          <Alert tone={message.tone}>{message.text}</Alert>
        </div>
      )}

      <div className="mb-6 mt-8">
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
        {loading ? (
          <div className="space-y-6" role="status" aria-label="Loading your bookings">
            <div className="flex items-center gap-2 text-footnote text-ink-2 mb-2">
              <Icon name="spinner" className="h-4 w-4 animate-spin text-accent" />
              <span>Loading reservations from your account…</span>
            </div>
            <BookingCardSkeleton />
            <BookingCardSkeleton />
          </div>
        ) : visible.length === 0 ? (
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
                              disabled={cancellingPnr === booking.pnr}
                              onClick={() => handleCancel(booking.pnr)}
                              className="btn-danger w-full sm:w-auto text-center justify-center"
                            >
                              {cancellingPnr === booking.pnr ? (
                                <>
                                  <ButtonSpinner />
                                  <span>Cancelling…</span>
                                </>
                              ) : (
                                "Yes, cancel it"
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={cancellingPnr === booking.pnr}
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
                          Cancel reservation
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
