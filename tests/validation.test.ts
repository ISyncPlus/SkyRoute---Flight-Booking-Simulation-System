/**
 * Unit tests: validation rules.
 * Traceable to requirements FR-02 (registration), FR-03 (search),
 * FR-07 (passenger details) and FR-08 (payment).
 */

import { describe, expect, it } from "vitest";
import {
  detectCardBrand,
  isValidEmail,
  isValidExpiry,
  isValidName,
  isValidPassport,
  isValidPhone,
  luhnCheck,
  maskCardNumber,
  MAX_PASSENGERS_PER_BOOKING,
  passengerTypeForAge,
  sanitiseText,
  validatePassenger,
  validatePassword,
  validatePayment,
  validateRegistration,
  validateSearch,
} from "@/lib/validation";
import { generatePnr, generateUniquePnr, isValidPnr, PNR_ALPHABET, PNR_LENGTH } from "@/lib/ids";

describe("email validation", () => {
  it.each(["a@b.co", "ebube.ezedimbu@example.com", "user+tag@sub.domain.ng"])(
    "accepts %s",
    (value) => expect(isValidEmail(value)).toBe(true),
  );

  it.each(["", "plainstring", "no@domain", "no@domain.", "two @spaces.com", "a@b.c"])(
    "rejects %s",
    (value) => expect(isValidEmail(value)).toBe(false),
  );
});

describe("phone validation", () => {
  it.each(["08031234567", "07011111111", "09099999999", "+2348031234567", "2348031234567"])(
    "accepts %s",
    (value) => expect(isValidPhone(value)).toBe(true),
  );

  it.each(["0803123456", "080312345678", "06031234567", "abcdefghijk", ""])(
    "rejects %s",
    (value) => expect(isValidPhone(value)).toBe(false),
  );

  it("tolerates spaces and dashes", () => {
    expect(isValidPhone("0803-123-4567")).toBe(true);
    expect(isValidPhone("0803 123 4567")).toBe(true);
  });
});

describe("name and passport validation", () => {
  it("accepts names with apostrophes and hyphens", () => {
    expect(isValidName("O'Brien")).toBe(true);
    expect(isValidName("Anne-Marie")).toBe(true);
    expect(isValidName("Chukwuebuka")).toBe(true);
  });

  it("rejects digits, symbols and single characters", () => {
    expect(isValidName("Ada1")).toBe(false);
    expect(isValidName("<script>")).toBe(false);
    expect(isValidName("A")).toBe(false);
  });

  it("accepts a six to twelve character alphanumeric passport", () => {
    expect(isValidPassport("A1234567")).toBe(true);
    expect(isValidPassport("12345")).toBe(false);
    expect(isValidPassport("A123456789012")).toBe(false);
  });
});

describe("password policy", () => {
  it("accepts a compliant password", () => {
    expect(validatePassword("Passw0rd").valid).toBe(true);
  });

  it("requires at least eight characters", () => {
    expect(validatePassword("Pas0").errors.password).toMatch(/8 characters/);
  });

  it("requires an upper-case letter", () => {
    expect(validatePassword("passw0rd").errors.password).toMatch(/upper-case/);
  });

  it("requires a lower-case letter", () => {
    expect(validatePassword("PASSW0RD").errors.password).toMatch(/lower-case/);
  });

  it("requires a digit", () => {
    expect(validatePassword("Password").errors.password).toMatch(/number/);
  });
});

describe("validateRegistration", () => {
  const valid = {
    fullName: "Ebube Ezedimbu",
    email: "ebube@example.com",
    phone: "08031234567",
    password: "Passw0rd",
    confirmPassword: "Passw0rd",
  };

  it("accepts a complete, valid form", () => {
    expect(validateRegistration(valid).valid).toBe(true);
  });

  it("requires both a first name and a surname", () => {
    const result = validateRegistration({ ...valid, fullName: "Ebube" });
    expect(result.valid).toBe(false);
    expect(result.errors.fullName).toMatch(/first and last/i);
  });

  it("rejects mismatched passwords", () => {
    const result = validateRegistration({ ...valid, confirmPassword: "Different1" });
    expect(result.errors.confirmPassword).toMatch(/do not match/i);
  });

  it("reports every problem at once rather than one at a time", () => {
    const result = validateRegistration({
      fullName: "",
      email: "bad",
      phone: "123",
      password: "weak",
      confirmPassword: "other",
    });
    expect(Object.keys(result.errors).length).toBeGreaterThanOrEqual(4);
  });
});

