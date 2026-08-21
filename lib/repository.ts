/**
 * Repository layer.
 * -----------------
 * All business operations that read or mutate persisted state live here.
 * The UI never touches `storage.ts` directly; it calls these functions.
 *
 * Every mutation follows the same shape:
 *   1. read current state
 *   2. validate the request against that state
 *   3. write the new state
 *   4. return a discriminated result the caller can branch on
 *
 * Functions return `{ ok: true, ... }` or `{ ok: false, error }` rather than
 * throwing, so the UI can render a message without try/catch scattered
 * everywhere.
 */

import { createUserRecord, DEMO_ADMIN, DEMO_CUSTOMER, toSessionUser, verifyPassword } from "./auth";
import { generateId, generateTransactionReference, generateUniquePnr, isValidPnr } from "./ids";
import { api } from "./api";
import {
  calculateFare,
  calculateRefund,
  combineFares,
  daysUntil,
  headlineFare,
  type FareContext,
} from "./pricing";
import { buildSeatMap, countAvailable, countTotal, loadFactor, validateSeatSelection } from "./seats";
import { AIRPORTS, findAirport, generateSchedule, SCHEDULE_HORIZON_DAYS, toDateKey } from "./seed";
import { readItem, removeItem, SCHEMA_VERSION, writeItem } from "./storage";
import type {
  Airport,
  Booking,
  CabinClass,
  FareBreakdown,
  Flight,
  FlightSearchResult,
  Passenger,
  Payment,
  PersistedState,
  SearchCriteria,
  SessionUser,
  TripType,
  User,
} from "./types";
import { bookingSegments } from "./types";
import { maskCardNumber, sanitiseText } from "./validation";

export const KEYS = {
  state: "state",
  session: "session",
  draft: "booking-draft",
  guest: "guest",
} as const;

export type Result<T> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };

const EMPTY_STATE: PersistedState = {
  schemaVersion: SCHEMA_VERSION,
  airports: AIRPORTS,
  flights: [],
  users: [],
  bookings: [],
};

/* ------------------------------------------------------------------ */
/* State access                                                        */
/* ------------------------------------------------------------------ */

/** Read the whole persisted state, falling back to an empty state. */
export function loadState(): PersistedState {
  const state = readItem<PersistedState>(KEYS.state, EMPTY_STATE);

  // Defensive: a hand-edited or partially written value must not crash the app.
  return {
    schemaVersion: state.schemaVersion ?? SCHEMA_VERSION,
    airports: Array.isArray(state.airports) && state.airports.length > 0 ? state.airports : AIRPORTS,
    flights: Array.isArray(state.flights) ? state.flights : [],
    users: Array.isArray(state.users) ? state.users : [],
    bookings: Array.isArray(state.bookings) ? state.bookings : [],
  };
}

export function saveState(state: PersistedState): boolean {
  return writeItem(KEYS.state, state);
}

/**
 * Seed the schedule and demo accounts on first run, and top the schedule up
 * whenever it has thinned out (because generated departures fall into the
 * past as real time advances).
 */
export async function ensureSeeded(): Promise<PersistedState> {
  const state = loadState();
  let changed = false;

  // Try fetching authoritative airports from backend
  try {
    const airportsRes = await api.flights.listAirports();
    if (airportsRes.ok && airportsRes.data.airports.length > 0) {
      state.airports = airportsRes.data.airports;
      changed = true;
    }
  } catch {
    // Fallback to local airports
  }

  const upcoming = state.flights.filter((flight) => new Date(flight.departureTime).getTime() > Date.now());
  const horizonEnd = new Date();
  horizonEnd.setDate(horizonEnd.getDate() + SCHEDULE_HORIZON_DAYS - 3);
  const hasFarFutureFlights = upcoming.some((flight) => new Date(flight.departureTime) > horizonEnd);

  if (upcoming.length === 0 || !hasFarFutureFlights) {
    const existingIds = new Set(upcoming.map((flight) => flight.id));
    const generated = generateSchedule().filter((flight) => !existingIds.has(flight.id));
    // Keep any flights the administrator created manually.
    state.flights = [...upcoming, ...generated];
    changed = true;
  }

  if (state.users.length === 0) {
    const admin = await createUserRecord({ ...DEMO_ADMIN, role: "admin" });
    const customer = await createUserRecord({ ...DEMO_CUSTOMER, role: "customer" });
    state.users = [admin, customer];
    changed = true;
  }

  if (state.airports.length === 0) {
    state.airports = AIRPORTS;
    changed = true;
  }

  if (changed) saveState(state);
  return state;
}


