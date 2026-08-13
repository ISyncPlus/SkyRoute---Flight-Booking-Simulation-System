"use client";

import { detectCardBrand } from "@/lib/validation";
import { Alert, Field } from "./ui";
import type { Payment } from "@/lib/types";

export interface PaymentDetails {
  method: Payment["method"];
  cardHolder: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
  simulateFailure: boolean;
}

/** Group digits into blocks of four as the user types. */
function formatCardNumber(value: string): string {
  return value
    .replace(/\D/g, "")
    .slice(0, 19)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function PaymentForm({
  details,
  errors,
  onChange,
}: {
  details: PaymentDetails;
  errors: Record<string, string>;
  onChange: (changes: Partial<PaymentDetails>) => void;
}) {
  const brand = detectCardBrand(details.cardNumber);

  return (
    <div className="space-y-5">
      <Alert tone="warning" title="Simulated payment">
        No real payment is processed and no card details leave your browser. Use any card number that
        passes the Luhn check, for example <code className="font-semibold">4084 0840 8408 4081</code>.
      </Alert>

      <fieldset className="card-lg">
        <legend className="px-1 text-footnote font-semibold text-ink">Payment method</legend>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {([
            { value: "card", label: "Debit / credit card" },
            { value: "transfer", label: "Bank transfer" },
            { value: "wallet", label: "Wallet" },
          ] as const).map((option) => (
            <label
              key={option.value}
              className={`pressable flex cursor-pointer items-center gap-2.5 rounded-lg border px-4 py-3.5 text-footnote ${
                details.method === option.value
                  ? "border-accent bg-accent-soft font-semibold text-accent-ink"
                  : "border-line-strong bg-surface text-ink-2"
              }`}
            >
              <input
                type="radio"
                name="payment-method"
                value={option.value}
                checked={details.method === option.value}
                onChange={() => onChange({ method: option.value })}
                className="h-4 w-4"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="card-lg">
        <legend className="px-1 text-footnote font-semibold text-ink">Card details</legend>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Name on card" htmlFor="cardHolder" error={errors.cardHolder}>
              <input
                id="cardHolder"
                type="text"
                autoComplete="cc-name"
                className={`input ${errors.cardHolder ? "input-error" : ""}`}
                value={details.cardHolder}
                onChange={(event) => onChange({ cardHolder: event.target.value })}
              />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field
              label="Card number"
              htmlFor="cardNumber"
              error={errors.cardNumber}
              hint={details.cardNumber.length > 3 ? `Detected: ${brand}` : "Validated with the Luhn algorithm"}
            >
              <input
                id="cardNumber"
                type="text"
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="0000 0000 0000 0000"
                className={`input font-mono tracking-wider ${errors.cardNumber ? "input-error" : ""}`}
                value={details.cardNumber}
                onChange={(event) => onChange({ cardNumber: formatCardNumber(event.target.value) })}
              />
            </Field>
          </div>

          <Field label="Expiry date" htmlFor="expiry" error={errors.expiry} hint="MM/YY">
            <input
              id="expiry"
              type="text"
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM/YY"
              className={`input font-mono ${errors.expiry ? "input-error" : ""}`}
              value={details.expiry}
              onChange={(event) => onChange({ expiry: formatExpiry(event.target.value) })}
            />
          </Field>

          <Field label="CVV" htmlFor="cvv" error={errors.cvv} hint="3 digits on the back of the card">
            <input
              id="cvv"
              type="password"
              inputMode="numeric"
              autoComplete="cc-csc"
              maxLength={4}
              placeholder="•••"
              className={`input font-mono ${errors.cvv ? "input-error" : ""}`}
              value={details.cvv}
              onChange={(event) => onChange({ cvv: event.target.value.replace(/\D/g, "").slice(0, 4) })}
            />
          </Field>
        </div>

        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-lg border border-dashed border-line-strong bg-fill p-4 text-footnote text-ink-2">
          <input
            type="checkbox"
            checked={details.simulateFailure}
            onChange={(event) => onChange({ simulateFailure: event.target.checked })}
            className="mt-0.5 h-4 w-4"
          />
          <span>
            <span className="font-medium text-ink">Simulate a declined payment.</span> Included so
            the failure path can be demonstrated and tested: the booking will be rejected and no seats
            will be held.
          </span>
        </label>
      </fieldset>
    </div>
  );
}