describe("validateSearch", () => {
  const today = new Date("2026-08-08T10:00:00");
  const valid = {
    originCode: "LOS",
    destinationCode: "ABV",
    departureDate: "2026-08-10",
    cabin: "economy" as const,
    adults: 1,
    children: 0,
    infants: 0,
  };

  it("accepts a valid search", () => {
    expect(validateSearch(valid, today).valid).toBe(true);
  });

  it("rejects the same origin and destination", () => {
    const result = validateSearch({ ...valid, destinationCode: "LOS" }, today);
    expect(result.errors.destinationCode).toMatch(/must be different/i);
  });

  it("rejects a departure date in the past", () => {
    const result = validateSearch({ ...valid, departureDate: "2026-08-01" }, today);
    expect(result.errors.departureDate).toMatch(/past/i);
  });

  it("accepts a departure later today", () => {
    expect(validateSearch({ ...valid, departureDate: "2026-08-08" }, today).valid).toBe(true);
  });

  it("requires at least one adult", () => {
    const result = validateSearch({ ...valid, adults: 0, children: 2 }, today);
    expect(result.errors.adults).toMatch(/at least one adult/i);
  });

  it("requires an accompanying adult for each infant", () => {
    const result = validateSearch({ ...valid, adults: 1, infants: 2 }, today);
    expect(result.errors.infants).toMatch(/accompanied/i);
  });

  it(`caps a booking at ${MAX_PASSENGERS_PER_BOOKING} passengers`, () => {
    const result = validateSearch({ ...valid, adults: 9, children: 1 }, today);
    expect(result.valid).toBe(false);
  });
});

describe("passengerTypeForAge", () => {
  const travel = "2026-08-10T09:00:00";

  it("classifies an adult", () => {
    expect(passengerTypeForAge("1995-04-12", travel)).toBe("adult");
  });

  it("classifies a child between 2 and 11", () => {
    expect(passengerTypeForAge("2018-01-01", travel)).toBe("child");
  });

  it("classifies an infant under 2", () => {
    expect(passengerTypeForAge("2025-06-01", travel)).toBe("infant");
  });

  it("uses the age on the travel date, not today", () => {
    // Turns 12 the day after travel, so is still a child on the day.
    expect(passengerTypeForAge("2014-08-11", travel)).toBe("child");
    // Turns 12 the day before travel, so is an adult fare.
    expect(passengerTypeForAge("2014-08-09", travel)).toBe("adult");
  });

  it("returns null for an unparseable or future date of birth", () => {
    expect(passengerTypeForAge("not-a-date", travel)).toBeNull();
    expect(passengerTypeForAge("2030-01-01", travel)).toBeNull();
  });
});

describe("validatePassenger", () => {
  const travel = "2026-08-10T09:00:00";
  const valid = {
    firstName: "Chidi",
    lastName: "Okafor",
    dateOfBirth: "1995-04-12",
    passportNumber: "A1234567",
    type: "adult" as const,
  };

  it("accepts a complete domestic passenger without a passport", () => {
    const result = validatePassenger({ ...valid, passportNumber: "" }, travel, false);
    expect(result.valid).toBe(true);
  });

  it("requires a passport for an international flight", () => {
    const result = validatePassenger({ ...valid, passportNumber: "" }, travel, true);
    expect(result.errors.passportNumber).toMatch(/required/i);
  });

  it("rejects a date of birth that contradicts the fare type", () => {
    const result = validatePassenger({ ...valid, type: "child" }, travel, false);
    expect(result.errors.dateOfBirth).toMatch(/adult fare/i);
  });
});

describe("Luhn card validation", () => {
  it.each(["4084084084084081", "4111 1111 1111 1111", "5500005555555559"])(
    "accepts the valid test card %s",
    (value) => expect(luhnCheck(value)).toBe(true),
  );

  it.each(["4084084084084082", "1234567812345678", "", "abcd"])(
    "rejects the invalid number %s",
    (value) => expect(luhnCheck(value)).toBe(false),
  );

  it("rejects numbers that are too short or too long", () => {
    expect(luhnCheck("400")).toBe(false);
    expect(luhnCheck("4".repeat(25))).toBe(false);
  });
});