/** Wipe all application data and rebuild from seed. Used by the admin panel. */
export async function resetSystem(): Promise<PersistedState> {
  removeItem(KEYS.state);
  removeItem(KEYS.session);
  removeItem(KEYS.draft);
  removeItem(KEYS.guest);
  return ensureSeeded();
}

/* ------------------------------------------------------------------ */
/* Session                                                             */
/* ------------------------------------------------------------------ */

export function getSession(): SessionUser | null {
  return readItem<SessionUser | null>(KEYS.session, null);
}

export function setSession(user: SessionUser | null): void {
  if (user === null) removeItem(KEYS.session);
  else writeItem(KEYS.session, user);
}

export function isGuestMode(): boolean {
  return readItem<boolean>(KEYS.guest, false);
}

export function setGuestMode(active: boolean): void {
  if (active) writeItem(KEYS.guest, true);
  else removeItem(KEYS.guest);
}

export async function register(input: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}): Promise<Result<SessionUser>> {
  const state = loadState();
  const email = input.email.trim().toLowerCase();

  if (state.users.some((user) => user.email === email)) {
    return { ok: false, error: "An account with that email address already exists.", fieldErrors: { email: "Email already registered." } };
  }

  const user = await createUserRecord({ ...input, email });
  state.users.push(user);

  if (!saveState(state)) {
    return { ok: false, error: "Could not save your account. Your browser storage may be full or disabled." };
  }

  const session = toSessionUser(user);
  setSession(session);
  return { ok: true, data: session };
}

export async function login(email: string, password: string): Promise<Result<SessionUser>> {
  const state = loadState();
  const user = state.users.find((candidate) => candidate.email === email.trim().toLowerCase());

  // The same message is returned whether the email or the password was wrong,
  // so an attacker cannot use the response to enumerate registered accounts.
  const genericError = "Incorrect email address or password.";
  if (!user) return { ok: false, error: genericError };

  const matches = await verifyPassword(password, user);
  if (!matches) return { ok: false, error: genericError };

  const session = toSessionUser(user);
  setSession(session);
  return { ok: true, data: session };
}

export function logout(): void {
  setSession(null);
}

export function listUsers(): User[] {
  return loadState().users;
}

/* ------------------------------------------------------------------ */
/* Flights and search                                                  */
/* ------------------------------------------------------------------ */

export function listFlights(): Flight[] {
  return loadState().flights;
}

export function getFlight(flightId: string): Flight | undefined {
  return loadState().flights.find((flight) => flight.id === flightId);
}

export function listAirports(): Airport[] {
  return loadState().airports;
}

/** Cabins actually fitted to an aircraft, so the UI never offers an empty cabin. */
export function availableCabins(flight: Flight): CabinClass[] {
  return flight.cabins.map((cabin) => cabin.cabin);
}

