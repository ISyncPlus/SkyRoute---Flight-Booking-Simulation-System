"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/components/AppProvider";
import { AuthShell } from "@/components/AuthShell";
import { Alert, Field } from "@/components/ui";
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
    title: "Stored only in this browser",
    body: "Your password is salted and hashed into localStorage. Nothing is transmitted anywhere.",
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const { signUp, user } = useApp();
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
          Search flights
        </Link>
      </div>
    );
  }

  return (
    <AuthShell
      title="Create your account."
      subtitle="It takes one form, and your details never leave this browser."
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
      <form onSubmit={handleSubmit} noValidate className="card-lg space-y-6">
        {error && <Alert tone="error">{error}</Alert>}

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
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}
