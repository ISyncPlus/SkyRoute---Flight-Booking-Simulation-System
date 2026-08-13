# SkyRoute — Flight Booking Simulation System

A complete flight booking simulation built with **Next.js 15**, **React 19**, **TypeScript** and
**Tailwind CSS**. It has **no database and no backend**: the entire system state — schedule, user
accounts, bookings and payments — is persisted in the browser's `localStorage`.

---

## Quick start

```bash
npm install     # install dependencies
npm run dev     # start the development server
```

Open <http://localhost:3000>.

On first load the application seeds itself: 21 days of departures across 16 airports and 34 routes,
plus two demonstration accounts.

| Role | Email | Password |
| --- | --- | --- |
| Customer | `customer@skyroute.test` | `Passw0rd` |
| Administrator | `admin@skyroute.test` | `Admin@123` |

### Other commands

```bash
npm test              # run the 193-test suite once
npm run test:watch    # re-run tests on change
npm run build         # production build
npm start             # serve the production build
npm run lint          # ESLint
```

---

## Features

**Customer**

- Flight search by route, date, cabin class and party size (adults / children / infants)
- Result sorting by price, duration, departure or arrival, and filtering by airline
- Suggested alternative dates when a search returns nothing
- Interactive, keyboard-accessible seat map per aircraft type, with window / aisle / middle / exit-row
  pricing
- "Assign seats for me" automatic allocation
- Passenger details with an age-band cross-check against the fare type
- Passport capture, required only for international routes
- Simulated payment with genuine Luhn card validation, brand detection and expiry checking
- A deliberate "simulate a declined payment" switch so the failure path can be demonstrated
- Booking confirmation with a six-character PNR and a printable e-ticket
- My Bookings, filtered by upcoming / past / cancelled
- Cancellation with an automatic sliding-scale refund calculation
- Manage Booking: retrieve any reservation with a PNR and surname, no account required

**Administrator**

- Dashboard: flights, bookings, passengers, users, gross/net revenue, cancellation rate, busiest routes
- Flight management: create, change status (scheduled / delayed / cancelled), delete
- Deletion is refused for flights carrying confirmed bookings, to prevent orphaned records
- Booking management with search by PNR, passenger name or email, and administrative cancellation
- User directory (credentials are stored hashed and are never displayed)
- Storage usage meter and a full system reset that clears data and reseeds the schedule

---

## Architecture

A four-layer client-side architecture. Each layer only talks to the one directly below it.

```
┌──────────────────────────────────────────────┐
│  Presentation      app/**/page.tsx           │  Next.js App Router pages
│                    components/*.tsx          │  React components
├──────────────────────────────────────────────┤
│  Application       lib/repository.ts         │  Use cases, authorisation,
│                                              │  transaction boundaries
├──────────────────────────────────────────────┤
│  Domain            lib/pricing.ts            │  Pure business rules:
│                    lib/seats.ts              │  fares, seat maps,
│                    lib/validation.ts         │  validation, refunds
│                    lib/auth.ts  lib/ids.ts   │
├──────────────────────────────────────────────┤
│  Persistence       lib/storage.ts            │  The ONLY module that
│                                              │  touches localStorage
└──────────────────────────────────────────────┘
```

**Why this matters.** `lib/storage.ts` is the single point of contact with the browser. Swapping
`localStorage` for a REST API and a real database means rewriting that one file and making the
repository functions asynchronous — no page and no domain rule would need to change.

### Key design decisions

| Decision | Rationale |
| --- | --- |
| Seat maps are *derived*, never stored | Availability is computed from bookings, so the two can never disagree |
| Business rules are pure functions | Fully unit-testable with no DOM, no storage and no mocking |
| Repository returns `{ ok, data }` / `{ ok, error }` | Callers branch on a result instead of wrapping everything in try/catch |
| Validation runs in the UI *and* in the repository | A user editing `localStorage` by hand cannot bypass the rules |
| Authorisation lives in the repository | Hiding a button is usability; refusing the operation is security |
| Seats re-checked at write time | Prevents two browser tabs from selling the same seat |
| Schema version stored with the data | Allows a controlled migration or reset when the model changes |

---

## Project structure