/** Build the priced, availability-aware view of one flight. */
export function toSearchResult(
  flight: Flight,
  bookings: Booking[],
  airports: Airport[],
  criteria: Pick<SearchCriteria, "cabin" | "adults" | "children" | "infants">,
  now: Date = new Date(),
): FlightSearchResult | null {
  const origin = findAirport(flight.originCode, airports);
  const destination = findAirport(flight.destinationCode, airports);
  if (!origin || !destination) return null;

  const seatMap = buildSeatMap(flight, bookings);
  const cabin = availableCabins(flight).includes(criteria.cabin) ? criteria.cabin : "economy";

  const context: FareContext = {
    baseFare: flight.baseFare,
    cabin,
    daysToDeparture: daysUntil(flight.departureTime, now),
    load: loadFactor(seatMap, cabin),
  };

  const pricePerAdult = headlineFare(context);
  const quote = calculateFare(
    context,
    [
      ...Array.from({ length: criteria.adults }, () => ({ type: "adult" as const, seatId: null })),
      ...Array.from({ length: criteria.children }, () => ({ type: "child" as const, seatId: null })),
      ...Array.from({ length: criteria.infants }, () => ({ type: "infant" as const, seatId: null })),
    ],
    seatMap,
  );

  return {
    flight,
    origin,
    destination,
    seatsAvailable: countAvailable(seatMap, cabin),
    seatsTotal: countTotal(seatMap, cabin),
    pricePerAdult,
    estimatedTotal: quote.total,
  };
}

/**
 * Core search. Matches origin, destination and calendar date, excludes
 * cancelled and departed flights, and excludes flights without enough
 * remaining seats in the requested cabin.
 */
export function searchFlights(criteria: SearchCriteria, now: Date = new Date()): FlightSearchResult[] {
  const state = loadState();
  const seatsNeeded = criteria.adults + criteria.children; // infants travel on a lap

  return state.flights
    .filter((flight) => {
      if (flight.status === "cancelled") return false;
      if (flight.originCode !== criteria.originCode) return false;
      if (flight.destinationCode !== criteria.destinationCode) return false;
      if (toDateKey(new Date(flight.departureTime)) !== criteria.departureDate) return false;
      if (new Date(flight.departureTime).getTime() <= now.getTime()) return false;
      return true;
    })
    .map((flight) => toSearchResult(flight, state.bookings, state.airports, criteria, now))
    .filter((result): result is FlightSearchResult => result !== null)
    .filter((result) => result.seatsAvailable >= seatsNeeded)
    .sort((a, b) => new Date(a.flight.departureTime).getTime() - new Date(b.flight.departureTime).getTime());
}

/** Dates within the horizon that have at least one flight on a route. */
export function datesWithFlights(originCode: string, destinationCode: string): string[] {
  const state = loadState();
  const dates = new Set<string>();
  state.flights.forEach((flight) => {
    if (flight.originCode !== originCode || flight.destinationCode !== destinationCode) return;
    if (flight.status === "cancelled") return;
    if (new Date(flight.departureTime).getTime() <= Date.now()) return;
    dates.add(toDateKey(new Date(flight.departureTime)));
  });
  return Array.from(dates).sort();
}

/** Seat map for a flight, computed from the current bookings. */
export function getSeatMap(flightId: string) {
  const state = loadState();
  const flight = state.flights.find((candidate) => candidate.id === flightId);
  if (!flight) return null;
  return buildSeatMap(flight, state.bookings);
}

/* ------------------------------------------------------------------ */
/* Booking                                                             */
/* ------------------------------------------------------------------ */

/** One flight of a journey, as the booking wizard hands it over. */
export interface CreateBookingLeg {
  flightId: string;
  cabin: CabinClass;
  /**
   * Seat per passenger, positionally matching `passengers`. `null` where the
   * passenger is an infant or simply has no seat on this leg — a traveller
   * can sit in 12A outbound and 3C on the way home.
   */
  seatIds: (string | null)[];
}

export interface CreateBookingInput {
  /**
   * A one-flight booking may still pass `flightId`/`cabin` with the seat on
   * each passenger; `legs` supersedes both when present. Keeping the old shape
   * working means every existing caller and test stays valid.
   */
  flightId?: string;
  cabin?: CabinClass;
  legs?: CreateBookingLeg[];
  tripType?: TripType;
  /** `null` books as a guest — see {@link Booking.userId}. */
  userId: string | null;
  contactEmail: string;
  contactPhone: string;
  passengers: Omit<Passenger, "id">[];
  payment: {
    method: Payment["method"];
    cardHolder?: string;
    cardNumber?: string;
    senderName?: string;
    /** Set to true to exercise the failed-payment path during testing. */
    forceFailure?: boolean;
  };
}

