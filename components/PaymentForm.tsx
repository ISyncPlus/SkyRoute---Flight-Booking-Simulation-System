"use client";

import { useState } from "react";
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
  senderName?: string;
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
  totalAmount,
  currency = "NGN",
  onChange,
}: {
  details: PaymentDetails;
  errors: Record<string, string>;
  totalAmount?: number;
  currency?: string;
  onChange: (changes: Partial<PaymentDetails>) => void;
}) {
  const brand = detectCardBrand(details.cardNumber);
  const isCard = details.method === "card";
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(500000);

  const copyToClipboard = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const fareTotal = totalAmount ?? 0;
  const remainingWallet = walletBalance - fareTotal;

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
            { value: "wallet", label: "Wallet balance", icon: "banknote" },
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
            <Icon name={details.method === "transfer" ? "building" : "banknote"} className="h-4 w-4 text-accent" />
            <h3 className="text-footnote font-semibold text-ink">
              {details.method === "transfer" ? "Pay via Direct Bank Transfer" : "Pay with SkyRoute Digital Wallet"}
            </h3>
          </div>

          {details.method === "transfer" ? (
            <div className="space-y-5">
              <p className="text-footnote text-ink-2">
                Transfer the exact booking amount to the designated corporate clearing account below.
                Your reservation is held and confirmed as soon as payment is submitted.
              </p>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { key: "bank", term: "Bank Name", value: "Providus Bank", copyable: "Providus Bank" },
                  { key: "account", term: "Account Number", value: "1305012345", mono: true, copyable: "1305012345" },
                  { key: "name", term: "Account Name", value: "SkyRoute Airways Ltd", copyable: "SkyRoute Airways Ltd" },
                ].map((row) => (
                  <div key={row.term} className="relative flex flex-col justify-between rounded-lg border border-line bg-fill p-4">
                    <div>
                      <dt className="text-micro uppercase tracking-wide text-ink-3">{row.term}</dt>
                      <dd className={`mt-1 text-footnote font-semibold text-ink ${row.mono ? "font-mono text-body" : ""}`}>
                        {row.value}
                      </dd>
                    </div>
                    {row.copyable && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(row.key, row.copyable)}
                        className="mt-3 flex items-center gap-1.5 self-start rounded border border-line bg-surface px-2.5 py-1 text-caption text-ink-2 hover:bg-fill hover:text-ink transition-colors"
                      >
                        <Icon name={copiedKey === row.key ? "check" : "copy"} className="h-3.5 w-3.5 text-accent" />
                        <span>{copiedKey === row.key ? "Copied!" : "Copy"}</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-line bg-surface p-4">
                <Field
                  label="Sender / Depositor Name"
                  htmlFor="senderName"
                  hint="Enter the name on the originating bank account"
                  error={errors.senderName}
                >
                  <input
                    id="senderName"
                    type="text"
                    placeholder="e.g. Ada Okonkwo"
                    className="input"
                    value={details.senderName ?? details.cardHolder}
                    onChange={(event) =>
                      onChange({ senderName: event.target.value, cardHolder: event.target.value })
                    }
                  />
                </Field>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-accent-soft/50 p-3 text-footnote text-accent-ink">
                <Icon name="checkCircle" className="h-4 w-4 shrink-0 text-accent" />
                <span>Instant clearing simulation enabled. No waiting for manual teller verification.</span>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <p className="text-footnote text-ink-2">
                The total fare will be debited directly from your SkyRoute Digital Wallet balance.
              </p>

              <div className="rounded-xl border border-line bg-fill p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                  <div>
                    <p className="text-caption text-ink-3">Active Account</p>
                    <p className="text-callout font-semibold text-ink">
                      {details.cardHolder || "Verified SkyRoute Member"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-caption text-ink-3">Available Balance</p>
                    <p className="text-title-2 font-semibold font-mono text-positive-ink">
                      ₦{walletBalance.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-footnote text-ink-2">
                  <div className="flex justify-between">
                    <span>Fare total deduction</span>
                    <span className="font-mono font-medium text-danger-ink">
                      - ₦{fareTotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-line-strong pt-2 font-semibold text-ink">
                    <span>Estimated balance after booking</span>
                    <span className={`font-mono ${remainingWallet >= 0 ? "text-ink" : "text-danger-ink"}`}>
                      ₦{Math.max(0, remainingWallet).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-caption text-positive-ink font-medium">
                  <Icon name="checkCircle" className="h-4 w-4" />
                  <span>Wallet is funded and ready for instant checkout</span>
                </div>
                <button
                  type="button"
                  onClick={() => setWalletBalance((b) => b + 100000)}
                  className="btn-ghost !px-3 !py-1 text-caption text-accent"
                >
                  <Icon name="plus" className="h-3.5 w-3.5" />
                  Add +₦100,000 Demo Funds
                </button>
              </div>
            </div>
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
