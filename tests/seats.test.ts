/**
 * Unit tests: seat map generation and availability.
 * Traceable to requirements FR-05 (seat selection) and FR-06 (no double booking).
 */

import { describe, expect, it } from "vitest";
import {
  buildSeatMap,
  countAvailable,
  countTotal,
  getOccupiedSeatIds,
  groupByRow,
  loadFactor,
  seatsInCabin,
  validateSeatSelection,
} from "@/lib/seats";
import { AIRCRAFT_LAYOUTS } from "@/lib/seed";
import { makeBooking, makeFlight } from "./helpers";

describe("buildSeatMap", () => {
  const flight = makeFlight();
  const seats = buildSeatMap(flight, []);

  it("generates a seat for every row and column in every cabin", () => {
    const expected = AIRCRAFT_LAYOUTS["Boeing 737-800"].reduce(
      (total, cabin) => total + (cabin.endRow - cabin.startRow + 1) * cabin.columns.length,
      0,
    );
    expect(seats).toHaveLength(expected);
  });

  it("marks every seat available on an empty aircraft", () => {
    expect(countAvailable(seats)).toBe(seats.length);
  });

  it("identifies window seats at each end of the row", () => {
    expect(seats.find((seat) => seat.id === "20A")?.isWindow).toBe(true);
    expect(seats.find((seat) => seat.id === "20F")?.isWindow).toBe(true);
    expect(seats.find((seat) => seat.id === "20B")?.isWindow).toBe(false);
  });

  it("identifies aisle seats either side of the aisle", () => {
    expect(seats.find((seat) => seat.id === "20C")?.isAisle).toBe(true);
    expect(seats.find((seat) => seat.id === "20D")?.isAisle).toBe(true);
    expect(seats.find((seat) => seat.id === "20B")?.isAisle).toBe(false);
  });

  it("flags the exit rows defined for the aircraft type", () => {
    const exitRows = seats.filter((seat) => seat.isExitRow).map((seat) => seat.row);
    expect([...new Set(exitRows)].sort((a, b) => a - b)).toEqual([16, 17]);
  });

  it("assigns each seat to the correct cabin", () => {
    expect(seats.find((seat) => seat.id === "1A")?.cabin).toBe("business");
    expect(seats.find((seat) => seat.id === "20A")?.cabin).toBe("economy");
  });

  it("marks blocked seats as unavailable", () => {
    const withBlocked = buildSeatMap(makeFlight({ blockedSeats: ["20A", "20B"] }), []);
    expect(withBlocked.find((seat) => seat.id === "20A")?.status).toBe("blocked");
    expect(countAvailable(withBlocked)).toBe(withBlocked.length - 2);
  });

  it("marks seats held by a confirmed booking as occupied", () => {
    const bookings = [makeBooking(flight.id, ["20A", "20B"])];
    const occupied = buildSeatMap(flight, bookings);

    expect(occupied.find((seat) => seat.id === "20A")?.status).toBe("occupied");
    expect(occupied.find((seat) => seat.id === "20C")?.status).toBe("available");
  });

  it("releases seats when a booking is cancelled", () => {
    const bookings = [makeBooking(flight.id, ["20A"], { status: "cancelled" })];
    const seatMap = buildSeatMap(flight, bookings);
    expect(seatMap.find((seat) => seat.id === "20A")?.status).toBe("available");
  });

  it("ignores bookings belonging to a different flight", () => {
    const bookings = [makeBooking("SOME-OTHER-FLIGHT", ["20A"])];
    const seatMap = buildSeatMap(flight, bookings);
    expect(seatMap.find((seat) => seat.id === "20A")?.status).toBe("available");
  });
});

describe("wide-body layouts", () => {
  it("generates three cabins on a 787", () => {
    const flight = makeFlight({ aircraft: "Boeing 787-9", cabins: AIRCRAFT_LAYOUTS["Boeing 787-9"] });
    const seats = buildSeatMap(flight, []);
    const cabins = new Set(seats.map((seat) => seat.cabin));
    expect(cabins).toEqual(new Set(["first", "business", "economy"]));
  });
});

describe("occupancy helpers", () => {
  const flight = makeFlight();

  it("collects the occupied seat IDs for a flight", () => {
    const bookings = [makeBooking(flight.id, ["20A", "20B", "21C"])];
    expect(getOccupiedSeatIds(flight.id, bookings)).toEqual(new Set(["20A", "20B", "21C"]));
  });

  it("counts seats within one cabin only", () => {
    const seats = buildSeatMap(flight, []);
    const economy = seatsInCabin(seats, "economy");
    expect(countTotal(seats, "economy")).toBe(economy.length);
    expect(countTotal(seats, "economy")).toBeLessThan(seats.length);
  });

  it("computes the load factor as sold divided by fitted", () => {
    const seats = buildSeatMap(flight, []);
    expect(loadFactor(seats)).toBe(0);

    const total = countTotal(seats, "economy");
    const sold = seatsInCabin(seats, "economy")
      .slice(0, Math.floor(total / 2))
      .map((seat) => seat.id);
    const half = buildSeatMap(flight, [makeBooking(flight.id, sold)]);

    expect(loadFactor(half, "economy")).toBeCloseTo(sold.length / total, 5);
  });

  it("returns zero load for a cabin with no seats", () => {
    expect(loadFactor([], "economy")).toBe(0);
  });

  it("groups seats into ascending rows", () => {
    const rows = groupByRow(seatsInCabin(buildSeatMap(flight, []), "economy"));
    expect(rows[0].row).toBe(8);
    expect(rows.at(-1)?.row).toBe(32);
    expect(rows[0].seats).toHaveLength(6);
  });
});

describe("validateSeatSelection", () => {
  const flight = makeFlight();

  it("accepts free seats in the requested cabin", () => {
    const result = validateSeatSelection(flight, [], ["20A", "20B"], "economy");
    expect(result.valid).toBe(true);
    expect(result.conflicts).toEqual([]);
  });

  it("rejects a seat that is already taken", () => {
    const bookings = [makeBooking(flight.id, ["20A"])];
    const result = validateSeatSelection(flight, bookings, ["20A"], "economy");

    expect(result.valid).toBe(false);
    expect(result.conflicts).toContain("20A");
    expect(result.message).toMatch(/no longer available/i);
  });

  it("rejects a seat that does not exist on the aircraft", () => {
    const result = validateSeatSelection(flight, [], ["99Z"], "economy");
    expect(result.valid).toBe(false);
    expect(result.conflicts).toContain("99Z");
  });

  it("rejects a seat from the wrong cabin", () => {
    const result = validateSeatSelection(flight, [], ["1A"], "economy");
    expect(result.valid).toBe(false);
    expect(result.conflicts).toContain("1A");
  });

  it("rejects a blocked seat", () => {
    const blocked = makeFlight({ blockedSeats: ["20A"] });
    const result = validateSeatSelection(blocked, [], ["20A"], "economy");
    expect(result.valid).toBe(false);
  });

  it("rejects the same seat selected twice", () => {
    const result = validateSeatSelection(flight, [], ["20A", "20A"], "economy");
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/more than once/i);
  });

  it("accepts an empty selection", () => {
    expect(validateSeatSelection(flight, [], [], "economy").valid).toBe(true);
  });
});
