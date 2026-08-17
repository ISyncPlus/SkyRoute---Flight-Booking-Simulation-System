"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/components/AppProvider";
import { AuthShell } from "@/components/AuthShell";
import { Alert, Field } from "@/components/ui";
import { Icon } from "@/components/icons";
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
    title: "Nothing leaves this browser",
    body: "Credentials are salted and hashed into localStorage. There is no server to send them to.",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { signIn, user } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      <form onSubmit={handleSubmit} noValidate className="card-lg space-y-6">
        {error && <Alert tone="error">{error}</Alert>}

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
          <div className="mt-4 flex flex-wrap gap-2.5">
            <button type="button" onClick={() => fill(DEMO_CUSTOMER)} className="btn-secondary">
              <Icon name="user" className="h-4 w-4" />
              Use customer account
            </button>
            <button type="button" onClick={() => fill(DEMO_ADMIN)} className="btn-secondary">
              <Icon name="shield" className="h-4 w-4" />
              Use admin account
            </button>
          </div>
        </div>
      </form>
    </AuthShell>
  );
}