/**
 * Create a booking. This is the system's most important transaction, so it
 * re-validates everything at the moment of writing rather than trusting the
 * state the UI was holding.
 */
export function createBooking(input: CreateBookingInput, now: Date = new Date()): Result<Booking> {
  const state = loadState();

  if (input.passengers.length === 0) return { ok: false, error: "At least one passenger is required." };

  /* One shape from here down. A caller that passed the old single-flight
     fields is widened into a one-leg journey, so nothing below has to ask
     which shape it was given. */
  const legs: CreateBookingLeg[] = input.legs?.length
    ? input.legs
    : [
        {
          flightId: input.flightId ?? "",
          cabin: (input.cabin ?? "economy") as CabinClass,
          seatIds: input.passengers.map((passenger) => passenger.seatId ?? null),
        },
      ];

  /* Everything is validated for *every* leg before anything is written. A
     journey is sold whole: confirming the outbound and then discovering the
     return is full would leave the customer stranded mid-itinerary with a
     booking they did not ask for. */
  const priced: { flight: Flight; leg: CreateBookingLeg; fare: FareBreakdown }[] = [];

  for (const [index, leg] of legs.entries()) {
    const flight = state.flights.find((candidate) => candidate.id === leg.flightId);
    // Only name the flight when there is more than one, so a one-way booking
    // keeps the plain wording its tests and its UI already expect.
    const where = legs.length > 1 ? ` on flight ${index + 1}` : "";

    if (!flight) {
      return { ok: false, error: `That flight could not be found${where}. It may have been removed.` };
    }
    if (flight.status === "cancelled") {
      return { ok: false, error: `This flight has been cancelled and cannot be booked${where}.` };
    }
    if (new Date(flight.departureTime).getTime() <= now.getTime()) {
      return { ok: false, error: `This flight has already departed${where}.` };
    }
    if (!availableCabins(flight).includes(leg.cabin)) {
      return { ok: false, error: `The selected cabin is not available on this aircraft${where}.` };
    }

    // Re-check seats: another tab may have taken them while this user was paying.
    const requestedSeats = leg.seatIds.filter((seatId): seatId is string => Boolean(seatId));
    const seatCheck = validateSeatSelection(flight, state.bookings, requestedSeats, leg.cabin);
    if (!seatCheck.valid) {
      return {
        ok: false,
        error: seatCheck.message ?? `One or more selected seats are unavailable${where}.`,
      };
    }

    const seatMap = buildSeatMap(flight, state.bookings);
    const context: FareContext = {
      baseFare: flight.baseFare,
      cabin: leg.cabin,
      daysToDeparture: daysUntil(flight.departureTime, now),
      load: loadFactor(seatMap, leg.cabin),
    };

    priced.push({
      flight,
      leg,
      fare: calculateFare(
        context,
        input.passengers.map((passenger, position) => ({
          type: passenger.type,
          seatId: leg.seatIds[position] ?? null,
        })),
        seatMap,
      ),
    });
  }

  const flight = priced[0].flight;
  // Charges the booking service fee once, not once per flight.
  const fare = combineFares(priced.map((entry) => entry.fare));

  // Payment authorisation according to method.
  const paymentSucceeded = !input.payment.forceFailure;
  let maskedCardNumber = "";
  let cardHolderName = "";
  let failureReason = "Payment declined by issuing provider.";

  if (input.payment.method === "transfer") {
    maskedCardNumber = "Bank Transfer (Providus Bank · 1305012345)";
    cardHolderName = sanitiseText(
      input.payment.senderName || input.payment.cardHolder || input.contactEmail || "Bank Transfer Depositor",
      80,
    );
    failureReason = "Bank transfer clearing failed or timed out.";
  } else if (input.payment.method === "wallet") {
    maskedCardNumber = "SkyRoute Digital Wallet";
    cardHolderName = sanitiseText(
      input.payment.cardHolder || input.contactEmail || "SkyRoute Wallet Account",
      80,
    );
    failureReason = "Insufficient wallet balance.";
  } else {
    maskedCardNumber = maskCardNumber(input.payment.cardNumber ?? "");
    cardHolderName = sanitiseText(input.payment.cardHolder ?? "", 80);
    failureReason = "Card declined by issuing bank.";
  }

  const payment: Payment = {
    id: generateId("pay"),
    method: input.payment.method,
    maskedCardNumber,
    cardHolder: cardHolderName,
    amount: fare.total,
    currency: flight.currency,
    status: paymentSucceeded ? "successful" : "failed",
    transactionReference: generateTransactionReference(),
    paidAt: now.toISOString(),
    ...(paymentSucceeded ? {} : { failureReason }),
  };

  if (!paymentSucceeded) {
    return { ok: false, error: `Payment failed: ${payment.failureReason} No seats were reserved.` };
  }

  const pnr = generateUniquePnr(state.bookings.map((booking) => booking.pnr));

  const passengers: Passenger[] = input.passengers.map((passenger, position) => ({
    ...passenger,
    id: generateId("pax"),
    firstName: sanitiseText(passenger.firstName, 50),
    lastName: sanitiseText(passenger.lastName, 50),
    passportNumber: sanitiseText(passenger.passportNumber, 20).toUpperCase(),
    /* Only meaningful on a single-flight booking. Across several flights a
       passenger holds a different seat on each, so the segment is the only
       honest place to record it and this is left null rather than naming one
       leg's seat as if it applied to the whole journey. */
    seatId: legs.length === 1 ? (legs[0].seatIds[position] ?? null) : null,
  }));

  const booking: Booking = {
    pnr,
    userId: input.userId,
    flightId: flight.id,
    cabin: legs[0].cabin,
    tripType: input.tripType ?? (legs.length > 1 ? "multi-city" : "one-way"),
    segments: priced.map(({ leg }) => ({
      flightId: leg.flightId,
      cabin: leg.cabin,
      seats: Object.fromEntries(
        passengers.map((passenger, position) => [passenger.id, leg.seatIds[position] ?? null]),
      ),
    })),
    passengers,
    fare,
    payment,
    status: "confirmed",
    contactEmail: sanitiseText(input.contactEmail, 120).toLowerCase(),
    contactPhone: sanitiseText(input.contactPhone, 20),
    createdAt: now.toISOString(),
  };

  state.bookings.push(booking);

  if (!saveState(state)) {
    return { ok: false, error: "Booking could not be saved. Your browser storage may be full." };
  }

  return { ok: true, data: booking };
}

