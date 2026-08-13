/**
 * Unit tests: fare engine.
 * Traceable to requirements FR-04 (dynamic pricing) and FR-09 (refunds).
 */

import { describe, expect, it } from "vitest";
import {
  advancePurchaseFactor,
  calculateFare,
  calculateRefund,
  CABIN_FACTORS,
  daysUntil,
  demandFactor,
  fareForPassenger,
  formatMoney,
  PASSENGER_TYPE_FACTORS,
  refundRate,
  roundFare,
  seatFee,
  SERVICE_CHARGE,
  VAT_RATE,
  type FareContext,
} from "@/lib/pricing";
import { buildSeatMap } from "@/lib/seats";
import { makeFlight } from "./helpers";

const baseContext: FareContext = {
  baseFare: 100_000,
  cabin: "economy",
  daysToDeparture: 20,
  load: 0.2,
};

describe("advancePurchaseFactor", () => {
  it("discounts bookings made 30 or more days ahead", () => {
    expect(advancePurchaseFactor(30)).toBe(0.9);
    expect(advancePurchaseFactor(90)).toBe(0.9);
  });

  it("charges the reference fare between 14 and 29 days", () => {
    expect(advancePurchaseFactor(14)).toBe(1.0);
    expect(advancePurchaseFactor(29)).toBe(1.0);
  });

  it("increases as departure approaches", () => {
    expect(advancePurchaseFactor(7)).toBe(1.15);
    expect(advancePurchaseFactor(3)).toBe(1.32);
    expect(advancePurchaseFactor(0)).toBe(1.5);
  });

  it("is monotonically non-increasing as the booking window widens", () => {
    for (let days = 0; days < 60; days += 1) {
      expect(advancePurchaseFactor(days)).toBeGreaterThanOrEqual(advancePurchaseFactor(days + 1));
    }
  });
});

describe("demandFactor", () => {
  it("leaves the fare unchanged in a quiet cabin", () => {
    expect(demandFactor(0)).toBe(1);
    expect(demandFactor(0.49)).toBe(1);
  });

  it("steps the fare up as the cabin fills", () => {
    expect(demandFactor(0.5)).toBe(1.08);
    expect(demandFactor(0.8)).toBe(1.2);
    expect(demandFactor(0.95)).toBe(1.35);
  });

  it("clamps out-of-range load factors instead of extrapolating", () => {
    expect(demandFactor(-3)).toBe(1);
    expect(demandFactor(4)).toBe(1.35);
  });
});

describe("fareForPassenger", () => {
  it("prices an adult economy seat from the base fare", () => {
    // 100,000 x 1.0 (14-29 days) x 1.0 (quiet) x 1.0 (adult) x 1.0 (economy)
    expect(fareForPassenger(baseContext, "adult")).toBe(100_000);
  });

  it("applies the child and infant discounts", () => {
    expect(fareForPassenger(baseContext, "child")).toBe(75_000);
    expect(fareForPassenger(baseContext, "infant")).toBe(10_000);
  });

  it("applies the cabin multiplier", () => {
    expect(fareForPassenger({ ...baseContext, cabin: "business" })).toBe(
      roundFare(100_000 * CABIN_FACTORS.business),
    );
    expect(fareForPassenger({ ...baseContext, cabin: "first" })).toBe(
      roundFare(100_000 * CABIN_FACTORS.first),
    );
  });

  it("combines every factor multiplicatively", () => {
    const context: FareContext = { baseFare: 120_000, cabin: "business", daysToDeparture: 2, load: 0.92 };
    const expected = roundFare(
      120_000 * 1.5 * 1.35 * PASSENGER_TYPE_FACTORS.child * CABIN_FACTORS.business,
    );
    expect(fareForPassenger(context, "child")).toBe(expected);
  });

  it("rounds to the nearest 100 naira", () => {
    const fare = fareForPassenger({ ...baseContext, baseFare: 99_999 }, "child");
    expect(fare % 100).toBe(0);
  });
});

describe("seatFee", () => {
  const flight = makeFlight();
  const seats = buildSeatMap(flight, []);
  const find = (id: string) => seats.find((seat) => seat.id === id);

  it("charges nothing outside economy", () => {
    const businessSeat = seats.find((seat) => seat.cabin === "business");
    expect(seatFee(businessSeat)).toBe(0);
  });

  it("charges the most for an exit row", () => {
    const exitSeat = seats.find((seat) => seat.isExitRow && seat.cabin === "economy");
    expect(seatFee(exitSeat)).toBe(3_500);
  });

  it("charges more for a window than a middle seat", () => {
    // Row 20 on the 737 fixture is a plain economy row.
    const window = find("20A");
    const middle = find("20B");
    expect(seatFee(window)).toBe(2_000);
    expect(seatFee(middle)).toBe(1_000);
    expect(seatFee(window)).toBeGreaterThan(seatFee(middle));
  });

  it("charges nothing when no seat is selected", () => {
    expect(seatFee(undefined)).toBe(0);
  });
});

