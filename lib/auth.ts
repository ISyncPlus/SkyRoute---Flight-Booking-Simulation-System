/**
 * Authentication.
 * ---------------
 * IMPORTANT - scope of the security model.
 *
 * This is a simulation that stores everything in the browser, so it cannot
 * offer the guarantees of a server-backed system. There is no secret the
 * client does not also hold, which means the hashing below protects users
 * against casual inspection and against password reuse across sites, but not
 * against a determined attacker with access to the machine. The technical
 * report discusses this limitation and the server-side design that would
 * replace it in production.
 *
 * What is implemented:
 *  - Passwords are never stored in plain text.
 *  - Each account gets a unique random salt, so identical passwords produce
 *    different hashes and precomputed rainbow tables are useless.
 *  - Key stretching: the hash is iterated to make brute force slower.
 *  - Constant-time comparison, so verification time leaks nothing.
 */

import { generateId } from "./ids";
import type { SessionUser, User, UserRole } from "./types";

export const HASH_ITERATIONS = 1000;

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Random salt as a hex string. */
export function generateSalt(byteLength = 16): string {
  const bytes = new Uint8Array(byteLength);
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteLength; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Deterministic fallback used only where the Web Crypto API is unavailable
 * (very old browsers, or a test runner without a crypto implementation).
 * Based on the FNV-1a construction, iterated for key stretching.
 */
export function fallbackHash(password: string, salt: string, iterations = HASH_ITERATIONS): string {
  let current = `${salt}:${password}`;
  for (let round = 0; round < iterations; round += 1) {
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    for (let i = 0; i < current.length; i += 1) {
      const code = current.charCodeAt(i);
      h1 ^= code;
      h1 = Math.imul(h1, 0x01000193) >>> 0;
      h2 = (Math.imul(h2 ^ code, 0x85ebca6b) + round) >>> 0;
    }
    current = h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0") + salt;
  }
  return current.slice(0, 64);
}

/** Salted, iterated SHA-256. Falls back to `fallbackHash` where unsupported. */
export async function hashPassword(
  password: string,
  salt: string,
  iterations = HASH_ITERATIONS,
): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle || typeof TextEncoder === "undefined") {
    return fallbackHash(password, salt, iterations);
  }

  try {
    const encoder = new TextEncoder();
    let digest = await subtle.digest("SHA-256", encoder.encode(`${salt}:${password}`));
    for (let round = 1; round < iterations; round += 1) {
      digest = await subtle.digest("SHA-256", digest);
    }
    return toHex(digest);
  } catch {
    return fallbackHash(password, salt, iterations);
  }
}

/** Comparison whose running time does not depend on where the strings differ. */
export function constantTimeEquals(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) {
    difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return difference === 0;
}

/** Check a submitted password against a stored account record. */
export async function verifyPassword(password: string, user: Pick<User, "passwordHash" | "passwordSalt">): Promise<boolean> {
  const candidate = await hashPassword(password, user.passwordSalt);
  return constantTimeEquals(candidate, user.passwordHash);
}

/** Build a new account record with the password already hashed. */
export async function createUserRecord(input: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role?: UserRole;
}): Promise<User> {
  const salt = generateSalt();
  const passwordHash = await hashPassword(input.password, salt);

  return {
    id: generateId("usr"),
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    passwordHash,
    passwordSalt: salt,
    phone: input.phone.trim(),
    role: input.role ?? "customer",
    createdAt: new Date().toISOString(),
  };
}

/** Strip the credential fields before a user object touches React state. */
export function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    avatar: user.avatar,
    picture: user.picture,
    image: user.image,
  };
}


/** Demo administrator credentials, seeded on first run. */
export const DEMO_ADMIN = {
  fullName: "System Administrator",
  email: "admin@skyroute.test",
  phone: "08030000000",
  password: "passw0rd",
} as const;

/** Demo customer credentials, seeded on first run. */
export const DEMO_CUSTOMER = {
  fullName: "Ada Okonkwo",
  email: "customer@skyroute.test",
  phone: "08031234567",
  password: "p@ssword",
} as const;