```
skyroute/
├── app/
│   ├── layout.tsx                  Root layout, provider, navigation, footer
│   ├── globals.css                 Tailwind layers and component classes
│   ├── page.tsx                    Home and flight search
│   ├── search/page.tsx             Results with sorting and filtering
│   ├── book/[flightId]/page.tsx    Four-step booking wizard
│   ├── confirmation/[pnr]/page.tsx E-ticket, printable
│   ├── bookings/page.tsx           My Bookings and cancellation
│   ├── manage/page.tsx             PNR + surname lookup
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── admin/page.tsx              Administrator console (5 tabs)
├── components/
│   ├── AppProvider.tsx             Session context, seeding, cross-tab sync
│   ├── Navbar.tsx  ui.tsx          Navigation and shared primitives
│   ├── SearchForm.tsx  FlightCard.tsx
│   ├── SeatMap.tsx                 Accessible interactive seat map
│   ├── PassengerForm.tsx  PaymentForm.tsx
│   └── FareSummary.tsx  ItineraryCard.tsx
├── lib/
│   ├── types.ts                    Domain model
│   ├── storage.ts                  localStorage adapter (the only one)
│   ├── repository.ts               Use cases and authorisation
│   ├── pricing.ts                  Fare engine and refund policy
│   ├── seats.ts                    Seat map generation and conflict checks
│   ├── validation.ts               All validation rules, incl. Luhn
│   ├── auth.ts                     Salted, iterated password hashing
│   ├── ids.ts                      PNR and identifier generation
│   ├── seed.ts                     Airports, routes, aircraft, schedule
│   └── format.ts                   Date, time and currency presentation
└── tests/                          193 Vitest tests
```

---

## The fare engine

Price per passenger:

```
baseFare
  × advancePurchaseFactor(daysToDeparture)   0.90 → 1.50
  × demandFactor(cabinLoadFactor)            1.00 → 1.35
  × passengerTypeFactor                      adult 1.0 · child 0.75 · infant 0.10
  × cabinFactor                              economy 1.0 · business 2.6 · first 4.2
```

Booking total = Σ passenger fares + seat selection fees + 7.5% VAT + NGN 2,500 service charge.

**Refund on cancellation** (the service charge is never refunded):

| Time before departure | Refund |
| --- | --- |
| 7 days or more | 90% |
| 3 to 7 days | 70% |
| 24 to 72 hours | 50% |
| Under 24 hours | 0% |

---

## Testing

193 tests across five suites, run with Vitest in a jsdom environment.

| Suite | Tests | Covers |
| --- | ---: | --- |
| `pricing.test.ts` | 30 | Fare factors, itemisation, VAT, refund policy |
| `seats.test.ts` | 23 | Seat map generation, occupancy, conflict detection |
| `validation.test.ts` | 73 | Email, phone, password, age bands, Luhn, expiry, PNR |
| `auth.test.ts` | 21 | Salting, hashing, constant-time comparison |
| `repository.test.ts` | 46 | Register, sign in, search, book, cancel, authorisation |

```bash
npm test
```

Notable cases: double-booking a seat is refused; a declined payment writes nothing; a customer cannot
cancel another customer's booking; a customer cannot create a flight; a flight with confirmed
bookings cannot be deleted; corrupted `localStorage` degrades safely instead of crashing.

---

## Limitations

This is an academic simulation, and its constraints are deliberate.

- **Storage is per-browser.** Data does not sync between machines, browsers or profiles. Clearing
  browsing data erases everything.
- **Roughly a 5 MB quota.** Ample for this schedule, but not a production data store.
- **Client-side security only.** Passwords are salted and iteratively hashed, but everything the
  application knows lives on the user's machine. Real authentication requires a server; the technical
  report sets out the server-side design that would replace this.
- **No real payments.** No card data leaves the browser and nothing is charged.
- **No emails.** Confirmation messages are described in the UI but never sent.

---

## Technology

| Concern | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router) |
| UI library | React 19 |
| Language | TypeScript 5.7 (strict mode) |
| Styling | Tailwind CSS 3.4 |
| Testing | Vitest 2 + jsdom |
| Persistence | Browser `localStorage` |
| Linting | ESLint with `eslint-config-next` |

---

*Built as an academic project. No real flights, seats or payments are involved; all schedules,
airlines and fares are fictional.*
