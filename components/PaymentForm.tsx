"use client";

import { detectCardBrand } from "@/lib/validation";
import { Alert, Field } from "./ui";
import { Icon, type IconName } from "./icons";
import type { Payment } from "@/lib/types";

export interface PaymentDetails {
  method: Payment["method"];
  cardHolder: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
  simulateFailure: boolean;
}

/**
 * A card that passes the Luhn check, offered as one click rather than as a
 * number to copy out of a paragraph. Typing sixteen digits by hand to reach
 * the next step is the single most tedious moment in the whole flow.
 */
export const DEMO_CARD = {
  cardHolder: "Ada Okonkwo",
  cardNumber: "4084 0840 8408 4081",
  expiry: "12/30",
  cvv: "123",
} as const;

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
  const isCard = details.method === "card";

  return (
    <div className="space-y-5">
      <Alert tone="info" title="No real money moves">
        This is a demonstration checkout. Nothing is charged and no details leave your browser.
      </Alert>

      <div className="card-lg">
        <h3 className="mb-4 text-footnote font-semibold text-ink">Payment method</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {([
            { value: "card", label: "Debit / credit card", icon: "creditCard" },
            { value: "transfer", label: "Bank transfer", icon: "building" },
            { value: "wallet", label: "Wallet", icon: "banknote" },
          ] as const satisfies readonly { value: Payment["method"]; label: string; icon: IconName }[]).map((option) => (
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
              <Icon name={option.icon} className="h-4 w-4" />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      {!isCard && (
        <div className="card-lg">
          <div className="mb-5 flex items-center gap-2 border-b border-line pb-4">
            <Icon name={details.method === "transfer" ? "building" : "banknote"} className="h-4 w-4 text-ink-3" />
            <h3 className="text-footnote font-semibold text-ink">
              {details.method === "transfer" ? "Bank transfer" : "SkyRoute wallet"}
            </h3>
          </div>

          {details.method === "transfer" ? (
            <>
              <p className="text-footnote text-ink-2">
                Transfer the fare to the account below, quoting the reference. The booking is held
                while the transfer clears, and your reference is issued as soon as it does.
              </p>
              <dl className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  { term: "Bank", value: "Providus Bank" },
                  { term: "Account number", value: "1305012345", mono: true },
                  { term: "Account name", value: "SkyRoute Airways Ltd" },
                ].map((row) => (
                  <div key={row.term} className="rounded-lg border border-line bg-fill px-4 py-3">
                    <dt className="text-micro uppercase tracking-wide text-ink-3">{row.term}</dt>
                    <dd className={`mt-1 text-footnote font-semibold text-ink ${row.mono ? "font-mono" : ""}`}>
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <>
              <p className="text-footnote text-ink-2">
                The fare is taken from your SkyRoute wallet the moment you confirm. Nothing else to
                enter.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-fill px-5 py-4">
                <span className="flex items-center gap-2.5 text-footnote text-ink-2">
                  <Icon name="banknote" className="h-4 w-4 text-ink-3" />
                  Available balance
                </span>
                <span className="text-title-3 font-semibold tabular text-ink">₦250,000</span>
              </div>
            </>
          )}
        </div>
      )}

      {isCard && (
      <div className="card-lg">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div className="flex items-center gap-2">
            <Icon name="lock" className="h-4 w-4 text-ink-3" />
            <h3 className="text-footnote font-semibold text-ink">Card details</h3>
          </div>
          {/* Fills the whole card in one press. */}
          <button
            type="button"
            onClick={() => onChange({ ...DEMO_CARD })}
            className="btn-ghost !px-3 !py-1.5 text-caption"
          >
            <Icon name="sparkles" className="h-3.5 w-3.5" />
            Use demo card
          </button>
        </div>

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
      </div>
      )}

      {/* Outside the card block: a transfer can fail to clear and a wallet can
          come up short, so the failure path has to be reachable from all three
          methods rather than only from the card. */}
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-dashed border-line-strong bg-fill p-4 text-footnote text-ink-2">
        <input
          type="checkbox"
          checked={details.simulateFailure}
          onChange={(event) => onChange({ simulateFailure: event.target.checked })}
          className="mt-0.5 h-4 w-4"
        />
        <span>
          <span className="font-medium text-ink">Test a declined payment.</span> Included so
          the failure path can be demonstrated: the booking will be rejected and no seats
          will be held.
        </span>
      </label>
    </div>
  );
}
