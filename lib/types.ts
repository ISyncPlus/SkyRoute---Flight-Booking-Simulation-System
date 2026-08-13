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
  seatId: string | null;
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
  userId: string;
  flightId: string;
  cabin: CabinClass;
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

/** A registered account. Passwords are never stored in plain text. */
export interface User {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  phone: string;
  role: UserRole;
  createdAt: string;
}

/** The signed-in principal held in session storage. */
export interface SessionUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
}

/** Search criteria supplied on the home page. */
export interface SearchCriteria {
  originCode: string;
  destinationCode: string;
  departureDate: string; // YYYY-MM-DD
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
