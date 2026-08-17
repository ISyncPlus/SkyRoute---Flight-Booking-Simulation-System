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
    <div className="flex items-center justify-center gap-3 py-20 text-callout text-ink-2" role="status">
      <Icon name="spinner" className="h-5 w-5 animate-spin text-accent" />
      {label}
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
    <div role="group" aria-label={label} className="segmented">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          aria-pressed={value === item.key}
          className="segment"
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
