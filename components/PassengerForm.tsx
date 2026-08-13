"use client";

import { Field } from "./ui";
import { CABIN_NAMES } from "@/lib/format";
import type { CabinClass, Passenger, PassengerType } from "@/lib/types";

const TITLES: Passenger["title"][] = ["Mr", "Mrs", "Miss", "Ms", "Dr"];

const TYPE_LABELS: Record<PassengerType, string> = {
  adult: "Adult (12+)",
  child: "Child (2–11)",
  infant: "Infant (under 2)",
};

export function PassengerForm({
  index,
  passenger,
  seatId,
  cabin,
  requirePassport,
  errors,
  onChange,
}: {
  index: number;
  passenger: Omit<Passenger, "id">;
  seatId: string | null;
  cabin: CabinClass;
  requirePassport: boolean;
  errors: Record<string, string>;
  onChange: (changes: Partial<Omit<Passenger, "id">>) => void;
}) {
  const prefix = `pax-${index}`;

  return (
    <fieldset className="card-lg">
      <legend className="flex flex-wrap items-center gap-2 px-1 text-footnote font-semibold text-ink">
        Passenger {index + 1}
        <span className="badge bg-fill text-ink-2">{TYPE_LABELS[passenger.type]}</span>
        {passenger.type === "infant" ? (
          <span className="badge bg-fill text-ink-3">On an adult&apos;s lap</span>
        ) : seatId ? (
          <span className="badge bg-accent-soft text-accent-ink">
            Seat {seatId} · {CABIN_NAMES[cabin]}
          </span>
        ) : null}
      </legend>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Title" htmlFor={`${prefix}-title`}>
          <select
            id={`${prefix}-title`}
            className="input"
            value={passenger.title}
            onChange={(event) => onChange({ title: event.target.value as Passenger["title"] })}
          >
            {TITLES.map((title) => (
              <option key={title} value={title}>
                {title}
              </option>
            ))}
          </select>
        </Field>

        <Field label="First name" htmlFor={`${prefix}-first`} error={errors.firstName}>
          <input
            id={`${prefix}-first`}
            type="text"
            autoComplete="given-name"
            className={`input ${errors.firstName ? "input-error" : ""}`}
            value={passenger.firstName}
            onChange={(event) => onChange({ firstName: event.target.value })}
          />
        </Field>

        <Field label="Surname" htmlFor={`${prefix}-last`} error={errors.lastName}>
          <input
            id={`${prefix}-last`}
            type="text"
            autoComplete="family-name"
            className={`input ${errors.lastName ? "input-error" : ""}`}
            value={passenger.lastName}
            onChange={(event) => onChange({ lastName: event.target.value })}
          />
        </Field>

        <Field
          label="Date of birth"
          htmlFor={`${prefix}-dob`}
          error={errors.dateOfBirth}
          hint="Must match the fare type"
        >
          <input
            id={`${prefix}-dob`}
            type="date"
            className={`input ${errors.dateOfBirth ? "input-error" : ""}`}
            value={passenger.dateOfBirth}
            onChange={(event) => onChange({ dateOfBirth: event.target.value })}
          />
        </Field>

        <Field label="Gender" htmlFor={`${prefix}-gender`}>
          <select
            id={`${prefix}-gender`}
            className="input"
            value={passenger.gender}
            onChange={(event) => onChange({ gender: event.target.value as Passenger["gender"] })}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </Field>

        {requirePassport && (
          <Field
            label="Passport number"
            htmlFor={`${prefix}-passport`}
            error={errors.passportNumber}
            hint="Required for international travel"
          >
            <input
              id={`${prefix}-passport`}
              type="text"
              className={`input uppercase ${errors.passportNumber ? "input-error" : ""}`}
              value={passenger.passportNumber}
              onChange={(event) => onChange({ passportNumber: event.target.value.toUpperCase() })}
            />
          </Field>
        )}
      </div>
    </fieldset>
  );
}
