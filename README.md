# SkyRoute — Flight Booking System

A modern, full-featured flight booking system built with **Next.js 15**, **React 19**, **TypeScript** and **Tailwind CSS**, backed by a hosted **Express + Prisma** API. Schedules, user accounts, reservations, and seat mappings live server-side and are reached through `lib/api.ts`; the browser's `localStorage` remains as a session and offline cache so the app degrades gracefully when the backend is unreachable.

The API base URL is configured with `NEXT_PUBLIC_API_URL` (default `https://skyroute-server.onrender.com/api`). Browser requests go to the same-origin `/api/*` path, which is proxied to the backend by [app/api/[...path]/route.ts](app/api/[...path]/route.ts) and the rewrite in [next.config.mjs](next.config.mjs).

---

## Quick Start

```bash
npm install     # install dependencies
npm run dev     # start the development server
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

On first load, the application seeds an operational schedule with **21 days of departures across 16 international hubs and 34 routes**, complete with pre-configured demonstration accounts:

| Role | Email | Password | Access Level |
| --- | --- | --- | --- |
| **Customer** | `customer@skyroute.test` | `Passw0rd` | Flight search, booking, seat selection, itinerary management |
| **Administrator** | `admin@skyroute.test` | `Admin@123` | Flight dispatch console, route management, passenger manifests |

### Key Commands

```bash
npm test              # run the 193-test Vitest test suite
npm run test:watch    # re-run tests on change
npm run build         # compile production Next.js bundle
npm start             # start the production server
npm run lint          # run ESLint checks
```

---

## Features & Modules

### Customer Journey
- **Real-Time Schedule Search**: Filter by route (origin/destination), departure date, cabin tier, and passenger party (Adults / Children / Infants).
- **Interactive Seat Map**: Aircraft-specific cabin layouts (Boeing 787-9, Airbus A330-300, Boeing 737-800, Embraer E175) with live seat selection, exit-row premiums, window/aisle categorization, and "Assign seats for me" automation.
- **Dynamic Yield Fare Engine**: Real-time fare calculation driven by advance purchase curves, cabin load factor surge pricing, passenger type multipliers, and cabin class upgrades.
- **Interactive Yield Calculator**: Explore how advance booking windows and seat occupancy dynamically adjust airfare quotes in real time.
- **Cabin Class Suites**: Visual specs and privileges for First Class Private Suites, Business Class Direct-Aisle Pods, and Economy Comfort.
- **Fleet Specifications**: Detailed technical data (range, cruise speed, seat configurations) across 4 commercial aircraft families.
- **Passenger Validation**: Client-side validation with age-band cross-checking, international passport capture, and payment card Luhn algorithm verification.
- **Booking Management & Refunds**: Manage reservations via 6-character PNR or customer profile, view e-tickets, and cancel flights with sliding-scale refund calculation.

### Administrator Console
- **Operational Dashboard**: Live metrics for active flights, passenger counts, gross/net revenue, cancellation rates, and busiest routes.
- **Flight Operations**: Create new flights, adjust departure/arrival timings, update base pricing, and set status flags (Scheduled / Delayed / Cancelled).
- **Integrity Constraints**: Prevents deletion of flights with confirmed passenger bookings to avoid orphaned records.
- **Global Manifests**: Search all passenger bookings by PNR, customer name, or email with administrative cancellation capabilities.
- **Local Cache & Reset**: Monitor the browser cache's utilization and clear it, reseeding the local schedule without touching server data.

---

## Architecture

SkyRoute follows a strict four-layer architecture. Each layer communicates only with the layer directly beneath it:

```
┌──────────────────────────────────────────────┐
│  Presentation      app/**/page.tsx           │  Next.js 15 App Router pages &
│                    components/*.tsx          │  React 19 interactive components
├──────────────────────────────────────────────┤
│  Application       lib/repository.ts         │  Use cases, authorization,
│                                              │  transaction boundaries
├──────────────────────────────────────────────┤
│  Domain            lib/pricing.ts            │  Pure business logic:
│                    lib/seats.ts              │  dynamic yield, seat maps,
│                    lib/validation.ts         │  validation, cancellation refunds
│                    lib/auth.ts  lib/ids.ts   │
├──────────────────────────────────────────────┤
│  Persistence       lib/storage.ts            │  Isolated localStorage adapter
└──────────────────────────────────────────────┘
```

### Architectural Principles
- **Derived Seat Maps**: Seat maps and availability are derived dynamically from confirmed reservations, guaranteeing 100% consistency across concurrent browser tabs.
- **Pure Domain Logic**: Core pricing, validation, and seat allocation rules are pure functions, completely decoupling business logic from UI and persistence.
- **Strong Isolation**: `lib/storage.ts` is the single point of contact with the browser storage layer, allowing seamless migration to REST APIs or databases without altering UI pages or domain logic.
- **Dual-Layer Validation**: Validation rules execute in both the UI and the repository layer to prevent state manipulation.

---

## Project Structure

```
skyroute/
├── app/
│   ├── layout.tsx                  Root layout, theme provider, global nav & footer
│   ├── globals.css                 Design tokens, animations, and Tailwind utilities
│   ├── page.tsx                    Landing page with hero, search, showcase modules & FAQ
│   ├── search/page.tsx             Flight results with live sorting and filtering
│   ├── book/[flightId]/page.tsx    Step-by-step booking & seat selection flow
│   ├── confirmation/[pnr]/page.tsx Printable e-ticket & confirmed reservation
│   ├── bookings/page.tsx           My Bookings list with status filtering & cancellation
│   ├── manage/page.tsx             Direct PNR + surname reservation lookup
│   ├── login/page.tsx              Customer & Administrator sign-in
│   ├── register/page.tsx           Account registration
│   └── admin/page.tsx              Administrator operations console
├── components/
│   ├── AppProvider.tsx             Session context, storage initialization & cross-tab sync
│   ├── LightRays.tsx               Theme-adaptive WebGL volumetric light ray effect
│   ├── LiveTicker.tsx              Real-time operational telemetry ticker
│   ├── DestinationShowcase.tsx     Route explorer with destination photography & direct links
│   ├── CabinShowcase.tsx           Interactive First, Business & Economy cabin explorer
│   ├── FleetShowcase.tsx           Aircraft specifications & route pairing matrix
│   ├── SimulationPricingExplainer.tsx Interactive dynamic yield fare calculator
│   ├── TestimonialsSection.tsx     Passenger & aviation expert testimonials
│   ├── FaqSection.tsx              Expandable FAQ accordion
│   ├── SearchForm.tsx              Multi-criteria flight search widget
│   ├── FlightCard.tsx              Flight listing card with real-time fare quote
│   ├── SeatMap.tsx                 Interactive keyboard-accessible cabin seat map
│   ├── PassengerForm.tsx           Passenger details form with age-band validation
│   └── PaymentForm.tsx             Card payment form with Luhn check and brand detection
├── lib/
│   ├── types.ts                    TypeScript domain interfaces
│   ├── storage.ts                  Isolated browser localStorage adapter
│   ├── repository.ts               Data access, business operations & authorization
│   ├── pricing.ts                  Dynamic yield engine and refund calculation
│   ├── seats.ts                    Seat map generator and conflict prevention
│   ├── validation.ts               Comprehensive input validation rules
│   ├── auth.ts                     Salted, iterated password hashing & demo accounts
│   ├── ids.ts                      PNR and identifier generation
│   ├── seed.ts                     Initial airports, routes, fleet and schedules
│   └── format.ts                   Currency, date, and time formatting helpers
└── tests/                          193 Vitest unit & integration tests
```

---

## Dynamic Fare & Refund Engine

### Airfare Calculation
```
Final Passenger Airfare =
  Base Reference Fare
  × advancePurchaseFactor(daysToDeparture)   [0.90 (30+ days) → 1.50 (last-minute)]
  × demandFactor(cabinLoadFactor)            [1.00 (<50% load) → 1.35 (>90% peak)]
  × passengerTypeFactor                      [Adult 1.0 · Child 0.75 · Infant 0.10]
  × cabinFactor                              [Economy 1.0 · Business 2.6 · First 4.2]

Total Booking Price = Σ(Passenger Fares) + Seat Selection Fees + 7.5% VAT + ₦2,500 Service Charge
```

### Cancellation Refund Schedule
The booking service charge (₦2,500) is non-refundable; the remainder is refunded based on the remaining cancellation window:

| Time Prior to Departure | Refund Percentage |
| --- | ---: |
| 7 days or more (168+ hours) | **90%** |
| 3 to 7 days (72–168 hours) | **70%** |
| 24 to 72 hours | **50%** |
| Under 24 hours | **0%** |

---

## Testing & Quality Assurance

The codebase includes **193 unit and integration tests** executed via Vitest:

| Test Suite | Tests | Scope Covered |
| --- | ---: | --- |
| `pricing.test.ts` | 30 | Yield factors, itemized totals, tax calculations, cancellation refunds |
| `seats.test.ts` | 23 | Seat map generation, occupancy resolution, conflict detection |
| `validation.test.ts` | 73 | Email/phone formats, age-band rules, Luhn algorithm, expiry dates |
| `auth.test.ts` | 21 | Password salting, key stretching, constant-time comparison |
| `repository.test.ts` | 46 | Sign-in, account creation, flight dispatch, booking & authorization |

```bash
npm test
```

---

## Technology Stack

| Layer | Technology |
| --- | --- |
| **Framework** | Next.js 15 (App Router) |
| **UI Library** | React 19 |
| **Language** | TypeScript 5.7 (Strict Mode) |
| **Styling** | Tailwind CSS 3.4 + Vanilla CSS Variables |
| **Animations** | Framer Motion + WebGL (`ogl`) |
| **Theme System** | Next Themes (System / Dark / Light) |
| **Testing** | Vitest 2.1 + jsdom |
| **Persistence** | Browser `localStorage` |
| **Icons** | Custom 24×24 SVG Icon System |
