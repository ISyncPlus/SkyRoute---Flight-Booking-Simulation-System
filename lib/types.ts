/**
 * SkyRoute Flight Booking Simulation System
 * ------------------------------------------
 * Domain model definitions.
 *
 * These types form the "Model" layer of the system's MVC / layered
 * architecture. Every module in the application programs against these
 * interfaces rather than against the storage mechanism, which is why the
 * persistence layer (localStorage) can be swapped for a real database
 * without changing business logic.
 */

export type CabinClass = "economy" | "business" | "first";

export type PassengerType = "adult" | "child" | "infant";

export type BookingStatus = "confirmed" | "cancelled" | "pending";

export type PaymentStatus = "successful" | "failed" | "pending";

export type UserRole = "customer" | "admin";

export type SeatStatus = "available" | "occupied" | "blocked";

/** A physical airport served by the simulation. */
export interface Airport {
  code: string; // IATA code, e.g. "LOS"
  city: string;
  name: string;
  country: string;
}

/** Aircraft cabin configuration used to generate a seat map. */
export interface CabinConfig {
  cabin: CabinClass;
  startRow: number;
  endRow: number;
  columns: string[]; // e.g. ["A", "B", "C", "D", "E", "F"]
}

/** A scheduled flight in the simulation. */
export interface Flight {
  id: string;
  flightNumber: string;
  airline: string;
  airlineCode: string;
  originCode: string;
  destinationCode: string;
  departureTime: string; // ISO-8601
  arrivalTime: string; // ISO-8601
  durationMinutes: number;
  aircraft: string;
  baseFare: number; // in NGN, economy adult reference fare
  currency: string;
  cabins: CabinConfig[];
  /** Seat IDs that are unavailable for reasons other than booking (crew rest, etc.). */
  blockedSeats: string[];
  status: "scheduled" | "delayed" | "cancelled";
}

/** A single seat on a flight, derived from the flight's cabin configuration. */
export interface Seat {
  id: string; // e.g. "12A"
  row: number;
  column: string;
  cabin: CabinClass;
  isWindow: boolean;
  isAisle: boolean;
  isExitRow: boolean;
  status: SeatStatus;
}

/** A traveller on a booking. */
export interface Passenger {
  id: string;
  title: "Mr" | "Mrs" | "Miss" | "Ms" | "Dr";
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender: "male" | "female";
  passportNumber: string;
  type: PassengerType;
  /**
   * The seat held on a *one-segment* booking, kept so that a single-flight
   * itinerary reads without indexing into segments. On any booking with more
   * than one flight this is `null` and {@link BookingSegment.seats} is the
   * only truth — a passenger sits somewhere different on the way back.
   */
  seatId: string | null;
}

/** How many flights a journey is made of, and in what shape. */
export type TripType = "one-way" | "round-trip" | "multi-city";

export const TRIP_TYPE_LABELS: Record<TripType, string> = {
  "round-trip": "Round trip",
  "one-way": "One way",
  "multi-city": "Multi-city",
};

/**
 * One flight inside a booking. Seats live here rather than on the passenger
 * because the same traveller holds a different seat on each leg.
 */
export interface BookingSegment {
  flightId: string;
  cabin: CabinClass;
  /** Passenger id → seat id. `null` for an infant, who travels on a lap. */
  seats: Record<string, string | null>;
}

/** Itemised fare so the user can see exactly what they are paying for. */
export interface FareBreakdown {
  baseFareTotal: number;
  cabinSurcharge: number;
  seatSelectionFee: number;
  taxes: number;
  serviceCharge: number;
  total: number;
}

/** Simulated payment record. No real money movement occurs. */
export interface Payment {
  id: string;
  method: "card" | "transfer" | "wallet";
  maskedCardNumber: string;
  cardHolder: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  transactionReference: string;
  paidAt: string;
  failureReason?: string;
}

/** A completed reservation, identified by its PNR. */
export interface Booking {
  pnr: string;
  /**
   * The account this booking belongs to, or `null` when it was made as a
   * guest. A guest booking is reached only through its reference and surname
   * on the manage page — it will never appear in anybody's "my bookings".
   */
  userId: string | null;
  flightId: string;
  cabin: CabinClass;
  tripType?: TripType;
  /**
   * Every flight on the journey, in the order they are flown. A one-way
   * booking has one; a return has two; multi-city has as many as were built.
   */
  segments?: BookingSegment[];
  passengers: Passenger[];
  fare: FareBreakdown;
  payment: Payment | null;
  status: BookingStatus;
  contactEmail: string;
  contactPhone: string;
  createdAt: string;
  cancelledAt?: string;
  refundAmount?: number;
}

/**
 * Every flight on a booking, in flown order — the one place that knows how to
 * read either shape.
 *
 * `segments` is authoritative when present. Bookings written before multi-leg
 * journeys existed (and any single-flight booking that never needed the richer
 * shape) carry `flightId`/`cabin` with the seat on the passenger instead, and
 * are widened here into a one-segment journey. Callers get a plain array and
 * never have to know which era a booking came from — without this, every
 * consumer grows its own fallback and they drift apart.
 */
export function bookingSegments(booking: Booking): BookingSegment[] {
  if (booking.segments?.length) return booking.segments;

  return [
    {
      flightId: booking.flightId,
      cabin: booking.cabin,
      seats: Object.fromEntries(
        booking.passengers.map((passenger) => [passenger.id, passenger.seatId]),
      ),
    },
  ];
}

/** A registered account. Passwords are never stored in plain text. */
export interface User {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
  avatar?: string;
  picture?: string;
  image?: string;
  createdAt: string;
}

/** The signed-in principal held in session storage. */
export interface SessionUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  avatar?: string;
  picture?: string;
  image?: string;
}


/** One origin/destination/date row of a search. */
export interface SearchLeg {
  originCode: string;
  destinationCode: string;
  departureDate: string; // YYYY-MM-DD
}

/** Search criteria supplied on the home page. */
export interface SearchCriteria {
  originCode: string;
  destinationCode: string;
  departureDate: string; // YYYY-MM-DD
  /** Defaults to one-way when absent, which is how every older link behaves. */
  tripType?: TripType;
  /** Set only for a round trip. */
  returnDate?: string; // YYYY-MM-DD
  /** Set only for multi-city: the second and subsequent legs. */
  extraLegs?: SearchLeg[];
  cabin: CabinClass;
  adults: number;
  children: number;
  infants: number;
}

/** A flight returned by a search, enriched with live availability + price. */
export interface FlightSearchResult {
  flight: Flight;
  origin: Airport;
  destination: Airport;
  seatsAvailable: number;
  seatsTotal: number;
  pricePerAdult: number;
  estimatedTotal: number;
}

/** Shape of the entire persisted application state. */
export interface PersistedState {
  schemaVersion: number;
  airports: Airport[];
  flights: Flight[];
  users: User[];
  bookings: Booking[];
}
