"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { AuthShell } from "@/components/AuthShell";
import { Alert, Field, Spinner } from "@/components/ui";
import { GoogleIcon, Icon } from "@/components/icons";
import { validateRegistration } from "@/lib/validation";

const POINTS = [
  {
    title: "One form, then you are flying",
    body: "No email confirmation, no verification step. The account exists the moment you submit it.",
  },
  {
    title: "Seats held against your name",
    body: "Bookings attach to your account, so an itinerary can be retrieved, printed and cancelled later.",
  },
  {
    title: "Your password is never stored in the clear",
    body: "It is salted and hashed on the SkyRoute server, and your session travels in an HTTP-only cookie.",
  },
];

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUp, user, continueAsGuest, syncSession } = useApp();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [oauthChecking, setOauthChecking] = useState(false);

  // Handle post-OAuth redirect if user lands on /register?oauth=success
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


  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const validation = validateRegistration(form);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setBusy(true);
    const result = await signUp({
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      password: form.password,
    });
    setBusy(false);

    if (!result.ok) {
      setError(result.error ?? "Registration failed.");
      if (result.fieldErrors) setErrors(result.fieldErrors);
      return;
    }
    router.push("/");
  }

  if (user) {
    return (
      <div className="container-page max-w-md">
        <Alert tone="success" title="You already have an account">
          You are signed in as {user.fullName}.
        </Alert>
        <Link href="/" className="btn-primary mt-6">
          <Icon name="search" className="h-4 w-4" />
          Search flights
        </Link>
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
          Or register with email
        </span>
      </div>

      <Field label="Full name" htmlFor="fullName" error={errors.fullName}>
        <input
          id="fullName"
          type="text"
          autoComplete="name"
          className={`input ${errors.fullName ? "input-error" : ""}`}
          value={form.fullName}
          onChange={(event) => update("fullName", event.target.value)}
        />
      </Field>

      <Field label="Email address" htmlFor="email" error={errors.email}>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className={`input ${errors.email ? "input-error" : ""}`}
          value={form.email}
          onChange={(event) => update("email", event.target.value)}
        />
      </Field>

      <Field label="Phone number" htmlFor="phone" error={errors.phone} hint="e.g. 08031234567">
        <input
          id="phone"
          type="tel"
          autoComplete="tel"
          className={`input ${errors.phone ? "input-error" : ""}`}
          value={form.phone}
          onChange={(event) => update("phone", event.target.value)}
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        error={errors.password}
        hint="At least 8 characters, with an upper-case letter, a lower-case letter and a number"
      >
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          className={`input ${errors.password ? "input-error" : ""}`}
          value={form.password}
          onChange={(event) => update("password", event.target.value)}
        />
      </Field>

      <Field label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword}>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          className={`input ${errors.confirmPassword ? "input-error" : ""}`}
          value={form.confirmPassword}
          onChange={(event) => update("confirmPassword", event.target.value)}
        />
      </Field>

      <button type="submit" disabled={busy} className="btn-primary btn-lg w-full">
        <Icon
          name={busy ? "spinner" : "plus"}
          className={`h-5 w-5 ${busy ? "animate-spin" : ""}`}
        />
        {busy ? "Creating account…" : "Create account"}
      </button>

      <div className="relative my-2 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-line" />
        </div>
        <span className="relative bg-surface px-3 text-micro font-medium uppercase tracking-wider text-ink-3">
          Or
        </span>
      </div>

      <button
        type="button"
        onClick={() => {
          continueAsGuest();
          router.push("/");
        }}
        className="btn-secondary btn-lg w-full justify-center text-center"
      >
        <Icon name="ticket" className="h-5 w-5 text-ink-2" />
        Continue as guest
      </button>
    </form>
  );
}

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your account."
      subtitle="It takes one form, and your trips follow you to any device you sign in from."
      points={POINTS}
      footer={
        <p className="text-center text-callout text-ink-2">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-accent-ink hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <Suspense
        fallback={
          <div className="card-lg py-12">
            <Spinner label="Loading account creation…" />
          </div>
        }
      >
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
