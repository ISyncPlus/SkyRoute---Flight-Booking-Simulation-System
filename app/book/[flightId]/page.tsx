"use client";

/**
 * Booking wizard.
 * ---------------
 * Four steps: seats -> passenger details -> payment -> confirmation.
 *
 * The wizard holds its own state and only writes to storage at the final
 * step, so an abandoned booking leaves nothing behind. Seat availability is
 * re-checked inside `createBooking` at the moment of writing, which is what
 * prevents two tabs from selling the same seat.
 */

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useApp, useStored } from "@/components/AppProvider";
import { FareSummary } from "@/components/FareSummary";
import { PassengerForm } from "@/components/PassengerForm";
import { PaymentForm, type PaymentDetails } from "@/components/PaymentForm";
import { SeatMap } from "@/components/SeatMap";
import { Alert, Field, Spinner, StepIndicator } from "@/components/ui";
import { Icon } from "@/components/icons";
import { airportLabel, CABIN_NAMES, formatDate, formatTime, isInternational } from "@/lib/format";
import { calculateFare, daysUntil, formatMoney, type FareContext } from "@/lib/pricing";
import { buildSeatMap, loadFactor, seatsInCabin } from "@/lib/seats";
import {
  availableCabins,
  createBooking,
  getFlight,
  listAirports,
  listAllBookings,
} from "@/lib/repository";
import { isValidEmail, isValidPhone, validatePassenger, validatePayment } from "@/lib/validation";
import type { Airport, CabinClass, Flight, Passenger, Seat } from "@/lib/types";

const STEPS = ["Select seats", "Passenger details", "Payment", "Confirmation"];

const ACCOUNT_BENEFITS = [
  "Every trip in one place, without a reference to hand",
  "View, print or cancel a booking whenever you like",
  "Details remembered the next time you book",
];

const GUEST_BENEFITS = [
  "The same seat, cabin and fare",
  "A reference and surname manage the trip later",
  "Nothing kept beyond the booking itself",
];

function emptyPassenger(type: Passenger["type"]): Omit<Passenger, "id"> {
  return {
    title: "Mr",
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "male",
    passportNumber: "",
    type,
    seatId: null,
  };
}

