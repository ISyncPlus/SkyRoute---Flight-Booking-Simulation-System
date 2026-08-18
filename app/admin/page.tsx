"use client";

/**
 * Administrator console.
 * ----------------------
 * Every action here is authorised inside the repository, not in this
 * component. Hiding a button is a usability decision; refusing the operation
 * in `requireAdmin` is the security decision. Both are present, and the tests
 * exercise the second.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp, useStored } from "@/components/AppProvider";
import { Alert, Field, Segmented, Spinner, StatusBadge } from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";
import {
  cancelBooking,
  createFlight,
  deleteFlight,
  getStats,
  listAirports,
  listAllBookings,
  listFlights,
  listUsers,
  resetSystem,
  updateFlight,
} from "@/lib/repository";
import { AIRCRAFT_LAYOUTS, toLocalIso } from "@/lib/seed";
import { formatMoney } from "@/lib/pricing";
import { formatDate, formatDateShort, formatTime } from "@/lib/format";
import { usedBytes } from "@/lib/storage";
import type { Airport, Booking, Flight, User } from "@/lib/types";

type Tab = "overview" | "flights" | "bookings" | "users" | "system";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "flights", label: "Flights" },
  { key: "bookings", label: "Bookings" },
  { key: "users", label: "Users" },
  { key: "system", label: "System" },
];

const AIRCRAFT_TYPES = Object.keys(AIRCRAFT_LAYOUTS);

export default function AdminPage() {
  const { ready, user, isAdmin, refresh } = useApp();
  const [tab, setTab] = useState<Tab>("overview");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const stats = useStored(() => (isAdmin ? getStats() : null), null, [isAdmin]);
  const flights = useStored(() => (isAdmin ? listFlights() : []), [] as Flight[], [isAdmin]);
  const bookings = useStored(() => (isAdmin ? listAllBookings() : []), [] as Booking[], [isAdmin]);
  const users = useStored(() => (isAdmin ? listUsers() : []), [] as User[], [isAdmin]);
  const airports = useStored(listAirports, [] as Airport[]);

  // ---- New flight form ----
  const [newFlight, setNewFlight] = useState({
    flightNumber: "",
    airline: "",
    airlineCode: "",
    originCode: "LOS",
    destinationCode: "ABV",
    date: "",
    departTime: "09:00",
    durationMinutes: 70,
    aircraft: AIRCRAFT_TYPES[0] ?? "Boeing 737-800",
    baseFare: 120000,
  });
  const [flightErrors, setFlightErrors] = useState<Record<string, string>>({});
  const [flightSearch, setFlightSearch] = useState("");
  const [bookingSearch, setBookingSearch] = useState("");

  useEffect(() => {
    setMessage(null);
  }, [tab]);

  function notify(tone: "success" | "error", text: string) {
    setMessage({ tone, text });
    window.scrollTo({ top: 0 });
  }

  function handleCreateFlight(event: React.FormEvent) {
    event.preventDefault();
    const errors: Record<string, string> = {};

    if (!/^[A-Z0-9]{2}\d{2,4}$/i.test(newFlight.flightNumber.trim())) {
      errors.flightNumber = "Use an airline code followed by 2–4 digits, e.g. P4123.";
    }
    if (!newFlight.airline.trim()) errors.airline = "Airline name is required.";
    if (!newFlight.date) errors.date = "Select a departure date.";
    if (newFlight.originCode === newFlight.destinationCode) {
      errors.destinationCode = "Origin and destination must differ.";
    }
    if (newFlight.durationMinutes < 20) errors.durationMinutes = "Duration must be at least 20 minutes.";
    if (newFlight.baseFare < 1000) errors.baseFare = "Base fare must be at least NGN 1,000.";

    const departure = new Date(`${newFlight.date}T${newFlight.departTime}:00`);
    if (!Number.isNaN(departure.getTime()) && departure.getTime() <= Date.now()) {
      errors.date = "The departure must be in the future.";
    }

    setFlightErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const arrival = new Date(departure.getTime() + newFlight.durationMinutes * 60_000);
    const number = newFlight.flightNumber.trim().toUpperCase();

    const flight: Flight = {
      id: `${number}-${newFlight.date}-${newFlight.departTime.replace(":", "")}`,
      flightNumber: number,
      airline: newFlight.airline.trim(),
      airlineCode: (newFlight.airlineCode.trim() || number.slice(0, 2)).toUpperCase(),
      originCode: newFlight.originCode,
      destinationCode: newFlight.destinationCode,
      departureTime: toLocalIso(departure),
      arrivalTime: toLocalIso(arrival),
      durationMinutes: newFlight.durationMinutes,
      aircraft: newFlight.aircraft,
      baseFare: newFlight.baseFare,
      currency: "NGN",
      cabins: AIRCRAFT_LAYOUTS[newFlight.aircraft] ?? [],
      blockedSeats: [],
      status: "scheduled",
    };

    const result = createFlight(user, flight);
    if (!result.ok) {
      notify("error", result.error);
      return;
    }

    notify("success", `Flight ${number} was added to the schedule.`);
    setNewFlight((current) => ({ ...current, flightNumber: "" }));
    refresh();
  }

  function handleStatusChange(flight: Flight, status: Flight["status"]) {
    const result = updateFlight(user, flight.id, { status });
    if (!result.ok) notify("error", result.error);
    else {
      notify("success", `${flight.flightNumber} is now ${status}.`);
      refresh();
    }
  }

  function handleDeleteFlight(flight: Flight) {
    const result = deleteFlight(user, flight.id);
    if (!result.ok) notify("error", result.error);
    else {
      notify("success", `Flight ${flight.flightNumber} was deleted.`);
      refresh();
    }
  }

  function handleCancelBooking(booking: Booking) {
    if (!user) return;
    const result = cancelBooking(booking.pnr, { kind: "account", user });
    if (!result.ok) notify("error", result.error);
    else {
      notify("success", `Booking ${booking.pnr} cancelled. Refund: ${formatMoney(result.data.refund)}.`);
      refresh();
    }
  }

  async function handleReset() {
    await resetSystem();
    notify("success", "All data was cleared and the schedule regenerated. You have been signed out.");
    refresh();
  }

  if (!ready) {
    return (
      <div className="container-page">
        <Spinner label="Loading administration console" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="container-page max-w-xl">
        <Alert tone="error" title="Access denied">
          The administration console requires an administrator account. Sign in with administrator
          credentials to continue.
        </Alert>
        <Link href="/login" className="btn-primary mt-4">
          <Icon name="signIn" className="h-4 w-4" />
          Sign in
        </Link>
      </div>
    );
  }

  const visibleFlights = flights
    .filter((flight) => {
      if (!flightSearch.trim()) return true;
      const needle = flightSearch.trim().toLowerCase();
      return (
        flight.flightNumber.toLowerCase().includes(needle) ||
        flight.airline.toLowerCase().includes(needle) ||
        flight.originCode.toLowerCase().includes(needle) ||
        flight.destinationCode.toLowerCase().includes(needle)
      );
    })
    .sort((a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());

  const visibleBookings = bookings.filter((booking) => {
    if (!bookingSearch.trim()) return true;
    const needle = bookingSearch.trim().toLowerCase();
    return (
      booking.pnr.toLowerCase().includes(needle) ||
      booking.contactEmail.toLowerCase().includes(needle) ||
      booking.passengers.some((passenger) =>
        `${passenger.firstName} ${passenger.lastName}`.toLowerCase().includes(needle),
      )
    );
  });

  return (
    <div className="container-page">
      <h1 className="text-display font-semibold text-ink">Administration console</h1>
      <p className="mt-3 text-callout text-ink-2">Signed in as {user.fullName}</p>

      {message && (
        <div className="mt-6">
          <Alert tone={message.tone}>{message.text}</Alert>
        </div>
      )}

      {/* No animation on the tab content: an administrator switches these
          dozens of times a session, and motion there reads as lag. */}
      <div className="mb-8 mt-8">
        <Segmented label="Console sections" value={tab} onChange={setTab} items={TABS} />
      </div>

      {/* ---------------- Overview ---------------- */}
      {tab === "overview" && stats && (
        <section className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {([
              { label: "Flights scheduled", value: stats.scheduledFlights.toLocaleString(), icon: "plane" },
              { label: "Confirmed bookings", value: stats.confirmedBookings.toLocaleString(), icon: "ticket" },
              { label: "Passengers carried", value: stats.totalPassengers.toLocaleString(), icon: "users" },
              { label: "Registered users", value: stats.registeredUsers.toLocaleString(), icon: "user" },
            ] as const satisfies readonly { label: string; value: string; icon: IconName }[]).map((item) => (
              <div key={item.label} className="card">
                <p className="overline flex items-center gap-1.5">
                  <Icon name={item.icon} className="h-3.5 w-3.5" />
                  {item.label}
                </p>
                <p className="mt-1.5 text-numeral font-semibold text-ink">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card">
              <h2 className="flex items-center gap-2 text-title-3 font-semibold text-ink">
                <Icon name="banknote" className="h-5 w-5 text-ink-3" />
                Revenue
              </h2>
              <dl className="mt-3 space-y-2 text-footnote">
                <div className="flex justify-between">
                  <dt className="text-ink-2">Gross revenue (confirmed)</dt>
                  <dd className="font-semibold text-ink">{formatMoney(stats.grossRevenue)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-2">Refunds issued</dt>
                  <dd className="font-semibold text-danger">−{formatMoney(stats.refunded)}</dd>
                </div>
                <div className="flex justify-between border-t border-line pt-2">
                  <dt className="font-semibold text-ink">Net revenue</dt>
                  <dd className="font-bold text-positive-ink">{formatMoney(stats.netRevenue)}</dd>
                </div>
                <div className="flex justify-between pt-1">
                  <dt className="text-ink-2">Cancellation rate</dt>
                  <dd className="text-ink">
                    {stats.totalBookings === 0
                      ? "0%"
                      : `${Math.round((stats.cancelledBookings / stats.totalBookings) * 100)}%`}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="card">
              <h2 className="flex items-center gap-2 text-title-3 font-semibold text-ink">
                <Icon name="chart" className="h-5 w-5 text-ink-3" />
                Busiest routes
              </h2>
              {stats.topRoutes.length === 0 ? (
                <p className="mt-3 text-footnote text-ink-3">No bookings have been made yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {stats.topRoutes.map((route) => {
                    const max = stats.topRoutes[0].bookings || 1;
                    return (
                      <li key={route.route}>
                        <div className="flex justify-between text-footnote">
                          <span className="text-ink-2">{route.route}</span>
                          <span className="font-semibold text-ink">{route.bookings}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-fill">
                          <div
                            className="h-1.5 rounded-full bg-accent"
                            style={{ width: `${(route.bookings / max) * 100}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ---------------- Flights ---------------- */}
      {tab === "flights" && (
        <section className="space-y-6">
          <form onSubmit={handleCreateFlight} noValidate className="card">
            <h2 className="flex items-center gap-2 text-title-3 font-semibold text-ink">
              <Icon name="plus" className="h-5 w-5 text-ink-3" />
              Add a flight to the schedule
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Flight number" htmlFor="flightNumber" error={flightErrors.flightNumber}>
                <input
                  id="flightNumber"
                  className={`input uppercase ${flightErrors.flightNumber ? "input-error" : ""}`}
                  value={newFlight.flightNumber}
                  onChange={(event) =>
                    setNewFlight((c) => ({ ...c, flightNumber: event.target.value.toUpperCase() }))
                  }
                  placeholder="P4123"
                />
              </Field>

              <Field label="Airline" htmlFor="airline" error={flightErrors.airline}>
                <input
                  id="airline"
                  className={`input ${flightErrors.airline ? "input-error" : ""}`}
                  value={newFlight.airline}
                  onChange={(event) => setNewFlight((c) => ({ ...c, airline: event.target.value }))}
                  placeholder="Air Peace"
                />
              </Field>

              <Field label="From" htmlFor="adminOrigin">
                <select
                  id="adminOrigin"
                  className="input"
                  value={newFlight.originCode}
                  onChange={(event) => setNewFlight((c) => ({ ...c, originCode: event.target.value }))}
                >
                  {airports.map((airport) => (
                    <option key={airport.code} value={airport.code}>
                      {airport.city} ({airport.code})
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="To" htmlFor="adminDestination" error={flightErrors.destinationCode}>
                <select
                  id="adminDestination"
                  className={`input ${flightErrors.destinationCode ? "input-error" : ""}`}
                  value={newFlight.destinationCode}
                  onChange={(event) =>
                    setNewFlight((c) => ({ ...c, destinationCode: event.target.value }))
                  }
                >
                  {airports.map((airport) => (
                    <option key={airport.code} value={airport.code}>
                      {airport.city} ({airport.code})
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Departure date" htmlFor="adminDate" error={flightErrors.date}>
                <input
                  id="adminDate"
                  type="date"
                  className={`input ${flightErrors.date ? "input-error" : ""}`}
                  value={newFlight.date}
                  onChange={(event) => setNewFlight((c) => ({ ...c, date: event.target.value }))}
                />
              </Field>

              <Field label="Departure time" htmlFor="adminTime">
                <input
                  id="adminTime"
                  type="time"
                  className="input"
                  value={newFlight.departTime}
                  onChange={(event) => setNewFlight((c) => ({ ...c, departTime: event.target.value }))}
                />
              </Field>

              <Field
                label="Duration (minutes)"
                htmlFor="adminDuration"
                error={flightErrors.durationMinutes}
              >
                <input
                  id="adminDuration"
                  type="number"
                  min={20}
                  className={`input ${flightErrors.durationMinutes ? "input-error" : ""}`}
                  value={newFlight.durationMinutes}
                  onChange={(event) =>
                    setNewFlight((c) => ({ ...c, durationMinutes: Number(event.target.value) }))
                  }
                />
              </Field>

              <Field label="Base fare (NGN)" htmlFor="adminFare" error={flightErrors.baseFare}>
                <input
                  id="adminFare"
                  type="number"
                  min={1000}
                  step={1000}
                  className={`input ${flightErrors.baseFare ? "input-error" : ""}`}
                  value={newFlight.baseFare}
                  onChange={(event) =>
                    setNewFlight((c) => ({ ...c, baseFare: Number(event.target.value) }))
                  }
                />
              </Field>

              <div className="sm:col-span-2">
                <Field label="Aircraft" htmlFor="adminAircraft">
                  <select
                    id="adminAircraft"
                    className="input"
                    value={newFlight.aircraft}
                    onChange={(event) => setNewFlight((c) => ({ ...c, aircraft: event.target.value }))}
                  >
                    {AIRCRAFT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>

            <button type="submit" className="btn-primary mt-4 w-full sm:w-auto text-center justify-center">
              <Icon name="plus" className="h-4 w-4" />
              Add flight
            </button>
          </form>

          <div className="card">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-title-3 font-semibold text-ink">
                Schedule ({visibleFlights.length} of {flights.length})
              </h2>
              <input
                type="search"
                className="input w-full sm:max-w-xs py-2"
                placeholder="Filter by number, airline or route"
                value={flightSearch}
                onChange={(event) => setFlightSearch(event.target.value)}
                aria-label="Filter flights"
              />
            </div>

            <div className="max-h-[32rem] overflow-auto">
              <table className="table-base">
                <thead className="sticky top-0">
                  <tr>
                    <th scope="col">Flight</th>
                    <th scope="col">Route</th>
                    <th scope="col">Departs</th>
                    <th scope="col">Aircraft</th>
                    <th scope="col">Base fare</th>
                    <th scope="col">Status</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleFlights.slice(0, 250).map((flight) => (
                    <tr key={flight.id}>
                      <td className="font-medium text-ink">{flight.flightNumber}</td>
                      <td>
                        {flight.originCode} → {flight.destinationCode}
                      </td>
                      <td className="whitespace-nowrap">
                        {formatDateShort(flight.departureTime)} {formatTime(flight.departureTime)}
                      </td>
                      <td className="text-caption">{flight.aircraft}</td>
                      <td className="whitespace-nowrap">{formatMoney(flight.baseFare)}</td>
                      <td>
                        <StatusBadge status={flight.status} />
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1.5">
                          <select
                            aria-label={`Change status of ${flight.flightNumber}`}
                            className="pressable rounded border border-line-strong bg-surface px-2 py-1.5 text-caption text-ink"
                            value={flight.status}
                            onChange={(event) =>
                              handleStatusChange(flight, event.target.value as Flight["status"])
                            }
                          >
                            <option value="scheduled">Scheduled</option>
                            <option value="delayed">Delayed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleDeleteFlight(flight)}
                            className="pressable inline-flex items-center gap-1 rounded border border-danger px-2 py-1.5 text-caption font-medium text-danger"
                          >
                            <Icon name="trash" className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visibleFlights.length > 250 && (
                <p className="mt-3 text-caption text-ink-3">
                  Showing the first 250 of {visibleFlights.length} matching flights. Narrow the filter
                  to see more.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ---------------- Bookings ---------------- */}
      {tab === "bookings" && (
        <section className="card">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-title-3 font-semibold text-ink">
              All bookings ({visibleBookings.length})
            </h2>
            <input
              type="search"
              className="input w-full sm:max-w-xs py-2"
              placeholder="Search PNR, name or email"
              value={bookingSearch}
              onChange={(event) => setBookingSearch(event.target.value)}
              aria-label="Search bookings"
            />
          </div>

          {visibleBookings.length === 0 ? (
            <p className="py-8 text-center text-footnote text-ink-3">No bookings match that search.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th scope="col">PNR</th>
                    <th scope="col">Lead passenger</th>
                    <th scope="col">Flight</th>
                    <th scope="col">Pax</th>
                    <th scope="col">Total</th>
                    <th scope="col">Booked</th>
                    <th scope="col">Status</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleBookings.map((booking) => {
                    const flight = flights.find((item) => item.id === booking.flightId);
                    const lead = booking.passengers[0];
                    return (
                      <tr key={booking.pnr}>
                        <td className="font-mono font-semibold text-ink">{booking.pnr}</td>
                        <td>
                          {lead ? `${lead.firstName} ${lead.lastName}` : "—"}
                          <br />
                          <span className="text-caption text-ink-3">{booking.contactEmail}</span>
                        </td>
                        <td className="whitespace-nowrap text-caption">
                          {flight ? (
                            <>
                              {flight.flightNumber}
                              <br />
                              {flight.originCode} → {flight.destinationCode}
                              <br />
                              {formatDateShort(flight.departureTime)}
                            </>
                          ) : (
                            "Flight removed"
                          )}
                        </td>
                        <td>{booking.passengers.length}</td>
                        <td className="whitespace-nowrap">{formatMoney(booking.fare.total)}</td>
                        <td className="whitespace-nowrap text-caption">{formatDate(booking.createdAt)}</td>
                        <td>
                          <StatusBadge status={booking.status} />
                        </td>
                        <td>
                          {booking.status === "confirmed" ? (
                            <button
                              type="button"
                              onClick={() => handleCancelBooking(booking)}
                              className="pressable inline-flex items-center gap-1 rounded border border-danger px-2 py-1.5 text-caption font-medium text-danger"
                            >
                              <Icon name="ban" className="h-3.5 w-3.5" />
                              Cancel
                            </button>
                          ) : (
                            <span className="text-caption text-ink-3">
                              Refunded {formatMoney(booking.refundAmount ?? 0)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ---------------- Users ---------------- */}
      {tab === "users" && (
        <section className="card">
          <h2 className="mb-5 flex items-center gap-2 text-title-3 font-semibold text-ink">
            <Icon name="users" className="h-5 w-5 text-ink-3" />
            Registered users ({users.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Phone</th>
                  <th scope="col">Role</th>
                  <th scope="col">Registered</th>
                  <th scope="col">Bookings</th>
                </tr>
              </thead>
              <tbody>
                {users.map((account) => (
                  <tr key={account.id}>
                    <td className="font-medium text-ink">{account.fullName}</td>
                    <td>{account.email}</td>
                    <td>{account.phone}</td>
                    <td>
                      <span
                        className={`badge ${
                          account.role === "admin"
                            ? "bg-warn-soft text-warn-ink"
                            : "bg-fill text-ink-2"
                        }`}
                      >
                        {account.role}
                      </span>
                    </td>
                    <td className="text-caption">{formatDate(account.createdAt)}</td>
                    <td>{bookings.filter((booking) => booking.userId === account.id).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-caption text-ink-3">
            Password hashes and salts are stored but never displayed. No plain-text password exists
            anywhere in the system.
          </p>
        </section>
      )}

      {/* ---------------- System ---------------- */}
      {tab === "system" && (
        <section className="space-y-5">
          <div className="card">
            <h2 className="flex items-center gap-2 text-title-3 font-semibold text-ink">
              <Icon name="database" className="h-5 w-5 text-ink-3" />
              Storage
            </h2>
            <dl className="mt-3 space-y-2 text-footnote">
              <div className="flex justify-between">
                <dt className="text-ink-2">Approximate size of stored data</dt>
                <dd className="font-medium text-ink">{(usedBytes() / 1024).toFixed(1)} KB</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-2">Typical browser quota</dt>
                <dd className="text-ink">≈ 5,120 KB</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-2">Records held</dt>
                <dd className="text-ink">
                  {flights.length} flights, {bookings.length} bookings, {users.length} users
                </dd>
              </div>
            </dl>
            <div className="mt-3 h-2 w-full rounded-full bg-fill">
              <div
                className="h-2 rounded-full bg-accent"
                style={{ width: `${Math.min(100, (usedBytes() / (5 * 1024 * 1024)) * 100)}%` }}
              />
            </div>
          </div>

          <div className="card">
            <h2 className="flex items-center gap-2 text-title-3 font-semibold text-ink">
              <Icon name="alertTriangle" className="h-5 w-5 text-warn" />
              Reset the system
            </h2>
            <p className="mt-2 text-footnote text-ink-2">
              Deletes every user, booking and flight from this browser and regenerates the seed
              schedule. Useful before a demonstration. This cannot be undone.
            </p>
            <button type="button" onClick={handleReset} className="btn-danger mt-4 w-full sm:w-auto text-center justify-center">
              <Icon name="refresh" className="h-4 w-4" />
              Clear all data and reseed
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
