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
import { Alert, ButtonSpinner, Field, ProcessingModal, SeatMapSkeleton, Spinner, StepIndicator } from "@/components/ui";

import { Icon } from "@/components/icons";
import { airportLabel, CABIN_NAMES, formatDate, formatTime, isInternational } from "@/lib/format";
import { calculateFare, combineFares, daysUntil, formatMoney, type FareContext } from "@/lib/pricing";
import { buildSeatMap, loadFactor, randomlyAssignSeats, seatsInCabin } from "@/lib/seats";

import { api } from "@/lib/api";
import {
  availableCabins,
  createBooking,
  getFlight,
  listAirports,
  listAllBookings,
} from "@/lib/repository";
import { isValidEmail, isValidPhone, validatePassenger, validatePayment } from "@/lib/validation";
import type { Airport, CabinClass, Flight, Passenger, Seat, TripType } from "@/lib/types";


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

  /* The route segment carries every flight of the journey, comma separated:
     `/book/LOS-ABV-1` for one way, `/book/LOS-ABV-1,ABV-LOS-9` for a return.
     A single id is just the one-element case, so old links keep working. */
  const flightIds = useMemo(
    () =>
      decodeURIComponent(params.flightId ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    [params.flightId],
  );
  const flightId = flightIds[0] ?? "";
  const adults = Math.max(1, Number(query.get("adults") ?? 1) || 1);
  const children = Math.max(0, Number(query.get("children") ?? 0) || 0);
  const infants = Math.max(0, Number(query.get("infants") ?? 0) || 0);
  const requestedCabin = (query.get("cabin") ?? "economy") as CabinClass;

  const [step, setStep] = useState(0);
  /** Set when a signed-out visitor chooses to book without an account. */
  const [asGuest, setAsGuest] = useState(false);
  /** Which way the wizard is travelling, so the step can enter from that side. */
  const [goingBack, setGoingBack] = useState(false);
  /** Seat map and chosen seats per leg, index-aligned with `flights`. */
  const [seatsByLeg, setSeatsByLeg] = useState<Seat[][]>([]);
  const [selectedByLeg, setSelectedByLeg] = useState<string[][]>([]);
  /** Which leg's cabin the seat step is currently showing. */
  const [activeLeg, setActiveLeg] = useState(0);
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

  /** Every flight of the journey. Undefined entries are dropped. */
  const flights = useStored(
    () => flightIds.map((id) => getFlight(id)).filter((entry): entry is Flight => Boolean(entry)),
    [] as Flight[],
    [flightIds.join(",")],
  );
  const flight = flights[0];
  const multiLeg = flights.length > 1;

  const airports = useStored(listAirports, [] as Airport[]);
  const origin = airports.find((airport) => airport.code === flight?.originCode);
  const destination = airports.find((airport) => airport.code === flight?.destinationCode);

  /* The cabin of whichever leg the seat step is showing — not of the first
     flight. The aircraft can differ between the outbound and the return, so a
     cabin fitted on one is not guaranteed on the other. */
  const cabin: CabinClass = useMemo(() => {
    const shown = flights[activeLeg] ?? flights[0];
    if (!shown) return "economy";
    return availableCabins(shown).includes(requestedCabin) ? requestedCabin : "economy";
  }, [flights, activeLeg, requestedCabin]);

  const seatsNeeded = adults + children;
  const requirePassport = isInternational(origin, destination);

  /* The search says what kind of journey this is; the number of flights is the
     fallback when a link arrives without it. */
  const tripType: TripType =
    (query.get("trip") as TripType | null) ?? (flights.length > 1 ? "multi-city" : "one-way");

  // Prefill contact details from the signed-in account.
  useEffect(() => {
    if (user) {
      setContactEmail((current) => current || user.email);
      setPayment((current) => ({ ...current, cardHolder: current.cardHolder || user.fullName }));
    }
  }, [user]);

  const [seatsLoading, setSeatsLoading] = useState(true);

  // Load live seat maps from backend API (falling back to buildSeatMap)
  useEffect(() => {
    if (!ready || flights.length === 0) return;
    let cancelled = false;

    async function loadSeats() {
      setSeatsLoading(true);
      try {
        const maps = await Promise.all(
          flights.map(async (entry) => {
            const res = await api.flights.getSeats(entry.id);
            if (res.ok && res.data.seats) return res.data.seats;
            return buildSeatMap(entry, listAllBookings());
          }),
        );
        if (!cancelled) {
          setSeatsByLeg(maps);
          setSelectedByLeg((current) => flights.map((_, index) => current[index] ?? []));
          setSeatsLoading(false);
        }
      } catch {
        if (!cancelled) {
          const all = listAllBookings();
          setSeatsByLeg(flights.map((entry) => buildSeatMap(entry, all)));
          setSelectedByLeg((current) => flights.map((_, index) => current[index] ?? []));
          setSeatsLoading(false);
        }
      }
    }

    void loadSeats();
    return () => {
      cancelled = true;
    };
  }, [ready, flights, revision]);


  const seats = seatsByLeg[activeLeg] ?? [];
  const selectedSeats = selectedByLeg[activeLeg] ?? [];
  /** Every leg has its seats chosen, which is what gates leaving this step. */
  const allLegsSeated =
    flights.length > 0 &&
    flights.every((_, index) => (selectedByLeg[index] ?? []).length === seatsNeeded);

  /** Map a passenger index to its position in a leg's seat-selection array. */
  function seatIndexFor(passengerIndex: number): number {
    return passengers.slice(0, passengerIndex).filter((p) => p.type !== "infant").length;
  }

  const fare = useMemo(() => {
    if (flights.length === 0) return null;

    // Each leg is quoted against its own demand and days-to-departure, then
    // combined so the booking fee is charged once rather than per flight.
    const perLeg = flights.map((entry, legIndex) => {
      const legSeats = seatsByLeg[legIndex] ?? [];
      const legCabin = availableCabins(entry).includes(requestedCabin) ? requestedCabin : "economy";
      const chosen = selectedByLeg[legIndex] ?? [];

      const context: FareContext = {
        baseFare: entry.baseFare,
        cabin: legCabin,
        daysToDeparture: daysUntil(entry.departureTime),
        load: loadFactor(legSeats, legCabin),
      };
      const withSeats = passengers.map((passenger, index) => ({
        type: passenger.type,
        seatId: passenger.type === "infant" ? null : (chosen[seatIndexFor(index)] ?? null),
      }));
      return calculateFare(context, withSeats, legSeats);
    });

    return combineFares(perLeg);
  }, [flights, seatsByLeg, passengers, selectedByLeg, requestedCabin]);

  /** Replace one leg's selection, leaving every other leg untouched. */
  function setLegSeats(legIndex: number, next: (current: string[]) => string[]) {
    setSelectedByLeg((current) => {
      const copy = flights.map((_, index) => current[index] ?? []);
      copy[legIndex] = next(copy[legIndex]);
      return copy;
    });
  }

  function toggleSeat(seatId: string) {
    setLegSeats(activeLeg, (current) => {
      if (current.includes(seatId)) return current.filter((id) => id !== seatId);
      if (current.length >= seatsNeeded) return current;
      return [...current, seatId];
    });
  }

  /** Assign available seats randomly and smartly, keeping parties together in the same row. */
  /** Fills every leg at once — nobody wants to press this per flight. */
  function autoAssignSeats() {
    setSelectedByLeg(
      flights.map((entry, legIndex) => {
        const legCabin = availableCabins(entry).includes(requestedCabin) ? requestedCabin : "economy";
        return randomlyAssignSeats(seatsByLeg[legIndex] ?? [], legCabin, seatsNeeded);
      }),
    );
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
    if (next > 0 && !allLegsSeated) {
      // Name the flight that is short, so a return trip does not just say
      // "select seats" while the leg you already did looks complete.
      const shortLeg = flights.findIndex(
        (_, index) => (selectedByLeg[index] ?? []).length !== seatsNeeded,
      );
      const which = multiLeg && shortLeg >= 0 ? ` for flight ${shortLeg + 1}` : "";
      setSubmitError(
        `Please select ${seatsNeeded} seat${seatsNeeded === 1 ? "" : "s"}${which} before continuing.`,
      );
      if (shortLeg >= 0) setActiveLeg(shortLeg);
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

  async function handleConfirm() {
    if (!flight) return;

    const paymentCheck = validatePayment(payment);
    setPaymentErrors(paymentCheck.errors);
    if (!paymentCheck.valid) {
      setSubmitError("Please correct the highlighted payment details.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    /* One leg per flight, each carrying its own seats positionally aligned
       with `passengers` — an infant never takes one. */
    const legs = flights.map((entry, legIndex) => {
      const chosen = selectedByLeg[legIndex] ?? [];
      let seatCursor = 0;
      return {
        flightId: entry.id,
        cabin: availableCabins(entry).includes(requestedCabin) ? requestedCabin : ("economy" as CabinClass),
        seatIds: passengers.map((passenger) => {
          if (passenger.type === "infant") return null;
          const seatId = chosen[seatCursor] ?? null;
          seatCursor += 1;
          return seatId;
        }),
      };
    });

    // Kept for the passenger records themselves; seats live on the legs.
    const withSeats = passengers.map((passenger) => ({ ...passenger, seatId: null }));

    try {
      const apiRes = await api.bookings.create({
        legs,
        tripType,
        passengers: withSeats,
        contactEmail,
        contactPhone,
        payment: {
          method: payment.method,
          cardHolder: payment.cardHolder || user?.fullName || contactEmail,
          cardNumber: payment.cardNumber,
          expiry: payment.expiry,
          cvv: payment.cvv,
          senderName: payment.senderName,
          forceFailure: payment.simulateFailure,
        },
      });

      if (apiRes.ok && apiRes.data.booking) {
        setSubmitting(false);
        router.push(`/confirmation/${apiRes.data.booking.pnr}`);
        return;
      }

      if (!apiRes.ok) {
        setSubmitting(false);
        setSubmitError(apiRes.error);
        if (apiRes.error.toLowerCase().includes("no longer available") || apiRes.status === 409) {
          const maps = await Promise.all(
            flights.map(async (f) => {
              const res = await api.flights.getSeats(f.id);
              return res.ok ? res.data.seats : buildSeatMap(f, listAllBookings());
            }),
          );
          setSeatsByLeg(maps);
          setSelectedByLeg(flights.map(() => []));
          setActiveLeg(0);
          setGoingBack(true);
          setStep(0);
        }
        return;
      }
    } catch {
      // Fallback
    }

    const result = createBooking({
      legs,
      tripType,
      userId: user?.id ?? null,
      contactEmail,
      contactPhone,
      passengers: withSeats,
      payment: {
        method: payment.method,
        cardHolder: payment.cardHolder || user?.fullName || contactEmail,
        cardNumber: payment.cardNumber,
        senderName: payment.senderName,
        forceFailure: payment.simulateFailure,
      },
    });

    setSubmitting(false);

    if (!result.ok) {
      setSubmitError(result.error);
      if (result.error.includes("no longer available")) {
        const all = listAllBookings();
        setSeatsByLeg(flights.map((entry) => buildSeatMap(entry, all)));
        setSelectedByLeg(flights.map(() => []));
        setActiveLeg(0);
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

        <div className="mt-6 grid items-stretch gap-5 md:grid-cols-2">
          {/* Recommended path. Carries the accent, the badge and the filled
              button — three signals pointing the same way, so the eye lands
              here first without the other card being made to look broken. */}
          <div className="card-lg relative flex h-full flex-col justify-between border-accent/35 shadow-e2">
            <div>
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
            </div>
            <Link href="/register" className="btn-primary mt-6 w-full justify-center text-center">
              Get started
              <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
          </div>

          {/* Offered without hesitation or friction — but told plainly, since a
              guest's reference really is the only way back to the booking. */}
          <div className="card-lg flex h-full flex-col justify-between">
            <div>
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
            </div>
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
                {/* One cabin is shown at a time. The tick is what tells you a
                    leg is already done, so a return trip cannot be left half
                    seated without it being obvious which half. */}
                {multiLeg && (
                  <div
                    role="tablist"
                    aria-label="Flight to seat"
                    className="segmented mb-5 flex max-w-full overflow-x-auto"
                  >
                    {flights.map((entry, index) => {
                      const done = (selectedByLeg[index] ?? []).length === seatsNeeded;
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          role="tab"
                          aria-selected={activeLeg === index}
                          aria-pressed={activeLeg === index}
                          onClick={() => setActiveLeg(index)}
                          className="segment flex items-center gap-1.5 whitespace-nowrap"
                        >
                          {done && <Icon name="check" className="h-3.5 w-3.5 text-positive" />}
                          {entry.originCode} → {entry.destinationCode}
                        </button>
                      );
                    })}
                  </div>
                )}

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

                {seatsLoading && seats.length === 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-footnote text-ink-2">
                      <ButtonSpinner className="text-accent" />
                      <span>Loading interactive cabin seat map…</span>
                    </div>
                    <SeatMapSkeleton />
                  </div>
                ) : (
                  <>
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
                  </>
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
                  totalAmount={fare.total}
                  currency={flight.currency}
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
                <Icon
                  name={
                    submitting
                      ? "spinner"
                      : payment.method === "transfer"
                      ? "building"
                      : payment.method === "wallet"
                      ? "banknote"
                      : "lock"
                  }
                  className={`h-4 w-4 ${submitting ? "animate-spin" : ""}`}
                />
                {submitting
                  ? payment.method === "transfer"
                    ? "Confirming bank transfer…"
                    : payment.method === "wallet"
                    ? "Debiting wallet balance…"
                    : "Authorizing payment…"
                  : payment.method === "transfer"
                  ? `Confirm Bank Transfer · ${formatMoney(fare.total, flight.currency)}`
                  : payment.method === "wallet"
                  ? `Pay from Wallet · ${formatMoney(fare.total, flight.currency)}`
                  : `Pay with Card · ${formatMoney(fare.total, flight.currency)}`}
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

      {submitting && (
        <ProcessingModal
          title="Securing your reservation"
          message="Allocating seats and authorizing payment with the SkyRoute backend…"
        />
      )}
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