describe("card presentation", () => {
  it("detects the card brand from the leading digits", () => {
    expect(detectCardBrand("4084084084084081")).toBe("Visa");
    expect(detectCardBrand("5500005555555559")).toBe("Mastercard");
    expect(detectCardBrand("5061234567890")).toBe("Verve");
    expect(detectCardBrand("9999999999")).toBe("Card");
  });

  it("masks all but the last four digits", () => {
    expect(maskCardNumber("4084 0840 8408 4081")).toBe("**** **** **** 4081");
    expect(maskCardNumber("12")).toBe("****");
  });
});

describe("card expiry", () => {
  const now = new Date("2026-08-08T00:00:00");

  it("accepts a future month", () => {
    expect(isValidExpiry("12/27", now)).toBe(true);
  });

  it("accepts the current month up to its last day", () => {
    expect(isValidExpiry("08/26", now)).toBe(true);
  });

  it("rejects a month that has passed", () => {
    expect(isValidExpiry("07/26", now)).toBe(false);
  });

  it("rejects a malformed or impossible month", () => {
    expect(isValidExpiry("13/27", now)).toBe(false);
    expect(isValidExpiry("00/27", now)).toBe(false);
    expect(isValidExpiry("2027-12", now)).toBe(false);
  });
});

describe("validatePayment", () => {
  const now = new Date("2026-08-08T00:00:00");
  const valid = {
    cardHolder: "Ebube Ezedimbu",
    cardNumber: "4084 0840 8408 4081",
    expiry: "12/27",
    cvv: "123",
  };

  it("accepts complete, valid card details", () => {
    expect(validatePayment(valid, now).valid).toBe(true);
  });

  it("rejects a card that fails the Luhn check", () => {
    const result = validatePayment({ ...valid, cardNumber: "1234 5678 1234 5678" }, now);
    expect(result.errors.cardNumber).toMatch(/not valid/i);
  });

  it("accepts bank transfer payment method without requiring card numbers", () => {
    expect(validatePayment({ method: "transfer", cardHolder: "", cardNumber: "", expiry: "", cvv: "" }, now).valid).toBe(true);
  });

  it("accepts wallet payment method without requiring card numbers", () => {
    expect(validatePayment({ method: "wallet", cardHolder: "", cardNumber: "", expiry: "", cvv: "" }, now).valid).toBe(true);
  });
});

describe("sanitiseText", () => {
  it("strips angle brackets so stored values cannot inject markup", () => {
    expect(sanitiseText("<script>alert(1)</script>")).toBe("scriptalert(1)/script");
  });

  it("truncates to the maximum length", () => {
    expect(sanitiseText("a".repeat(500), 10)).toHaveLength(10);
  });

  it("trims surrounding whitespace", () => {
    expect(sanitiseText("  Ada  ")).toBe("Ada");
  });
});

describe("PNR generation", () => {
  it("produces a six-character code from the unambiguous alphabet", () => {
    for (let i = 0; i < 200; i += 1) {
      const pnr = generatePnr();
      expect(pnr).toHaveLength(PNR_LENGTH);
      expect(pnr.split("").every((char) => PNR_ALPHABET.includes(char))).toBe(true);
    }
  });

  it("excludes characters that are easily confused when read aloud", () => {
    expect(PNR_ALPHABET).not.toMatch(/[IO01]/);
  });

  it("avoids codes already in use", () => {
    const taken = new Set(Array.from({ length: 500 }, () => generatePnr()));
    const fresh = generateUniquePnr(taken);
    expect(taken.has(fresh)).toBe(false);
  });

  it("still returns a code when every attempt collides", () => {
    // A real Set whose `has` always reports a collision, forcing the fallback.
    const alwaysTaken = Object.assign(new Set<string>(), { has: () => true });
    const fallback = generateUniquePnr(alwaysTaken, 3);
    expect(fallback).toHaveLength(PNR_LENGTH);
  });

  it("validates the PNR format", () => {
    expect(isValidPnr("K7T2QM")).toBe(true);
    expect(isValidPnr("k7t2qm")).toBe(true);
    expect(isValidPnr("K7T2Q")).toBe(false);
    expect(isValidPnr("K7T2Q0")).toBe(false);
    expect(isValidPnr("")).toBe(false);
  });

  it("generates codes with a low collision rate", () => {
    const codes = new Set(Array.from({ length: 5_000 }, () => generatePnr()));
    // 32^6 is roughly one billion, so 5,000 draws should collide very rarely.
    expect(codes.size).toBeGreaterThan(4_990);
  });
});