export function findBookingByPnr(pnr: string): Booking | undefined {
  if (!isValidPnr(pnr)) return undefined;
  return loadState().bookings.find((booking) => booking.pnr === pnr.trim().toUpperCase());
}

/**
 * Retrieve a booking by PNR and surname - the standard "manage my booking"
 * lookup that works without an account.
 */
export function findBookingByPnrAndSurname(pnr: string, surname: string): Booking | undefined {
  const booking = findBookingByPnr(pnr);
  if (!booking) return undefined;
  const normalised = surname.trim().toLowerCase();
  const matches = booking.passengers.some((passenger) => passenger.lastName.toLowerCase() === normalised);
  return matches ? booking : undefined;
}

export function listBookingsForUser(userId: string): Booking[] {
  return loadState()
    .bookings.filter((booking) => booking.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function listAllBookings(): Booking[] {
  return loadState().bookings.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/**
 * Who is asking to cancel. A signed-in account is identified by its session; a
 * guest is identified only by the surname they typed on the manage page, which
 * is checked here against the booking's passengers.
 *
 * Modelled as a union rather than an optional surname so that a caller cannot
 * quietly pass neither and land in an unguarded branch.
 */
export type CancelRequester =
  | SessionUser
  | { kind: "account"; user: SessionUser }
  | { kind: "guest"; surname: string };

/**
 * Cancel a booking and compute the refund. `requestedBy` enforces ownership:
 * a customer may only cancel their own booking, an administrator may cancel
 * any booking, and a guest may cancel only a booking that carries no account
 * and whose surname they can produce.
 */
export function cancelBooking(
  pnr: string,
  requestedBy: CancelRequester,
  now: Date = new Date(),
): Result<{ booking: Booking; refund: number }> {
  const state = loadState();
  const index = state.bookings.findIndex((booking) => booking.pnr === pnr.trim().toUpperCase());

  if (index === -1) return { ok: false, error: "No booking was found with that reference." };

  const booking = state.bookings[index];

  let accountUser: SessionUser | undefined;
  if ("kind" in requestedBy) {
    if (requestedBy.kind === "guest") {
      const normalised = requestedBy.surname.trim().toLowerCase();
      const surnameMatches = booking.passengers.some(
        (passenger) => passenger.lastName.toLowerCase() === normalised,
      );
      if (booking.userId !== null || !surnameMatches) {
        return { ok: false, error: "You do not have permission to cancel this booking." };
      }
    } else {
      accountUser = requestedBy.user;
    }
  } else {
    accountUser = requestedBy;
  }

  if (accountUser && accountUser.role !== "admin" && booking.userId !== accountUser.id) {
    return { ok: false, error: "You do not have permission to cancel this booking." };
  }
  if (booking.status === "cancelled") return { ok: false, error: "This booking has already been cancelled." };

  /* A journey is cancelled as a whole, so the rule is anchored to its *first*
     departure. Anchoring to a later leg would let someone cancel a return
     trip after already flying the outbound and still collect the early-notice
     refund rate on the entire fare. */
  const flights = bookingSegments(booking)
    .map((segment) => state.flights.find((candidate) => candidate.id === segment.flightId))
    .filter((candidate): candidate is Flight => Boolean(candidate));

  if (flights.length === 0) return { ok: false, error: "The flight for this booking no longer exists." };

  const firstDeparture = flights
    .map((candidate) => candidate.departureTime)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];

  if (new Date(firstDeparture).getTime() <= now.getTime()) {
    return {
      ok: false,
      error:
        flights.length > 1
          ? "This journey has already begun and can no longer be cancelled."
          : "This flight has already departed and can no longer be cancelled.",
    };
  }

  const refund = calculateRefund(booking.fare, firstDeparture, now);

  const cancelled: Booking = {
    ...booking,
    status: "cancelled",
    cancelledAt: now.toISOString(),
    refundAmount: refund,
  };

  state.bookings[index] = cancelled;

  if (!saveState(state)) return { ok: false, error: "Cancellation could not be saved." };

  return { ok: true, data: { booking: cancelled, refund } };
}

/* ------------------------------------------------------------------ */
/* Administration                                                      */
/* ------------------------------------------------------------------ */

function requireAdmin(actor: SessionUser | null): string | null {
  if (!actor) return "You must be signed in to perform this action.";
  if (actor.role !== "admin") return "Administrator privileges are required for this action.";
  return null;
}

export function createFlight(actor: SessionUser | null, flight: Flight): Result<Flight> {
  const denial = requireAdmin(actor);
  if (denial) return { ok: false, error: denial };

  const state = loadState();
  if (state.flights.some((candidate) => candidate.id === flight.id)) {
    return { ok: false, error: "A flight with that number already exists on that date and time." };
  }
  if (new Date(flight.arrivalTime) <= new Date(flight.departureTime)) {
    return { ok: false, error: "Arrival time must be after departure time." };
  }

  state.flights.push(flight);
  if (!saveState(state)) return { ok: false, error: "The flight could not be saved." };
  return { ok: true, data: flight };
}

export function updateFlight(actor: SessionUser | null, flightId: string, changes: Partial<Flight>): Result<Flight> {
  const denial = requireAdmin(actor);
  if (denial) return { ok: false, error: denial };

  const state = loadState();
  const index = state.flights.findIndex((flight) => flight.id === flightId);
  if (index === -1) return { ok: false, error: "That flight could not be found." };

  const updated = { ...state.flights[index], ...changes, id: flightId };
  if (new Date(updated.arrivalTime) <= new Date(updated.departureTime)) {
    return { ok: false, error: "Arrival time must be after departure time." };
  }

  state.flights[index] = updated;
  if (!saveState(state)) return { ok: false, error: "The flight could not be updated." };
  return { ok: true, data: updated };
}

/**
 * Deleting a flight that already carries passengers would orphan those
 * bookings, so it is refused. The administrator must cancel the flight
 * instead, which preserves the booking history.
 */
export function deleteFlight(actor: SessionUser | null, flightId: string): Result<{ flightId: string }> {
  const denial = requireAdmin(actor);
  if (denial) return { ok: false, error: denial };

  const state = loadState();
  const hasBookings = state.bookings.some(
    (booking) => booking.flightId === flightId && booking.status === "confirmed",
  );
  if (hasBookings) {
    return {
      ok: false,
      error: "This flight has confirmed bookings. Set its status to cancelled instead of deleting it.",
    };
  }

  const remaining = state.flights.filter((flight) => flight.id !== flightId);
  if (remaining.length === state.flights.length) return { ok: false, error: "That flight could not be found." };

  state.flights = remaining;
  if (!saveState(state)) return { ok: false, error: "The flight could not be deleted." };
  return { ok: true, data: { flightId } };
}

export interface SystemStats {
  totalFlights: number;
  scheduledFlights: number;
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  totalPassengers: number;
  grossRevenue: number;
  refunded: number;
  netRevenue: number;
  registeredUsers: number;
  topRoutes: { route: string; bookings: number }[];
}

/** Aggregated figures for the administrator dashboard. */
export function getStats(): SystemStats {
  const state = loadState();
  const confirmed = state.bookings.filter((booking) => booking.status === "confirmed");
  const cancelled = state.bookings.filter((booking) => booking.status === "cancelled");
  const flightsById = new Map(state.flights.map((flight) => [flight.id, flight]));

  const routeCounts = new Map<string, number>();
  confirmed.forEach((booking) => {
    const flight = flightsById.get(booking.flightId);
    if (!flight) return;
    const route = `${flight.originCode} to ${flight.destinationCode}`;
    routeCounts.set(route, (routeCounts.get(route) ?? 0) + 1);
  });

  const grossRevenue = confirmed.reduce((sum, booking) => sum + booking.fare.total, 0);
  const refunded = cancelled.reduce((sum, booking) => sum + (booking.refundAmount ?? 0), 0);

  return {
    totalFlights: state.flights.length,
    scheduledFlights: state.flights.filter((flight) => flight.status === "scheduled").length,
    totalBookings: state.bookings.length,
    confirmedBookings: confirmed.length,
    cancelledBookings: cancelled.length,
    totalPassengers: confirmed.reduce((sum, booking) => sum + booking.passengers.length, 0),
    grossRevenue,
    refunded,
    netRevenue: grossRevenue - refunded,
    registeredUsers: state.users.length,
    topRoutes: Array.from(routeCounts.entries())
      .map(([route, bookings]) => ({ route, bookings }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 5),
  };
}

/* ------------------------------------------------------------------ */
/* Booking draft (carries selections between the wizard steps)         */
/* ------------------------------------------------------------------ */

export interface BookingDraft {
  flightId: string;
  cabin: CabinClass;
  criteria: SearchCriteria;
  seatIds: string[];
  passengers: Omit<Passenger, "id">[];
  contactEmail: string;
  contactPhone: string;
  step: number;
}

export function saveDraft(draft: BookingDraft): void {
  writeItem(KEYS.draft, draft);
}

export function loadDraft(): BookingDraft | null {
  return readItem<BookingDraft | null>(KEYS.draft, null);
}

export function clearDraft(): void {
  removeItem(KEYS.draft);
}
