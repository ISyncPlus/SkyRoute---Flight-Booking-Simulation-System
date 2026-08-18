"use client";

/**
 * Application context.
 * --------------------
 * Holds the signed-in user and the "storage ready" flag.
 *
 * localStorage does not exist during server rendering, so every page waits on
 * `ready` before reading data. This avoids the hydration mismatch that occurs
 * when the server-rendered HTML and the first client render disagree.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  ensureSeeded,
  getSession,
  isGuestMode,
  login as repoLogin,
  logout as repoLogout,
  register as repoRegister,
  setGuestMode,
  setSession,
} from "@/lib/repository";
import { isStorageAvailable } from "@/lib/storage";
import type { SessionUser } from "@/lib/types";

interface AppContextValue {
  ready: boolean;
  storageAvailable: boolean;
  user: SessionUser | null;
  isGuest: boolean;
  isAdmin: boolean;
  continueAsGuest: () => void;
  exitGuest: () => void;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (input: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
  }) => Promise<{ ok: boolean; error?: string; fieldErrors?: Record<string, string> }>;
  signOut: () => void;
  refresh: () => void;
  /** Bumped whenever data changes, so pages can re-read state. */
  revision: number;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const available = isStorageAvailable();
      if (!available) {
        if (!cancelled) {
          setStorageAvailable(false);
          setReady(true);
        }
        return;
      }

      await ensureSeeded();
      if (cancelled) return;

      const sessionUser = getSession();
      setUser(sessionUser);
      setIsGuest(!sessionUser && isGuestMode());
      setReady(true);
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Keep multiple tabs in step. The `storage` event fires in every other tab
   * when localStorage is written, which is how a seat booked in one tab
   * becomes unavailable in another.
   */
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key && !event.key.startsWith("skyroute:")) return;
      const sessionUser = getSession();
      setUser(sessionUser);
      setIsGuest(!sessionUser && isGuestMode());
      setRevision((value) => value + 1);
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const refresh = useCallback(() => {
    const sessionUser = getSession();
    setUser(sessionUser);
    setIsGuest(!sessionUser && isGuestMode());
    setRevision((value) => value + 1);
  }, []);

  const continueAsGuest = useCallback(() => {
    setGuestMode(true);
    setIsGuest(true);
    setRevision((value) => value + 1);
  }, []);

  const exitGuest = useCallback(() => {
    setGuestMode(false);
    setIsGuest(false);
    setRevision((value) => value + 1);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await repoLogin(email, password);
    if (result.ok) {
      setGuestMode(false);
      setIsGuest(false);
      setUser(result.data);
      setRevision((value) => value + 1);
      return { ok: true };
    }
    return { ok: false, error: result.error };
  }, []);

  const signUp = useCallback(
    async (input: { fullName: string; email: string; phone: string; password: string }) => {
      const result = await repoRegister(input);
      if (result.ok) {
        setGuestMode(false);
        setIsGuest(false);
        setUser(result.data);
        setRevision((value) => value + 1);
        return { ok: true };
      }
      return { ok: false, error: result.error, fieldErrors: result.fieldErrors };
    },
    [],
  );

  const signOut = useCallback(() => {
    repoLogout();
    setSession(null);
    setGuestMode(false);
    setIsGuest(false);
    setUser(null);
    setRevision((value) => value + 1);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      storageAvailable,
      user,
      isGuest,
      isAdmin: user?.role === "admin",
      continueAsGuest,
      exitGuest,
      signIn,
      signUp,
      signOut,
      refresh,
      revision,
    }),
    [ready, storageAvailable, user, isGuest, continueAsGuest, exitGuest, signIn, signUp, signOut, refresh, revision],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside <AppProvider>.");
  return context;
}

/**
 * Read persisted state, re-reading whenever it changes.
 *
 * `read` is re-run when storage becomes available and whenever the revision
 * counter is bumped — which happens on any local mutation and on the storage
 * event fired by another tab. Pages should use this rather than calling
 * repository read functions inside their own useMemo, so that the
 * "re-read on change" behaviour lives in exactly one place.
 *
 * The linter cannot see that `revision` affects the result, because `read`
 * closes over the storage call rather than taking it as an argument. That is
 * the reason for the single suppression below, and the reason it is here and
 * not repeated in every page.
 */
export function useStored<T>(read: () => T, fallback: T, deps: unknown[] = []): T {
  const { ready, revision } = useApp();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => (ready ? read() : fallback), [ready, revision, ...deps]);
}
