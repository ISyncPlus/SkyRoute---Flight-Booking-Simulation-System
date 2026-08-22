"use client";

/** Small presentational building blocks shared across pages. */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "./icons";

/**
 * Reveals its children once, when they first scroll into view.
 *
 * Marketing surfaces only — a page somebody visits every day should not make
 * them wait for its content to arrive. It fires once and then disconnects, so
 * scrolling back up does not replay it.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // No observer means no reveal — show the content rather than hide it.
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-visible={visible}
      className={`reveal-up ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

/* The icon carries the tone as well as the wording does — and carries it for
   the reader who cannot see the colour. */
const ALERT_TONES = {
  info: { box: "bg-accent-soft text-accent-ink", tint: "text-accent", icon: "infoCircle" },
  success: { box: "bg-positive-soft text-positive-ink", tint: "text-positive", icon: "checkCircle" },
  warning: { box: "bg-warn-soft text-warn-ink", tint: "text-warn", icon: "alertTriangle" },
  error: { box: "bg-danger-soft text-danger-ink", tint: "text-danger", icon: "xCircle" },
} as const;

export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: keyof typeof ALERT_TONES;
  title?: string;
  children: ReactNode;
}) {
  const { box, tint, icon } = ALERT_TONES[tone];

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`enter flex gap-3 rounded-lg border border-line px-4 py-3.5 text-callout ${box}`}
    >
      <Icon name={icon} className={`mt-0.5 h-5 w-5 shrink-0 ${tint}`} />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        <div className={title ? "mt-0.5" : ""}>{children}</div>
      </div>
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-callout text-ink-2" role="status">
      <Icon name="spinner" className="h-5 w-5 animate-spin text-accent" />
      <span>{label}</span>
    </div>
  );
}

export function ButtonSpinner({ className = "h-4 w-4" }: { className?: string }) {
  return <Icon name="spinner" className={`animate-spin ${className}`} />;
}

/** Basic shimmering skeleton block */
export function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div className={`skeleton rounded-md ${className}`} style={style} aria-hidden="true" />;
}

/** Skeleton for flight search result card */
export function FlightCardSkeleton() {
  return (
    <div className="card space-y-4 p-5 sm:p-6" aria-hidden="true">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:items-center">
        <div className="sm:col-span-8 flex items-center justify-between gap-4">
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-3.5 w-24" />
          </div>

          <div className="flex flex-1 flex-col items-center px-3 space-y-1.5">
            <Skeleton className="h-3 w-14" />
            <div className="relative w-full flex items-center justify-center">
              <Skeleton className="h-0.5 w-full" />
              <div className="absolute h-2 w-2 rounded-full bg-fill-strong" />
            </div>
            <Skeleton className="h-3 w-12" />
          </div>

          <div className="space-y-1.5 text-right">
            <Skeleton className="h-6 w-16 ml-auto" />
            <Skeleton className="h-3.5 w-24 ml-auto" />
          </div>
        </div>

        <div className="sm:col-span-4 flex sm:flex-col items-center sm:items-end justify-between gap-2 sm:border-l sm:border-line sm:pl-5">
          <div className="space-y-1 sm:text-right">
            <Skeleton className="h-3 w-12 sm:ml-auto" />
            <Skeleton className="h-6 w-28 sm:ml-auto" />
          </div>
          <Skeleton className="h-10 w-28 sm:w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/** Multiple flight card skeletons for search loading */
export function FlightSearchResultsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" role="status" aria-label="Loading flight results">
      {Array.from({ length: count }).map((_, index) => (
        <FlightCardSkeleton key={index} />
      ))}
    </div>
  );
}

/** Skeleton for booking / itinerary card */
export function BookingCardSkeleton() {
  return (
    <div className="card space-y-5 p-5 sm:p-6" aria-hidden="true">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-20 rounded-md" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="h-4 w-32" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-3.5 w-20" />
          </div>
          <Skeleton className="h-4 w-12" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-3.5 w-20" />
          </div>
        </div>
        <Skeleton className="h-5 w-28" />
      </div>

      <div className="flex items-center justify-between border-t border-line pt-4">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
    </div>
  );
}

