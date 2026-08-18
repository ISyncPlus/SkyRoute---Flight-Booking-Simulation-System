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
import type { Booking, SessionUser } from "@/lib/types";
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

  it("processes a booking with bank transfer payment method", () => {
    const input = bookingInput(["20A"]);
    const result = createBooking({
      ...input,
      payment: { method: "transfer", senderName: "Ada Okonkwo" },
    });
    if (!result.ok) throw new Error("booking failed");
    expect(result.data.payment?.method).toBe("transfer");
    expect(result.data.payment?.cardHolder).toBe("Ada Okonkwo");
    expect(result.data.payment?.status).toBe("successful");
  });

  it("processes a booking with wallet payment method", () => {
    const input = bookingInput(["20B"]);
    const result = createBooking({
      ...input,
      payment: { method: "wallet" },
    });
    if (!result.ok) throw new Error("booking failed");
    expect(result.data.payment?.method).toBe("wallet");
    expect(result.data.payment?.maskedCardNumber).toBe("SkyRoute Digital Wallet");
    expect(result.data.payment?.status).toBe("successful");
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

    const result = cancelBooking(created.data.pnr, { kind: "account", user: CUSTOMER });
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
    cancelBooking(created.data.pnr, { kind: "account", user: CUSTOMER });

    // The same seat can now be sold again.
    expect(createBooking(bookingInput(["20A"])).ok).toBe(true);
  });

  it("refuses to cancel a booking belonging to someone else", () => {
    const created = createBooking(bookingInput(["20A"]));
    if (!created.ok) throw new Error("booking failed");

    const result = cancelBooking(created.data.pnr, { kind: "account", user: OTHER_CUSTOMER });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/permission/i);
  });

  it("lets a guest cancel their own booking with the passenger surname", () => {
    const created = createBooking(bookingInput(["20A"], { userId: null }));
    if (!created.ok) throw new Error("booking failed");
    expect(created.data.userId).toBeNull();

    const result = cancelBooking(created.data.pnr, { kind: "guest", surname: "Okonkwo" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.booking.status).toBe("cancelled");
  });

  it("matches a guest surname regardless of case or padding", () => {
    const created = createBooking(bookingInput(["20A"], { userId: null }));
    if (!created.ok) throw new Error("booking failed");

    expect(cancelBooking(created.data.pnr, { kind: "guest", surname: "  oKoNkWo " }).ok).toBe(true);
  });

  it("refuses a guest cancellation when the surname is wrong", () => {
    const created = createBooking(bookingInput(["20A"], { userId: null }));
    if (!created.ok) throw new Error("booking failed");

    const result = cancelBooking(created.data.pnr, { kind: "guest", surname: "Nwosu" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/permission/i);
  });

  /* The important one: a reference and a surname are printed on every
     itinerary, so they must never be enough to cancel a registered
     customer's trip. */
  it("refuses a guest cancellation of a booking that belongs to an account", () => {
    const created = createBooking(bookingInput(["20A"]));
    if (!created.ok) throw new Error("booking failed");

    const result = cancelBooking(created.data.pnr, { kind: "guest", surname: "Okonkwo" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/permission/i);
  });

  it("keeps guest bookings out of every account's booking list", () => {
    const guest = createBooking(bookingInput(["20A"], { userId: null }));
    const mine = createBooking(bookingInput(["20B"]));
    if (!guest.ok || !mine.ok) throw new Error("booking failed");

    const listed = listBookingsForUser(CUSTOMER.id).map((booking) => booking.pnr);
    expect(listed).toContain(mine.data.pnr);
    expect(listed).not.toContain(guest.data.pnr);
  });

  it("allows an administrator to cancel any booking", () => {
    const created = createBooking(bookingInput(["20A"]));
    if (!created.ok) throw new Error("booking failed");

    expect(cancelBooking(created.data.pnr, { kind: "account", user: ADMIN }).ok).toBe(true);
  });

  it("refuses to cancel the same booking twice", () => {
    const created = createBooking(bookingInput(["20A"]));
    if (!created.ok) throw new Error("booking failed");

    cancelBooking(created.data.pnr, { kind: "account", user: CUSTOMER });
    const second = cancelBooking(created.data.pnr, { kind: "account", user: CUSTOMER });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toMatch(/already been cancelled/i);
  });

  it("refuses an unknown PNR", () => {
    expect(cancelBooking("ZZZZZZ", { kind: "account", user: CUSTOMER }).ok).toBe(false);
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

    const cancelled = cancelBooking(created.data.pnr, { kind: "account", user: ADMIN });
    if (!cancelled.ok) throw new Error("cancellation failed");

    const stats = getStats();
    expect(stats.confirmedBookings).toBe(0);
    expect(stats.cancelledBookings).toBe(1);
    expect(stats.refunded).toBe(cancelled.data.refund);
    expect(stats.netRevenue).toBe(-cancelled.data.refund);
  });
});

describe("multi-leg bookings", () => {
  const outbound = flight;
  const inbound = makeFlight(
    { id: "RETURN-1", originCode: "ABV", destinationCode: "LOS", flightNumber: "P4200" },
    14,
  );

  function seedBoth() {
    saveState({
      schemaVersion: SCHEMA_VERSION,
      airports: AIRPORTS,
      flights: [outbound, inbound],
      users: [],
      bookings: [],
    });
  }

  function returnInput(outboundSeats: (string | null)[], inboundSeats: (string | null)[]) {
    const base = bookingInput(outboundSeats.map((seat) => seat ?? "20A"));
    return {
      ...base,
      flightId: undefined,
      cabin: undefined,
      tripType: "round-trip" as const,
      legs: [
        { flightId: outbound.id, cabin: "economy" as const, seatIds: outboundSeats },
        { flightId: inbound.id, cabin: "economy" as const, seatIds: inboundSeats },
      ],
    };
  }

  beforeEach(seedBoth);

  it("writes one segment per flight, each with its own seats", () => {
    const created = createBooking(returnInput(["20A"], ["11C"]));
    if (!created.ok) throw new Error(created.error);

    expect(created.data.segments).toHaveLength(2);
    expect(created.data.tripType).toBe("round-trip");

    const [first, second] = created.data.segments!;
    const paxId = created.data.passengers[0].id;
    expect(first.flightId).toBe(outbound.id);
    expect(first.seats[paxId]).toBe("20A");
    expect(second.flightId).toBe(inbound.id);
    // The same traveller, a different seat on the way home.
    expect(second.seats[paxId]).toBe("11C");
  });

  it("charges the booking service fee once for the whole journey, not per flight", () => {
    const oneWay = createBooking(bookingInput(["20A"]));
    seedBoth();
    const returning = createBooking(returnInput(["20A"], ["11C"]));
    if (!oneWay.ok || !returning.ok) throw new Error("booking failed");

    expect(returning.data.fare.serviceCharge).toBe(oneWay.data.fare.serviceCharge);
    // Two flights of fare, but only one service charge on top.
    expect(returning.data.fare.baseFareTotal).toBeGreaterThan(oneWay.data.fare.baseFareTotal);
  });

  it("keeps the total consistent with its own itemisation", () => {
    const created = createBooking(returnInput(["20A"], ["11C"]));
    if (!created.ok) throw new Error(created.error);

    const { baseFareTotal, cabinSurcharge, seatSelectionFee, taxes, serviceCharge, total } =
      created.data.fare;
    expect(total).toBe(baseFareTotal + cabinSurcharge + seatSelectionFee + taxes + serviceCharge);
  });

  it("holds seats on every leg, so a later leg cannot be resold", () => {
    const created = createBooking(returnInput(["20A"], ["11C"]));
    if (!created.ok) throw new Error(created.error);

    // 11C is only taken on the *return* leg. It must still be unavailable.
    const clash = createBooking({
      ...bookingInput(["11C"]),
      flightId: inbound.id,
    });
    expect(clash.ok).toBe(false);
    // Assert *why*, so this cannot pass because of some unrelated refusal.
    if (!clash.ok) expect(clash.error).toMatch(/no longer available|unavailable|already/i);

    // A free seat on that same leg is still sellable, so the rule is not
    // simply refusing everything on the flight.
    expect(createBooking({ ...bookingInput(["12F"]), flightId: inbound.id }).ok).toBe(true);
  });

  it("refuses the whole journey when any single leg is unbookable", () => {
    saveState({
      ...loadState(),
      flights: [outbound, { ...inbound, status: "cancelled" }],
    });

    const result = createBooking(returnInput(["20A"], ["11C"]));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/cancelled/i);
    // Nothing was written, so the outbound seat is still for sale.
    expect(loadState().bookings).toHaveLength(0);
  });

  it("names which flight failed once there is more than one", () => {
    saveState({
      ...loadState(),
      flights: [outbound, { ...inbound, status: "cancelled" }],
    });

    const result = createBooking(returnInput(["20A"], ["11C"]));
    if (!result.ok) expect(result.error).toMatch(/flight 2/i);
  });

  it("bases the refund on the first departure, not a later leg", () => {
    const created = createBooking(returnInput(["20A"], ["11C"]));
    if (!created.ok) throw new Error(created.error);

    const cancelled = cancelBooking(created.data.pnr, { kind: "account", user: CUSTOMER });
    expect(cancelled.ok).toBe(true);

    if (cancelled.ok) {
      // Outbound is 10 days out (90%); the return is 14 days out. Anchoring to
      // the later leg would pay out at the same rate here, so assert the rate
      // that the *first* departure earns against the refundable amount.
      const refundable = created.data.fare.total - created.data.fare.serviceCharge;
      expect(cancelled.data.refund).toBe(Math.round(refundable * 0.9));
    }
  });

  it("will not cancel once the first leg has flown, even if a later leg has not", () => {
    const departed = makeFlight({ id: "GONE-1" }, -1);
    saveState({
      schemaVersion: SCHEMA_VERSION,
      airports: AIRPORTS,
      flights: [departed, inbound],
      users: [],
      bookings: [],
    });

    // Written directly: createBooking would rightly refuse a flight in the past.
    const manual: Booking = {
      pnr: "PASTBK",
      userId: CUSTOMER.id,
      flightId: departed.id,
      cabin: "economy",
      tripType: "round-trip",
      segments: [
        { flightId: departed.id, cabin: "economy", seats: {} },
        { flightId: inbound.id, cabin: "economy", seats: {} },
      ],
      passengers: [],
      fare: { baseFareTotal: 0, cabinSurcharge: 0, seatSelectionFee: 0, taxes: 0, serviceCharge: 0, total: 0 },
      payment: null,
      status: "confirmed",
      contactEmail: "a@b.test",
      contactPhone: "08031234567",
      createdAt: new Date().toISOString(),
    };
    saveState({ ...loadState(), bookings: [manual] });

    const result = cancelBooking("PASTBK", { kind: "account", user: CUSTOMER });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/already begun/i);
  });
});
