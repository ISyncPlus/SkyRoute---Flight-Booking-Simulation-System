/**
 * Unit tests: authentication primitives.
 * Traceable to requirements NFR-03 (credentials never stored in plain text)
 * and NFR-04 (constant-time verification).
 */

import { describe, expect, it } from "vitest";
import {
  constantTimeEquals,
  createUserRecord,
  fallbackHash,
  generateSalt,
  hashPassword,
  toSessionUser,
  verifyPassword,
} from "@/lib/auth";

describe("generateSalt", () => {
  it("returns a hex string of the requested byte length", () => {
    expect(generateSalt(16)).toMatch(/^[0-9a-f]{32}$/);
    expect(generateSalt(8)).toHaveLength(16);
  });

  it("returns a different salt every time", () => {
    const salts = new Set(Array.from({ length: 200 }, () => generateSalt()));
    expect(salts.size).toBe(200);
  });
});

describe("hashPassword", () => {
  it("is deterministic for the same password and salt", async () => {
    const salt = generateSalt();
    const a = await hashPassword("Passw0rd", salt);
    const b = await hashPassword("Passw0rd", salt);
    expect(a).toBe(b);
  });

  it("produces different hashes for the same password under different salts", async () => {
    const a = await hashPassword("Passw0rd", generateSalt());
    const b = await hashPassword("Passw0rd", generateSalt());
    expect(a).not.toBe(b);
  });

  it("produces different hashes for different passwords", async () => {
    const salt = generateSalt();
    const a = await hashPassword("Passw0rd", salt);
    const b = await hashPassword("Passw0rc", salt);
    expect(a).not.toBe(b);
  });

  it("never returns the password itself", async () => {
    const hash = await hashPassword("Passw0rd", generateSalt());
    expect(hash).not.toContain("Passw0rd");
    expect(hash.length).toBeGreaterThanOrEqual(32);
  });
});

describe("fallbackHash", () => {
  it("is deterministic", () => {
    expect(fallbackHash("Passw0rd", "abc", 10)).toBe(fallbackHash("Passw0rd", "abc", 10));
  });

  it("is sensitive to the salt and to the password", () => {
    expect(fallbackHash("Passw0rd", "abc", 10)).not.toBe(fallbackHash("Passw0rd", "abd", 10));
    expect(fallbackHash("Passw0rd", "abc", 10)).not.toBe(fallbackHash("Passw0re", "abc", 10));
  });

  it("is sensitive to the iteration count", () => {
    expect(fallbackHash("Passw0rd", "abc", 10)).not.toBe(fallbackHash("Passw0rd", "abc", 11));
  });
});

describe("constantTimeEquals", () => {
  it("matches identical strings", () => {
    expect(constantTimeEquals("abcdef", "abcdef")).toBe(true);
  });

  it("rejects different strings of the same length", () => {
    expect(constantTimeEquals("abcdef", "abcdeg")).toBe(false);
  });

  it("rejects strings of different lengths", () => {
    expect(constantTimeEquals("abc", "abcd")).toBe(false);
  });

  it("rejects non-string input", () => {
    expect(constantTimeEquals(null as unknown as string, "abc")).toBe(false);
  });
});

describe("createUserRecord and verifyPassword", () => {
  const input = {
    fullName: "Ebube Ezedimbu",
    email: "  EBUBE@Example.COM ",
    phone: "08031234567",
    password: "Passw0rd",
  };

  it("normalises the email to lower case and trims whitespace", async () => {
    const user = await createUserRecord(input);
    expect(user.email).toBe("ebube@example.com");
  });

  it("stores a hash and a salt, never the password", async () => {
    const user = await createUserRecord(input);
    expect(user.passwordHash).toBeTruthy();
    expect(user.passwordSalt).toBeTruthy();
    expect(JSON.stringify(user)).not.toContain("Passw0rd");
  });

  it("defaults to the customer role", async () => {
    const user = await createUserRecord(input);
    expect(user.role).toBe("customer");
  });

  it("honours an explicit admin role", async () => {
    const user = await createUserRecord({ ...input, role: "admin" });
    expect(user.role).toBe("admin");
  });

  it("verifies the correct password", async () => {
    const user = await createUserRecord(input);
    await expect(verifyPassword("Passw0rd", user)).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const user = await createUserRecord(input);
    await expect(verifyPassword("Passw0rD", user)).resolves.toBe(false);
    await expect(verifyPassword("", user)).resolves.toBe(false);
  });

  it("gives two accounts with the same password different hashes", async () => {
    const a = await createUserRecord(input);
    const b = await createUserRecord({ ...input, email: "other@example.com" });
    expect(a.passwordHash).not.toBe(b.passwordHash);
  });
});

describe("toSessionUser", () => {
  it("strips the credential fields", async () => {
    const user = await createUserRecord({
      fullName: "Ada Okonkwo",
      email: "ada@example.com",
      phone: "08031234567",
      password: "Passw0rd",
    });

    const session = toSessionUser(user);
    expect(session).toEqual({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    });
    expect(JSON.stringify(session)).not.toContain(user.passwordHash);
  });
});
