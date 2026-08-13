/** Shared fixtures for the test suite. */

import { AIRCRAFT_LAYOUTS, toLocalIso } from "@/lib/seed";
import type { Booking, Flight, Passenger } from "@/lib/types";

/** A flight departing `daysAhead` days from now, on a 737 by default. */
export function makeFlight(overrides: Partial<Flight> = {}, daysAhead = 10): Flight {
  const departure = new Date();
  departure.setDate(departure.getDate() + daysAhead);
  departure.setHours(9, 0, 0, 0);

  const durationMinutes = overrides.durationMinutes ?? 70;
  const arrival = new Date(departure.getTime() + durationMinutes * 60_000);

  return {
    id: "TST100-fixture",
    flightNumber: "TST100",
    airline: "Test Air",
    airlineCode: "TS",
    originCode: "LOS",
    destinationCode: "ABV",
    departureTime: toLocalIso(departure),
    arrivalTime: toLocalIso(arrival),
    durationMinutes,
    aircraft: "Boeing 737-800",
    baseFare: 100_000,
    currency: "NGN",
    cabins: AIRCRAFT_LAYOUTS["Boeing 737-800"],
    blockedSeats: [],
    status: "scheduled",
    ...overrides,
  };
}

export function makePassenger(overrides: Partial<Passenger> = {}): Passenger {
  return {
    id: "pax_test",
    title: "Mr",
    firstName: "Chidi",
    lastName: "Okafor",
    dateOfBirth: "1995-04-12",
    gender: "male",
    passportNumber: "A1234567",
    type: "adult",
    seatId: "12A",
    ...overrides,
  };
}

/** A confirmed booking occupying the given seats on a flight. */
export function makeBooking(flightId: string, seatIds: string[], overrides: Partial<Booking> = {}): Booking {
  return {
    pnr: "TESTPN",
    userId: "usr_test",
    flightId,
    cabin: "economy",
    passengers: seatIds.map((seatId, index) =>
      makePassenger({ id: `pax_${index}`, seatId, lastName: "Okafor" }),
    ),
    fare: {
      baseFareTotal: 100_000,
      cabinSurcharge: 0,
      seatSelectionFee: 2_000,
      taxes: 7_650,
      serviceCharge: 2_500,
      total: 112_150,
    },
    payment: null,
    status: "confirmed",
    contactEmail: "test@example.com",
    contactPhone: "08031234567",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/** Wipe every SkyRoute key between tests so each starts from a clean slate. */
export function clearStorage(): void {
  if (typeof window === "undefined") return;
  window.localStorage.clear();
}