function BookingWizard() {
  const params = useParams<{ flightId: string }>();
  const query = useSearchParams();
  const router = useRouter();
  const { ready, user, revision } = useApp();

  const flightId = decodeURIComponent(params.flightId ?? "");
  const adults = Math.max(1, Number(query.get("adults") ?? 1) || 1);
  const children = Math.max(0, Number(query.get("children") ?? 0) || 0);
  const infants = Math.max(0, Number(query.get("infants") ?? 0) || 0);
  const requestedCabin = (query.get("cabin") ?? "economy") as CabinClass;

  const [step, setStep] = useState(0);
  /** Set when a signed-out visitor chooses to book without an account. */
  const [asGuest, setAsGuest] = useState(false);
  /** Which way the wizard is travelling, so the step can enter from that side. */
  const [goingBack, setGoingBack] = useState(false);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [passengers, setPassengers] = useState<Omit<Passenger, "id">[]>(() => [
    ...Array.from({ length: adults }, () => emptyPassenger("adult")),
    ...Array.from({ length: children }, () => emptyPassenger("child")),
    ...Array.from({ length: infants }, () => emptyPassenger("infant")),
  ]);
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [payment, setPayment] = useState<PaymentDetails>({
    method: "card",
    cardHolder: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
    simulateFailure: false,
  });

  const [passengerErrors, setPassengerErrors] = useState<Record<number, Record<string, string>>>({});
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
  const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const flight = useStored(() => getFlight(flightId), undefined as Flight | undefined, [flightId]);
  const airports = useStored(listAirports, [] as Airport[]);
  const origin = airports.find((airport) => airport.code === flight?.originCode);
  const destination = airports.find((airport) => airport.code === flight?.destinationCode);

  const cabin: CabinClass = useMemo(() => {
    if (!flight) return "economy";
    return availableCabins(flight).includes(requestedCabin) ? requestedCabin : "economy";
  }, [flight, requestedCabin]);

  const seatsNeeded = adults + children;
  const requirePassport = isInternational(origin, destination);

  // Prefill contact details from the signed-in account.
  useEffect(() => {
    if (user) {
      setContactEmail((current) => current || user.email);
      setPayment((current) => ({ ...current, cardHolder: current.cardHolder || user.fullName }));
    }
  }, [user]);

  // Recompute the seat map whenever storage changes (including from another tab).
  useEffect(() => {
    if (!ready || !flight) return;
    setSeats(buildSeatMap(flight, listAllBookings()));
  }, [ready, flight, revision]);

  const fare = useMemo(() => {
    if (!flight) return null;
    const context: FareContext = {
      baseFare: flight.baseFare,
      cabin,
      daysToDeparture: daysUntil(flight.departureTime),
      load: loadFactor(seats, cabin),
    };
    const withSeats = passengers.map((passenger, index) => ({
      type: passenger.type,
      seatId: passenger.type === "infant" ? null : (selectedSeats[seatIndexFor(index)] ?? null),
    }));
    return calculateFare(context, withSeats, seats);

    /** Map a passenger index to its position in the seat-selection array. */
    function seatIndexFor(passengerIndex: number): number {
      return passengers.slice(0, passengerIndex).filter((p) => p.type !== "infant").length;
    }
  }, [flight, cabin, seats, passengers, selectedSeats]);

  function toggleSeat(seatId: string) {
    setSelectedSeats((current) => {
      if (current.includes(seatId)) return current.filter((id) => id !== seatId);
      if (current.length >= seatsNeeded) return current;
      return [...current, seatId];
    });
  }

  /** Assign the first available seats automatically, keeping the party together. */
  function autoAssignSeats() {
    const available = seatsInCabin(seats, cabin).filter((seat) => seat.status === "available");
    setSelectedSeats(available.slice(0, seatsNeeded).map((seat) => seat.id));
  }

  function validatePassengerStep(): boolean {
    if (!flight) return false;
    const errors: Record<number, Record<string, string>> = {};

    passengers.forEach((passenger, index) => {
      const result = validatePassenger(passenger, flight.departureTime, requirePassport);
      if (!result.valid) errors[index] = result.errors;
    });

    const contact: Record<string, string> = {};
    if (!contactEmail.trim()) contact.email = "A contact email address is required.";
    else if (!isValidEmail(contactEmail)) contact.email = "Enter a valid email address.";
    if (!contactPhone.trim()) contact.phone = "A contact phone number is required.";
    else if (!isValidPhone(contactPhone)) contact.phone = "Enter a valid Nigerian phone number.";

    setPassengerErrors(errors);
    setContactErrors(contact);
    return Object.keys(errors).length === 0 && Object.keys(contact).length === 0;
  }

  function goToStep(next: number) {
    setSubmitError(null);
    if (next > 0 && selectedSeats.length !== seatsNeeded) {
      setSubmitError(`Please select ${seatsNeeded} seat${seatsNeeded === 1 ? "" : "s"} before continuing.`);
      return;
    }
    if (next > 1 && !validatePassengerStep()) {
      setSubmitError("Please correct the highlighted passenger details.");
      return;
    }
    setGoingBack(next < step);
    setStep(next);
    // No explicit behaviour: the CSS `scroll-behavior` decides, which means it
    // is smooth normally and instant under prefers-reduced-motion.
    window.scrollTo({ top: 0 });
  }

  function handleConfirm() {
    if (!flight) return;

    const paymentCheck = validatePayment(payment);
    setPaymentErrors(paymentCheck.errors);
    if (!paymentCheck.valid) {
      setSubmitError("Please correct the highlighted payment details.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    // Attach the chosen seats to the fare-paying passengers, in order.
    let seatCursor = 0;
    const withSeats = passengers.map((passenger) => {
      if (passenger.type === "infant") return { ...passenger, seatId: null };
      const seatId = selectedSeats[seatCursor] ?? null;
      seatCursor += 1;
      return { ...passenger, seatId };
    });

    const result = createBooking({
      flightId: flight.id,
      cabin,
      // No account behind the booking when it was made as a guest; it will be
      // reachable only by its reference and surname.
      userId: user?.id ?? null,
      contactEmail,
      contactPhone,
      passengers: withSeats,
      payment: {
        method: payment.method,
        cardHolder: payment.cardHolder,
        cardNumber: payment.cardNumber,
        forceFailure: payment.simulateFailure,
      },
    });

    setSubmitting(false);

    if (!result.ok) {
      setSubmitError(result.error);
      // A seat clash means the map is stale - refresh it so the user can reselect.
      if (result.error.includes("no longer available")) {
        setSeats(buildSeatMap(flight, listAllBookings()));
        setSelectedSeats([]);
        setGoingBack(true);
        setStep(0);
      }
      return;
    }

    router.push(`/confirmation/${result.data.pnr}`);
  }

  if (!ready) {
    return (
      <div className="container-page">
        <Spinner label="Loading flight" />
      </div>
    );
  }

  if (!flight || !fare) {
    return (
      <div className="container-page max-w-xl">
        <Alert tone="error" title="Flight not found">
          This flight is no longer in the schedule. It may have departed or been removed by an
          administrator.
        </Alert>
        <Link href="/" className="btn-primary mt-5">
          Start a new search
        </Link>
      </div>
    );
  }

  if (!user && !asGuest) {
    return (
      <div className="container-page max-w-4xl">
        {/* The flight is restated first and in full. This screen interrupts a
            purchase, so it has to prove it still knows what was being bought
            before it asks anything. */}
        <div className="card-lg">
          <p className="overline text-ink-3">Your selection</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="text-title-2 font-semibold text-ink">{origin?.code}</span>
            <Icon name="arrowRight" className="h-5 w-5 text-accent" />
            <span className="text-title-2 font-semibold text-ink">{destination?.code}</span>
            <span className="badge bg-fill text-ink-2">
              {flight.airline} {flight.flightNumber}
            </span>
            <span className="badge bg-accent-soft text-accent-ink">{CABIN_NAMES[cabin]}</span>
          </div>
          <p className="mt-2.5 flex flex-wrap items-center gap-1.5 text-footnote text-ink-2">
            <Icon name="planeTakeoff" className="h-4 w-4 text-ink-3" />
            {formatDate(flight.departureTime)}
            <span className="text-ink-3">·</span>
            {airportLabel(origin)} to {airportLabel(destination)}
          </p>
        </div>

        <h1 className="mt-10 text-title-1 font-semibold text-ink">How would you like to book?</h1>
        <p className="mt-2 max-w-xl text-callout text-ink-2">
          Both routes book the same seat at the same fare. The only difference is how you get back
          to the trip afterwards.
        </p>

        <div className="mt-6 grid items-start gap-5 md:grid-cols-2">
          {/* Recommended path. Carries the accent, the badge and the filled
              button — three signals pointing the same way, so the eye lands
              here first without the other card being made to look broken. */}
          <div className="card-lg relative border-accent/35 shadow-e2">
            <span className="badge absolute right-6 top-6 gap-1.5 bg-accent-soft text-accent-ink">
              <Icon name="sparkles" className="h-3.5 w-3.5" />
              Recommended
            </span>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent-ink">
              <Icon name="user" className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-title-3 font-semibold text-ink">With an account</h2>
            <p className="mt-1.5 text-footnote text-ink-2">
              One form now, and the trip is yours to manage from anywhere.
            </p>
            <ul className="mt-5 space-y-2.5">
              {ACCOUNT_BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2.5 text-footnote text-ink-2">
                  <Icon name="checkCircle" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  {benefit}
                </li>
              ))}
            </ul>
            <Link href="/register" className="btn-primary mt-6 w-full justify-center text-center">
              Get started
              <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
          </div>

          {/* Offered without hesitation or friction — but told plainly, since a
              guest's reference really is the only way back to the booking. */}
          <div className="card-lg">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-fill text-ink-2">
              <Icon name="ticket" className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-title-3 font-semibold text-ink">As a guest</h2>
            <p className="mt-1.5 text-footnote text-ink-2">
              Straight to seat selection. Nothing to set up.
            </p>
            <ul className="mt-5 space-y-2.5">
              {GUEST_BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2.5 text-footnote text-ink-2">
                  <Icon name="checkCircle" className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
                  {benefit}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setAsGuest(true)}
              className="btn-secondary mt-6 w-full justify-center text-center"
            >
              Continue as a guest
              <Icon name="arrowRight" className="h-4 w-4" />
            </button>
          </div>
        </div>

        <p className="mt-6 flex items-start gap-2 text-caption text-ink-3">
          <Icon name="infoCircle" className="mt-0.5 h-4 w-4 shrink-0" />
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-accent-ink hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  const availableInCabin = seatsInCabin(seats, cabin).filter((seat) => seat.status === "available").length;

  return (
    <div className="container-page">
      <nav
        aria-label="Breadcrumb"
        className="mb-4 flex items-center gap-1.5 text-caption text-ink-3"
      >
        <Link href="/" className="hover:text-ink hover:underline">
          Search
        </Link>
        <Icon name="chevronRight" className="h-3.5 w-3.5" />
        <button type="button" onClick={() => router.back()} className="hover:text-ink hover:underline">
          Results
        </button>
        <Icon name="chevronRight" className="h-3.5 w-3.5" />
        <span className="font-medium text-ink-2">Book</span>
      </nav>

      <h1 className="flex flex-wrap items-center gap-2.5 text-title-2 sm:text-title-1 font-semibold text-ink">
        {airportLabel(origin)}
        <Icon name="arrowRight" className="h-5 w-5 sm:h-6 sm:w-6 text-ink-3" />
        {airportLabel(destination)}
      </h1>
      <p className="mb-7 mt-1.5 text-footnote text-ink-2">
        {flight.airline} {flight.flightNumber} · {formatDate(flight.departureTime)} ·{" "}
        {formatTime(flight.departureTime)} – {formatTime(flight.arrivalTime)} · {CABIN_NAMES[cabin]}
      </p>

      <StepIndicator steps={STEPS} current={step} />

      {submitError && (
        <div className="mb-5">
          <Alert tone="error" title="Please check the following">
            {submitError}
          </Alert>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div>
          {/* Keyed on the step so each panel is a fresh mount, and entering from
              the side the user is travelling towards. */}
          <div
            key={step}
            className={goingBack ? "animate-step-back" : "animate-step-forward"}
          >
            {step === 0 && (
              <section aria-labelledby="seats-heading" className="card-lg">
                <div className="mb-5 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <h2 id="seats-heading" className="text-title-3 font-semibold text-ink">
                      Choose {seatsNeeded} seat{seatsNeeded === 1 ? "" : "s"}
                    </h2>
                    <p className="mt-1 text-footnote text-ink-2">
                      {availableInCabin} of {seatsInCabin(seats, cabin).length}{" "}
                      {CABIN_NAMES[cabin]} seats available
                      {infants > 0 &&
                        ` · ${infants} infant${infants === 1 ? "" : "s"} travelling on a lap`}
                    </p>
                  </div>
                  <button type="button" onClick={autoAssignSeats} className="btn-secondary w-full sm:w-auto text-center justify-center">
                    <Icon name="sparkles" className="h-4 w-4" />
                    Assign seats for me
                  </button>
                </div>

                <SeatMap
                  seats={seats}
                  cabin={cabin}
                  selected={selectedSeats}
                  maxSelectable={seatsNeeded}
                  onToggle={toggleSeat}
                />

                {selectedSeats.length > 0 && (
                  <p className="mt-4 text-callout text-ink-2">
                    Selected:{" "}
                    <span className="font-semibold text-ink">{selectedSeats.join(", ")}</span>
                  </p>
                )}
              </section>
            )}

            {step === 1 && (
              <section aria-labelledby="passengers-heading" className="space-y-5">
                <h2 id="passengers-heading" className="text-title-3 font-semibold text-ink">
                  Who is travelling?
                </h2>

                {passengers.map((passenger, index) => {
                  const seatIndex = passengers
                    .slice(0, index)
                    .filter((p) => p.type !== "infant").length;
                  return (
                    <PassengerForm
                      key={index}
                      index={index}
                      passenger={passenger}
                      seatId={passenger.type === "infant" ? null : (selectedSeats[seatIndex] ?? null)}
                      cabin={cabin}
                      requirePassport={requirePassport}
                      errors={passengerErrors[index] ?? {}}
                      onChange={(changes) =>
                        setPassengers((current) =>
                          current.map((item, position) =>
                            position === index ? { ...item, ...changes } : item,
                          ),
                        )
                      }
                    />
                  );
                })}

                <div className="card-lg">
                  <div className="mb-5 border-b border-line pb-4">
                    <h3 className="flex items-center gap-2 text-footnote font-semibold text-ink">
                      <Icon name="mail" className="h-4 w-4 text-ink-3" />
                      Contact details
                    </h3>
                    <p className="mt-1 text-caption text-ink-3">
                      The booking confirmation and any schedule change will be sent here.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Email address" htmlFor="contactEmail" error={contactErrors.email}>
                      <input
                        id="contactEmail"
                        type="email"
                        autoComplete="email"
                        className={`input ${contactErrors.email ? "input-error" : ""}`}
                        value={contactEmail}
                        onChange={(event) => setContactEmail(event.target.value)}
                      />
                    </Field>
                    <Field
                      label="Phone number"
                      htmlFor="contactPhone"
                      error={contactErrors.phone}
                      hint="e.g. 08031234567"
                    >
                      <input
                        id="contactPhone"
                        type="tel"
                        autoComplete="tel"
                        className={`input ${contactErrors.phone ? "input-error" : ""}`}
                        value={contactPhone}
                        onChange={(event) => setContactPhone(event.target.value)}
                      />
                    </Field>
                  </div>
                </div>
              </section>
            )}

            {step === 2 && (
              <section aria-labelledby="payment-heading" className="space-y-5">
                <h2 id="payment-heading" className="text-title-3 font-semibold text-ink">
                  Payment
                </h2>
                <PaymentForm
                  details={payment}
                  errors={paymentErrors}
                  onChange={(changes) => setPayment((current) => ({ ...current, ...changes }))}
                />

                <div className="card-lg mt-5">
                  <h3 className="text-footnote font-semibold text-ink">Review before paying</h3>
                  <ul className="mt-4 space-y-0">
                    {passengers.map((passenger, index) => {
                      const seatIndex = passengers
                        .slice(0, index)
                        .filter((p) => p.type !== "infant").length;
                      const seat =
                        passenger.type === "infant"
                          ? "Lap infant"
                          : (selectedSeats[seatIndex] ?? "—");
                      return (
                        <li
                          key={index}
                          className="flex justify-between gap-3 border-b border-line py-2.5 text-callout text-ink-2 last:border-0"
                        >
                          <span>
                            {passenger.title} {passenger.firstName} {passenger.lastName}
                            <span className="ml-2 text-caption text-ink-3">({passenger.type})</span>
                          </span>
                          <span className="font-mono font-semibold text-ink">{seat}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-4 text-footnote text-ink-2">
                    Confirmation will be sent to{" "}
                    <span className="font-medium text-ink">{contactEmail}</span>.
                  </p>
                  <p className="tabular mt-4 text-title-2 font-semibold text-ink">
                    Total: {formatMoney(fare.total, flight.currency)}
                  </p>
                </div>
              </section>
            )}
          </div>

          <div className="mt-7 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {step > 0 ? (
              <button type="button" onClick={() => goToStep(step - 1)} className="btn-secondary w-full sm:w-auto text-center justify-center">
                <Icon name="arrowLeft" className="h-4 w-4" />
                Back
              </button>
            ) : (
              <Link href="/" className="btn-secondary w-full sm:w-auto text-center justify-center">
                <Icon name="arrowLeft" className="h-4 w-4" />
                Change search
              </Link>
            )}

            {step < 2 ? (
              <button type="button" onClick={() => goToStep(step + 1)} className="btn-primary w-full sm:w-auto text-center justify-center">
                Continue
                <Icon name="arrowRight" className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={submitting}
                className="btn-primary w-full sm:w-auto text-center justify-center"
              >
                <Icon name={submitting ? "spinner" : "lock"} className={`h-4 w-4 ${submitting ? "animate-spin" : ""}`} />
                {submitting ? "Processing payment…" : `Pay ${formatMoney(fare.total, flight.currency)}`}
              </button>
            )}
          </div>
        </div>

        <FareSummary
          flight={flight}
          origin={origin}
          destination={destination}
          cabin={cabin}
          fare={fare}
          passengerCount={passengers.length}
        />
      </div>
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense
      fallback={
        <div className="container-page">
          <Spinner label="Loading booking" />
        </div>
      }
    >
      <BookingWizard />
    </Suspense>
  );
}
