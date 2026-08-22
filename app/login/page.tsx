"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { AuthShell } from "@/components/AuthShell";
import { Alert, Field, Spinner } from "@/components/ui";
import { GoogleIcon, Icon } from "@/components/icons";
import { DEMO_ADMIN, DEMO_CUSTOMER } from "@/lib/auth";

const POINTS = [
  {
    title: "Your seat, held",
    body: "A booking has to belong to someone. Signing in is what lets the system hold a seat against your name.",
  },
  {
    title: "Every trip in one place",
    body: "Itineraries, e-tickets and refunds live under your account, ready to print or cancel.",
  },
  {
    title: "Credentials are handled properly",
    body: "Passwords are salted and hashed on the SkyRoute server, and your session is an HTTP-only cookie the page itself cannot read.",
  },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, user, syncSession } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [oauthChecking, setOauthChecking] = useState(false);

  // Handle post-OAuth redirect
  useEffect(() => {
    const oauthStatus = searchParams.get("oauth");
    const reason = searchParams.get("reason");

    if (oauthStatus === "success") {
      setOauthChecking(true);
      (async () => {
        const currentUser = await syncSession();
        setOauthChecking(false);
        if (currentUser) {
          router.push("/bookings");
        } else {
          router.push("/");
        }
      })();
    } else if (oauthStatus === "error") {
      setError(reason || "Google sign in failed. Please try again.");
    }
  }, [searchParams, syncSession, router]);

  function handleGoogleLogin() {
    const isLocal =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      (isLocal ? "http://localhost:4000/api" : "https://skyroute-server.onrender.com/api");
    window.location.href = `${apiUrl.replace(/\/+$/, "")}/auth/oauth/google`;
  }


  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    const result = await signIn(email, password);
    setBusy(false);

    if (!result.ok) {
      setError(result.error ?? "Sign in failed.");
      return;
    }
    router.push("/bookings");
  }

  function fill(account: { email: string; password: string }) {
    setEmail(account.email);
    setPassword(account.password);
    setError(null);
  }

  if (user) {
    return (
      <div className="container-page max-w-md">
        <Alert tone="success" title="Already signed in">
          You are signed in as {user.fullName}.
        </Alert>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/bookings" className="btn-primary">
            <Icon name="ticket" className="h-4 w-4" />
            My bookings
          </Link>
          <Link href="/" className="btn-secondary">
            <Icon name="search" className="h-4 w-4" />
            Search flights
          </Link>
        </div>
      </div>
    );
  }

  if (oauthChecking) {
    return (
      <div className="card-lg flex flex-col items-center justify-center py-12 text-center">
        <Spinner label="Completing Google sign in…" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="card-lg space-y-6">
      {error && <Alert tone="error">{error}</Alert>}

      {/* Google OAuth Button */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-callout font-semibold text-ink shadow-sm transition hover:bg-fill active:scale-[0.99]"
      >
        <GoogleIcon className="h-5 w-5 shrink-0" />
        <span>Continue with Google</span>
      </button>

      <div className="relative my-2 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-line" />
        </div>
        <span className="relative bg-surface px-3 text-micro font-medium uppercase tracking-wider text-ink-3">
          Or continue with email
        </span>
      </div>

      <Field label="Email address" htmlFor="email">
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          className="input"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>

      <Field label="Password" htmlFor="password">
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          className="input"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </Field>

      <button type="submit" disabled={busy} className="btn-primary btn-lg w-full">
        <Icon
          name={busy ? "spinner" : "signIn"}
          className={`h-5 w-5 ${busy ? "animate-spin" : ""}`}
        />
        {busy ? "Signing in…" : "Sign in"}
      </button>

      <div className="border-t border-line pt-6">
        <p className="overline">Demonstration accounts</p>
        <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={() => fill(DEMO_CUSTOMER)}
            className="btn-secondary w-full sm:w-auto text-center justify-center"
          >
            <Icon name="user" className="h-4 w-4" />
            Use customer account
          </button>
          <button
            type="button"
            onClick={() => fill(DEMO_ADMIN)}
            className="btn-secondary w-full sm:w-auto text-center justify-center"
          >
            <Icon name="shield" className="h-4 w-4" />
            Use admin account
          </button>
        </div>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back."
      subtitle="Sign in to book a flight and manage your reservations."
      points={POINTS}
      footer={
        <p className="text-center text-callout text-ink-2">
          No account yet?{" "}
          <Link href="/register" className="font-semibold text-accent-ink hover:underline">
            Create one
          </Link>
        </p>
      }
    >
      <Suspense
        fallback={
          <div className="card-lg py-12">
            <Spinner label="Loading sign in…" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
