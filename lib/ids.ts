/**
 * Identifier generation.
 * ----------------------
 * PNRs (Passenger Name Records) are the six-character alphanumeric codes
 * airlines use to identify a reservation. Real systems avoid characters that
 * are easy to confuse when read aloud at a check-in desk, so we exclude
 * I, O, 0 and 1 from the alphabet.
 */

/** Unambiguous alphabet: no I, O, 0 or 1. */
export const PNR_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const PNR_LENGTH = 6;

/**
 * Cryptographically strong random integers where available, falling back to
 * Math.random in environments without the Web Crypto API (e.g. old browsers).
 */
function randomInt(maxExclusive: number): number {
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.getRandomValues) {
    const buffer = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buffer);
    return buffer[0] % maxExclusive;
  }
  return Math.floor(Math.random() * maxExclusive);
}

/** Generate a single six-character PNR. Uniqueness is enforced by the caller. */
export function generatePnr(): string {
  let pnr = "";
  for (let i = 0; i < PNR_LENGTH; i += 1) {
    pnr += PNR_ALPHABET[randomInt(PNR_ALPHABET.length)];
  }
  return pnr;
}

/**
 * Generate a PNR that does not collide with any code already in use.
 * Falls back to a timestamp-suffixed code after `maxAttempts` collisions so
 * the function can never loop forever.
 */
export function generateUniquePnr(existing: Set<string> | string[], maxAttempts = 50): string {
  const taken = existing instanceof Set ? existing : new Set(existing);
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = generatePnr();
    if (!taken.has(candidate)) return candidate;
  }
  const suffix = Date.now().toString(36).toUpperCase().slice(-4);
  return `${generatePnr().slice(0, 2)}${suffix}`;
}

/** Validate the format of a PNR (used by the "find my booking" lookup). */
export function isValidPnr(value: string): boolean {
  if (typeof value !== "string") return false;
  const upper = value.trim().toUpperCase();
  if (upper.length !== PNR_LENGTH) return false;
  return upper.split("").every((char) => PNR_ALPHABET.includes(char));
}

/** Generic prefixed identifier for users, passengers and payments. */
export function generateId(prefix: string): string {
  const random = randomInt(0xffffff).toString(36).padStart(4, "0");
  return `${prefix}_${Date.now().toString(36)}${random}`;
}

/** Simulated payment gateway transaction reference. */
export function generateTransactionReference(): string {
  return `TXN-${Date.now().toString(36).toUpperCase()}-${randomInt(0xffff)
    .toString(16)
    .toUpperCase()
    .padStart(4, "0")}`;
}
