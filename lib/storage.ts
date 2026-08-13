/**
 * Storage adapter.
 * ----------------
 * The single point in the system that touches window.localStorage.
 *
 * Everything above this file works with plain objects, so replacing this
 * module with an HTTP client that talks to a real database would not
 * require any change to the business logic or the UI. This is the
 * Repository / Data-Access-Object pattern applied to browser storage.
 *
 * Safety notes:
 *  - All access is guarded for server-side rendering (window is undefined
 *    during Next.js prerendering).
 *  - All reads are wrapped in try/catch so a corrupted or tampered value
 *    degrades to the default instead of crashing the application.
 *  - A schema version is stored alongside the data so that future changes
 *    to the data model can trigger a controlled migration or reset.
 */

export const STORAGE_PREFIX = "skyroute:";
export const SCHEMA_VERSION = 1;

/** True when running in a browser with a usable localStorage implementation. */
export function isStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const probe = `${STORAGE_PREFIX}__probe__`;
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    // Private browsing mode or storage quota exceeded.
    return false;
  }
}

/** Read and JSON-parse a namespaced key, returning `fallback` on any failure. */
export function readItem<T>(key: string, fallback: T): T {
  if (!isStorageAvailable()) return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** JSON-serialise and write a namespaced key. Returns false if the write failed. */
export function writeItem<T>(key: string, value: T): boolean {
  if (!isStorageAvailable()) return false;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    // QuotaExceededError - the caller decides how to surface this.
    return false;
  }
}

/** Remove a namespaced key. */
export function removeItem(key: string): void {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    /* no-op */
  }
}

/** Remove every key owned by this application, leaving other sites untouched. */
export function clearAll(): void {
  if (!isStorageAvailable()) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    /* no-op */
  }
}

/** Approximate number of bytes this application is using, for the admin panel. */
export function usedBytes(): number {
  if (!isStorageAvailable()) return 0;
  let total = 0;
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
      const value = window.localStorage.getItem(key) ?? "";
      total += key.length + value.length;
    }
  } catch {
    return 0;
  }
  // UTF-16: two bytes per code unit.
  return total * 2;
}
