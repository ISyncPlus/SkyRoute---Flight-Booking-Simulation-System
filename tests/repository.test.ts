/**
 * Integration tests: the repository layer against real browser storage.
 * These exercise the end-to-end write path - register, search, book, cancel -
 * and the authorisation rules that protect the administrative operations.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  cancelBooking,
  createBooking,
  createFlight,
  deleteFlight,
  findBookingByPnr,
  findBookingByPnrAndSurname,
  getStats,
  listBookingsForUser,
  loadState,
  login,
  register,
  saveState,
  searchFlights,
  updateFlight,
} from "@/lib/repository";
import { AIRPORTS, toDateKey } from "@/lib/seed";
import { SCHEMA_VERSION } from "@/lib/storage";
import type { SessionUser } from "@/lib/types";
import { clearStorage, makeFlight } from "./helpers";

const CUSTOMER: SessionUser = {
  id: "usr_customer",
  fullName: "Ada Okonkwo",
  email: "ada@example.com",
  role: "customer",
};

const OTHER_CUSTOMER: SessionUser = { ...CUSTOMER, id: "usr_other", email: "other@example.com" };
const ADMIN: SessionUser = { id: "usr_admin", fullName: "Admin", email: "admin@x.test", role: "admin" };

const flight = makeFlight();

function seedFlight() {
  saveState({
    schemaVersion: SCHEMA_VERSION,
    airports: AIRPORTS,
    flights: [flight],
    users: [],
    bookings: [],
  });
}

function bookingInput(seatIds: string[], overrides: Record<string, unknown> = {}) {
  return {
    flightId: flight.id,
    cabin: "economy" as const,
    userId: CUSTOMER.id,
    contactEmail: "ada@example.com",
    contactPhone: "08031234567",
    passengers: seatIds.map((seatId, index) => ({
      title: "Mr" as const,
      firstName: `Pax${index}`,
      lastName: "Okonkwo",
      dateOfBirth: "1995-04-12",
      gender: "male" as const,
      passportNumber: "A1234567",
      type: "adult" as const,
      seatId,
    })),
    payment: {
      method: "card" as const,
      cardHolder: "Ada Okonkwo",
      cardNumber: "4084084084084081",
    },
    ...overrides,
  };
}

beforeEach(() => {
  clearStorage();
  seedFlight();
});

describe("loadState", () => {
  it("returns a safe empty state when nothing is stored", () => {
    clearStorage();
    const state = loadState();
    expect(state.flights).toEqual([]);
    expect(state.bookings).toEqual([]);
    expect(state.airports.length).toBeGreaterThan(0);
  });

  it("recovers from a corrupted stored value instead of throwing", () => {
    window.localStorage.setItem("skyroute:state", "{ this is not json");
    expect(() => loadState()).not.toThrow();
    expect(loadState().flights).toEqual([]);
  });

  it("repairs a partially written state", () => {
    window.localStorage.setItem("skyroute:state", JSON.stringify({ flights: null, users: "oops" }));
    const state = loadState();
    expect(Array.isArray(state.flights)).toBe(true);
    expect(Array.isArray(state.users)).toBe(true);
  });
});

describe("registration and sign in", () => {
  it("registers a new account and signs it in", async () => {
    const result = await register({
      fullName: "Ebube Ezedimbu",
      email: "ebube@example.com",
      phone: "08031234567",
      password: "Passw0rd",
    });

    expect(result.ok).toBe(true);
    expect(loadState().users).toHaveLength(1);
  });

  it("refuses a duplicate email address", async () => {
    const input = {
      fullName: "Ebube Ezedimbu",
      email: "ebube@example.com",
      phone: "08031234567",
      password: "Passw0rd",
    };
    await register(input);
    const second = await register({ ...input, email: "EBUBE@example.com" });

    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toMatch(/already exists/i);
  });

  it("signs in with the correct password", async () => {
    await register({
      fullName: "Ebube Ezedimbu",
      email: "ebube@example.com",
      phone: "08031234567",
      password: "Passw0rd",
    });

    await expect(login("ebube@example.com", "Passw0rd")).resolves.toMatchObject({ ok: true });
  });

  it("rejects a wrong password and an unknown email with the same message", async () => {
    await register({
      fullName: "Ebube Ezedimbu",
      email: "ebube@example.com",
      phone: "08031234567",
      password: "Passw0rd",
    });

    const wrongPassword = await login("ebube@example.com", "wrong");
    const unknownEmail = await login("nobody@example.com", "Passw0rd");

    expect(wrongPassword.ok).toBe(false);
    expect(unknownEmail.ok).toBe(false);
    if (!wrongPassword.ok && !unknownEmail.ok) {
      // Identical wording prevents account enumeration.
      expect(wrongPassword.error).toBe(unknownEmail.error);
    }
  });
});

describe("searchFlights", () => {
  const criteria = {
    originCode: "LOS",
    destinationCode: "ABV",
    departureDate: toDateKey(new Date(flight.departureTime)),
    cabin: "economy" as const,
    adults: 1,
    children: 0,
    infants: 0,
  };

  it("finds a flight matching route and date", () => {
    const results = searchFlights(criteria);
    expect(results).toHaveLength(1);
    expect(results[0].flight.id).toBe(flight.id);
  });

  it("returns nothing for a route that is not served", () => {
    expect(searchFlights({ ...criteria, destinationCode: "JFK" })).toHaveLength(0);
  });

  it("returns nothing for a date with no departures", () => {
    expect(searchFlights({ ...criteria, departureDate: "2030-01-01" })).toHaveLength(0);
  });

  it("excludes a cancelled flight", () => {
    saveState({ ...loadState(), flights: [{ ...flight, status: "cancelled" }] });
    expect(searchFlights(criteria)).toHaveLength(0);
  });

  it("excludes a flight that has already departed", () => {
    const past = makeFlight({ id: "PAST-1" }, -2);
    saveState({ ...loadState(), flights: [past] });
    expect(
      searchFlights({ ...criteria, departureDate: toDateKey(new Date(past.departureTime)) }),
    ).toHaveLength(0);
  });

  it("reports the seats remaining and a per-adult price", () => {
    const [result] = searchFlights(criteria);
    expect(result.seatsAvailable).toBeGreaterThan(0);
    expect(result.seatsAvailable).toBe(result.seatsTotal);
    expect(result.pricePerAdult).toBeGreaterThan(0);
    expect(result.estimatedTotal).toBeGreaterThan(result.pricePerAdult);
  });

  it("excludes a flight without enough seats for the whole party", () => {
    // Book out the entire economy cabin.
    const state = loadState();
    const economySeats: string[] = [];
    flight.cabins
      .filter((cabin) => cabin.cabin === "economy")
      .forEach((cabin) => {
        for (let row = cabin.startRow; row <= cabin.endRow; row += 1) {
          cabin.columns.forEach((column) => economySeats.push(`${row}${column}`));
        }
      });

    state.bookings = [
      {
        pnr: "FULLBK",
        userId: CUSTOMER.id,
        flightId: flight.id,
        cabin: "economy",
        passengers: economySeats.map((seatId, index) => ({
          id: `p${index}`,
          title: "Mr" as const,
          firstName: "A",
          lastName: "B",
          dateOfBirth: "1990-01-01",
          gender: "male" as const,
          passportNumber: "",
          type: "adult" as const,
          seatId,
        })),
        fare: {
          baseFareTotal: 0,
          cabinSurcharge: 0,
          seatSelectionFee: 0,
          taxes: 0,
          serviceCharge: 0,
          total: 0,
        },
        payment: null,
        status: "confirmed" as const,
        contactEmail: "a@b.com",
        contactPhone: "08031234567",
        createdAt: new Date().toISOString(),
      },
    ];
    saveState(state);

    expect(searchFlights(criteria)).toHaveLength(0);
  });
});

describe("createBooking", () => {
  it("creates a confirmed booking with a unique PNR", () => {
    const result = createBooking(bookingInput(["20A"]));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.pnr).toHaveLength(6);
      expect(result.data.status).toBe("confirmed");
      expect(result.data.payment?.status).toBe("successful");
      expect(result.data.fare.total).toBeGreaterThan(0);
    }
  });

  it("persists the booking so it can be retrieved by PNR", () => {
    const result = createBooking(bookingInput(["20A"]));
    if (!result.ok) throw new Error("booking failed");

    expect(findBookingByPnr(result.data.pnr)?.pnr).toBe(result.data.pnr);
    expect(listBookingsForUser(CUSTOMER.id)).toHaveLength(1);
  });

  it("never stores the full card number", () => {
    const result = createBooking(bookingInput(["20A"]));
    if (!result.ok) throw new Error("booking failed");

    expect(result.data.payment?.maskedCardNumber).toBe("**** **** **** 4081");
    expect(window.localStorage.getItem("skyroute:state")).not.toContain("4084084084084081");
  });

  it("refuses to sell a seat twice", () => {
    expect(createBooking(bookingInput(["20A"])).ok).toBe(true);

    const second = createBooking(bookingInput(["20A"]));
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toMatch(/no longer available/i);
    expect(loadState().bookings).toHaveLength(1);
  });

  it("rejects a booking on a flight that does not exist", () => {
    const result = createBooking({ ...bookingInput(["20A"]), flightId: "NO-SUCH-FLIGHT" });
    expect(result.ok).toBe(false);
  });

  it("rejects a booking on a cancelled flight", () => {
    saveState({ ...loadState(), flights: [{ ...flight, status: "cancelled" }] });
    const result = createBooking(bookingInput(["20A"]));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/cancelled/i);
  });

  it("rejects a booking on a departed flight", () => {
    const past = makeFlight({ id: "PAST-2" }, -1);
    saveState({ ...loadState(), flights: [past] });
    const result = createBooking({ ...bookingInput(["20A"]), flightId: past.id });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/already departed/i);
  });

  it("rejects a booking with no passengers", () => {
    const result = createBooking({ ...bookingInput([]), passengers: [] });
    expect(result.ok).toBe(false);
  });

  it("rejects a cabin the aircraft does not have", () => {
    const result = createBooking({ ...bookingInput(["20A"]), cabin: "first" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not available/i);
  });

  it("writes nothing when the simulated payment is declined", () => {
    const input = bookingInput(["20A"]);
    const result = createBooking({
      ...input,
      payment: { ...input.payment, forceFailure: true },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/payment failed/i);
    expect(loadState().bookings).toHaveLength(0);
  });

  it("strips angle brackets from passenger names before storing them", () => {
    const input = bookingInput(["20A"]);
    input.passengers[0].firstName = "<script>Ada</script>";
    const result = createBooking(input);

    if (!result.ok) throw new Error("booking failed");
    expect(result.data.passengers[0].firstName).not.toContain("<");
  });

  it("prices a multi-passenger booking above a single-passenger one", () => {
    const single = createBooking(bookingInput(["20A"]));
    clearStorage();
    seedFlight();
    const triple = createBooking(bookingInput(["21A", "21B", "21C"]));

    if (!single.ok || !triple.ok) throw new Error("booking failed");
    expect(triple.data.fare.total).toBeGreaterThan(single.data.fare.total);
  });
});

describe("findBookingByPnrAndSurname", () => {
  it("retrieves a booking with a matching surname, case-insensitively", () => {
    const result = createBooking(bookingInput(["20A"]));
    if (!result.ok) throw new Error("booking failed");

    expect(findBookingByPnrAndSurname(result.data.pnr, "okonkwo")?.pnr).toBe(result.data.pnr);
  });

  it("refuses a correct PNR with the wrong surname", () => {
    const result = createBooking(bookingInput(["20A"]));
    if (!result.ok) throw new Error("booking failed");

    expect(findBookingByPnrAndSurname(result.data.pnr, "Wrong")).toBeUndefined();
  });

  it("returns undefined for a malformed PNR", () => {
    expect(findBookingByPnr("!!!")).toBeUndefined();
    expect(findBookingByPnr("TOOLONGPNR")).toBeUndefined();
  });
});

describe("cancelBooking", () => {
  it("cancels a booking and computes a refund", () => {
    const created = createBooking(bookingInput(["20A"]));
    if (!created.ok) throw new Error("booking failed");

    const result = cancelBooking(created.data.pnr, CUSTOMER);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.booking.status).toBe("cancelled");
      expect(result.data.refund).toBeGreaterThan(0);
      expect(result.data.refund).toBeLessThan(created.data.fare.total);
    }
  });

  it("returns the seat to the pool after cancellation", () => {
    const created = createBooking(bookingInput(["20A"]));
    if (!created.ok) throw new Error("booking failed");
    cancelBooking(created.data.pnr, CUSTOMER);

    // The same seat can now be sold again.
    expect(createBooking(bookingInput(["20A"])).ok).toBe(true);
  });

  it("refuses to cancel a booking belonging to someone else", () => {
    const created = createBooking(bookingInput(["20A"]));
    if (!created.ok) throw new Error("booking failed");

    const result = cancelBooking(created.data.pnr, OTHER_CUSTOMER);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/permission/i);
  });

  it("allows an administrator to cancel any booking", () => {
    const created = createBooking(bookingInput(["20A"]));
    if (!created.ok) throw new Error("booking failed");

    expect(cancelBooking(created.data.pnr, ADMIN).ok).toBe(true);
  });

  it("refuses to cancel the same booking twice", () => {
    const created = createBooking(bookingInput(["20A"]));
    if (!created.ok) throw new Error("booking failed");

    cancelBooking(created.data.pnr, CUSTOMER);
    const second = cancelBooking(created.data.pnr, CUSTOMER);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toMatch(/already been cancelled/i);
  });

  it("refuses an unknown PNR", () => {
    expect(cancelBooking("ZZZZZZ", CUSTOMER).ok).toBe(false);
  });
});

describe("administrative authorisation", () => {
  const newFlight = makeFlight({ id: "NEW-1", flightNumber: "NW100" }, 12);

  it("lets an administrator add a flight", () => {
    expect(createFlight(ADMIN, newFlight).ok).toBe(true);
    expect(loadState().flights).toHaveLength(2);
  });

  it("refuses a customer trying to add a flight", () => {
    const result = createFlight(CUSTOMER, newFlight);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/administrator privileges/i);
    expect(loadState().flights).toHaveLength(1);
  });

  it("refuses an anonymous visitor", () => {
    expect(createFlight(null, newFlight).ok).toBe(false);
  });

  it("refuses a duplicate flight identifier", () => {
    createFlight(ADMIN, newFlight);
    expect(createFlight(ADMIN, newFlight).ok).toBe(false);
  });

  it("refuses a flight arriving before it departs", () => {
    const backwards = { ...newFlight, id: "BAD-1", arrivalTime: "2020-01-01T00:00:00" };
    const result = createFlight(ADMIN, backwards);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/after departure/i);
  });

  it("lets an administrator change a flight status", () => {
    const result = updateFlight(ADMIN, flight.id, { status: "delayed" });
    expect(result.ok).toBe(true);
    expect(loadState().flights[0].status).toBe("delayed");
  });

  it("refuses to delete a flight that has confirmed bookings", () => {
    createBooking(bookingInput(["20A"]));
    const result = deleteFlight(ADMIN, flight.id);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/confirmed bookings/i);
    expect(loadState().flights).toHaveLength(1);
  });

  it("deletes a flight with no bookings", () => {
    expect(deleteFlight(ADMIN, flight.id).ok).toBe(true);
    expect(loadState().flights).toHaveLength(0);
  });
});

describe("getStats", () => {
  it("reports zeroes on an empty system", () => {
    const stats = getStats();
    expect(stats.confirmedBookings).toBe(0);
    expect(stats.grossRevenue).toBe(0);
    expect(stats.topRoutes).toEqual([]);
  });

  it("aggregates revenue, passengers and routes", () => {
    const created = createBooking(bookingInput(["20A", "20B"]));
    if (!created.ok) throw new Error("booking failed");

    const stats = getStats();
    expect(stats.confirmedBookings).toBe(1);
    expect(stats.totalPassengers).toBe(2);
    expect(stats.grossRevenue).toBe(created.data.fare.total);
    expect(stats.netRevenue).toBe(stats.grossRevenue);
    expect(stats.topRoutes[0]).toEqual({ route: "LOS to ABV", bookings: 1 });
  });

  it("subtracts refunds from net revenue after a cancellation", () => {
    const created = createBooking(bookingInput(["20A"]));
    if (!created.ok) throw new Error("booking failed");

    const cancelled = cancelBooking(created.data.pnr, ADMIN);
    if (!cancelled.ok) throw new Error("cancellation failed");

    const stats = getStats();
    expect(stats.confirmedBookings).toBe(0);
    expect(stats.cancelledBookings).toBe(1);
    expect(stats.refunded).toBe(cancelled.data.refund);
    expect(stats.netRevenue).toBe(-cancelled.data.refund);
  });
});