/** Skeleton for aircraft seat map */
export function SeatMapSkeleton() {
  return (
    <div className="card space-y-6 p-6" aria-hidden="true">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3.5 w-24" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>

      {/* Fuselage shape */}
      <div className="mx-auto max-w-sm rounded-3xl border border-line bg-surface/50 p-6 space-y-6">
        <div className="mx-auto h-12 w-28 rounded-t-full border-t border-x border-line bg-fill/30 flex items-center justify-center">
          <Skeleton className="h-3 w-12" />
        </div>

        {/* Business class rows */}
        <div className="space-y-3">
          <Skeleton className="h-3 w-20 mx-auto" />
          {Array.from({ length: 2 }).map((_, r) => (
            <div key={r} className="flex justify-center gap-6">
              <div className="flex gap-2">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </div>
          ))}
        </div>

        {/* Aisle separator */}
        <div className="border-t border-line my-4" />

        {/* Economy class rows */}
        <div className="space-y-3">
          <Skeleton className="h-3 w-20 mx-auto" />
          {Array.from({ length: 4 }).map((_, r) => (
            <div key={r} className="flex justify-center gap-6">
              <div className="flex gap-1.5">
                <Skeleton className="h-7 w-7 rounded-md" />
                <Skeleton className="h-7 w-7 rounded-md" />
                <Skeleton className="h-7 w-7 rounded-md" />
              </div>
              <div className="flex gap-1.5">
                <Skeleton className="h-7 w-7 rounded-md" />
                <Skeleton className="h-7 w-7 rounded-md" />
                <Skeleton className="h-7 w-7 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Skeleton for admin metrics card */
export function StatsCardSkeleton() {
  return (
    <div className="card space-y-2 p-5" aria-hidden="true">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-3.5 w-24" />
      </div>
      <Skeleton className="h-7 w-20 mt-2" />
    </div>
  );
}

/** Table skeleton for admin panels */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="card overflow-hidden" aria-hidden="true">
      <div className="border-b border-line bg-fill/20 px-6 py-3.5 flex justify-between gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-24" />
        ))}
      </div>
      <div className="divide-y divide-line">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="px-6 py-4 flex justify-between items-center gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className={`h-4 ${c === 0 ? "w-28" : "w-20"}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Full-screen or section processing overlay */
export function ProcessingModal({
  title = "Processing your reservation",
  message = "Locking seats and authorizing payment with the SkyRoute backend…",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="processing-title"
    >
      <div className="card-lg max-w-sm w-full space-y-4 p-8 text-center shadow-2xl animate-scale-in">
        <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <Icon name="spinner" className="h-8 w-8 animate-spin" />
        </div>
        <p id="processing-title" className="text-title-3 font-semibold text-ink">
          {title}
        </p>
        <p className="text-callout text-ink-2">{message}</p>
      </div>
    </div>
  );
}


export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="card-lg px-6 py-16 text-center">
      {icon && <Icon name={icon} className="mx-auto mb-5 h-10 w-10 text-ink-3" />}
      <p className="text-title-3 font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-callout text-ink-2">{description}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

const STATUS_TONES: Record<string, string> = {
  confirmed: "bg-positive-soft text-positive-ink",
  scheduled: "bg-positive-soft text-positive-ink",
  successful: "bg-positive-soft text-positive-ink",
  cancelled: "bg-danger-soft text-danger-ink",
  failed: "bg-danger-soft text-danger-ink",
  pending: "bg-warn-soft text-warn-ink",
  delayed: "bg-warn-soft text-warn-ink",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${STATUS_TONES[status] ?? "bg-fill text-ink-2"}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

/**
 * Segmented control.
 *
 * Plain buttons carrying `aria-pressed` rather than a tablist: a real tablist
 * owes the user roving arrow-key focus, and a half-built one is worse than
 * none. These are buttons that swap the view, and they behave like buttons.
 */
export function Segmented<T extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: { key: T; label: string; count?: number }[];
  value: T;
  onChange: (key: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="segmented max-w-full overflow-x-auto">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          aria-pressed={value === item.key}
          className="segment whitespace-nowrap"
        >
          {item.label}
          {item.count !== undefined && (
            <span className="ml-1.5 tabular text-ink-3">{item.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/**
 * Booking progress.
 *
 * The rail scales rather than resizing, so the fill runs on the compositor.
 * Small screens get the rail and a "step n of m" line; there is no room for
 * four labels, and shrinking them to fit would make all four unreadable
 * instead of one readable.
 */
export function StepIndicator({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  const progress = steps.length < 2 ? 1 : current / (steps.length - 1);

  return (
    <div className="no-print mb-7">
      <ol className="hidden items-center gap-2 sm:flex" aria-label="Booking progress">
        {steps.map((step, index) => {
          const state = index < current ? "done" : index === current ? "active" : "todo";
          return (
            <li key={step} className="flex flex-1 items-center gap-2 last:flex-none">
              <span
                aria-current={state === "active" ? "step" : undefined}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-caption font-bold transition-colors duration-200 ${
                  state === "todo" ? "bg-fill-strong text-ink-3" : "bg-accent text-on-accent"
                }`}
              >
                {state === "done" ? (
                  <span key="done" className="animate-check-in">
                    <Icon name="check" size={14} />
                  </span>
                ) : (
                  <span key="todo">{index + 1}</span>
                )}
              </span>
              <span
                className={`whitespace-nowrap text-footnote font-medium ${
                  state === "todo" ? "text-ink-3" : "text-ink"
                }`}
              >
                {step}
              </span>
              {index < steps.length - 1 && (
                <span aria-hidden="true" className="mx-1 h-px flex-1 bg-line-strong" />
              )}
            </li>
          );
        })}
      </ol>

      <div className="sm:hidden">
        <p className="mb-2 text-footnote font-medium text-ink">
          <span className="text-ink-3">
            Step {current + 1} of {steps.length}
          </span>{" "}
          · {steps[current]}
        </p>
      </div>

      <div
        aria-hidden="true"
        className="mt-3 h-1 w-full overflow-hidden rounded-full bg-fill-strong sm:hidden"
      >
        <div
          className="h-full w-full rounded-full bg-accent"
          style={{
            transform: `scaleX(${progress})`,
            transformOrigin: "left",
            transition: "transform 320ms cubic-bezier(0.77, 0, 0.175, 1)",
          }}
        />
      </div>
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-caption text-ink-3">{hint}</p>}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