describe("calculateFare", () => {
  const flight = makeFlight();
  const seats = buildSeatMap(flight, []);

  it("itemises a single adult economy booking", () => {
    const fare = calculateFare(baseContext, [{ type: "adult", seatId: "20A" }], seats);

    expect(fare.baseFareTotal).toBe(100_000);
    expect(fare.cabinSurcharge).toBe(0);
    expect(fare.seatSelectionFee).toBe(2_000);
    expect(fare.taxes).toBe(Math.round(102_000 * VAT_RATE));
    expect(fare.serviceCharge).toBe(SERVICE_CHARGE);
    expect(fare.total).toBe(102_000 + Math.round(102_000 * VAT_RATE) + SERVICE_CHARGE);
  });

  it("separates the cabin upgrade from the base fare", () => {
    const fare = calculateFare({ ...baseContext, cabin: "business" }, [{ type: "adult", seatId: null }], seats);

    expect(fare.baseFareTotal).toBe(100_000);
    expect(fare.cabinSurcharge).toBe(roundFare(100_000 * CABIN_FACTORS.business) - 100_000);
  });

  it("charges one service charge per booking, not per passenger", () => {
    const one = calculateFare(baseContext, [{ type: "adult", seatId: null }], seats);
    const four = calculateFare(
      baseContext,
      Array.from({ length: 4 }, () => ({ type: "adult" as const, seatId: null })),
      seats,
    );

    expect(one.serviceCharge).toBe(SERVICE_CHARGE);
    expect(four.serviceCharge).toBe(SERVICE_CHARGE);
    expect(four.baseFareTotal).toBe(one.baseFareTotal * 4);
  });

  it("does not charge a seat fee for a lap infant", () => {
    const fare = calculateFare(baseContext, [{ type: "infant", seatId: "20A" }], seats);
    expect(fare.seatSelectionFee).toBe(0);
  });

  it("produces a total equal to the sum of its parts", () => {
    const fare = calculateFare(
      { ...baseContext, cabin: "business", daysToDeparture: 2, load: 0.8 },
      [
        { type: "adult", seatId: "20A" },
        { type: "child", seatId: "20B" },
        { type: "infant", seatId: null },
      ],
      seats,
    );

    expect(fare.total).toBe(
      fare.baseFareTotal + fare.cabinSurcharge + fare.seatSelectionFee + fare.taxes + fare.serviceCharge,
    );
  });

  it("never produces a negative or fractional total", () => {
    const fare = calculateFare(baseContext, [{ type: "infant", seatId: null }], seats);
    expect(fare.total).toBeGreaterThan(0);
    expect(Number.isInteger(fare.total)).toBe(true);
  });
});

describe("daysUntil", () => {
  it("counts whole days to a future departure", () => {
    const now = new Date("2026-08-01T09:00:00");
    expect(daysUntil("2026-08-11T09:00:00", now)).toBe(10);
  });

  it("returns zero rather than a negative for a past departure", () => {
    const now = new Date("2026-08-20T09:00:00");
    expect(daysUntil("2026-08-11T09:00:00", now)).toBe(0);
  });
});

describe("refund policy", () => {
  it("refunds 90% at seven days or more", () => {
    expect(refundRate(168)).toBe(0.9);
    expect(refundRate(720)).toBe(0.9);
  });

  it("steps the refund down as departure approaches", () => {
    expect(refundRate(100)).toBe(0.7);
    expect(refundRate(48)).toBe(0.5);
    expect(refundRate(2)).toBe(0);
  });

  it("never refunds the service charge", () => {
    const fare = {
      baseFareTotal: 100_000,
      cabinSurcharge: 0,
      seatSelectionFee: 0,
      taxes: 7_500,
      serviceCharge: SERVICE_CHARGE,
      total: 110_000,
    };
    const departure = new Date();
    departure.setDate(departure.getDate() + 30);

    const refund = calculateRefund(fare, departure.toISOString());
    expect(refund).toBe(Math.round((110_000 - SERVICE_CHARGE) * 0.9));
    expect(refund).toBeLessThan(fare.total);
  });

  it("refunds nothing inside 24 hours of departure", () => {
    const fare = {
      baseFareTotal: 100_000,
      cabinSurcharge: 0,
      seatSelectionFee: 0,
      taxes: 7_500,
      serviceCharge: SERVICE_CHARGE,
      total: 110_000,
    };
    const departure = new Date(Date.now() + 3 * 3_600_000);
    expect(calculateRefund(fare, departure.toISOString())).toBe(0);
  });
});

describe("formatMoney", () => {
  it("formats naira with thousands separators", () => {
    expect(formatMoney(118_000)).toBe("NGN 118,000");
  });

  it("respects an alternative currency code", () => {
    expect(formatMoney(500, "USD")).toBe("USD 500");
  });
});
