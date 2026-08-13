"use client";

/**
 * Interactive seat map.
 * ---------------------
 * Renders one cabin at a time. Seats are keyboard accessible (they are real
 * buttons), and each carries an accessible label describing its position,
 * status and fee, so the map is usable with a screen reader.
 */

import { groupByRow, seatsInCabin } from "@/lib/seats";
import { formatMoney, seatFee } from "@/lib/pricing";
import { CABIN_NAMES } from "@/lib/format";
import type { CabinClass, Seat } from "@/lib/types";

interface SeatMapProps {
  seats: Seat[];
  cabin: CabinClass;
  selected: string[];
  maxSelectable: number;
  onToggle: (seatId: string) => void;
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-caption text-ink-2">
      <span aria-hidden="true" className={`h-4 w-4 rounded border ${className}`} />
      {label}
    </span>
  );
}

export function SeatMap({ seats, cabin, selected, maxSelectable, onToggle }: SeatMapProps) {
  const cabinSeats = seatsInCabin(seats, cabin);
  const rows = groupByRow(cabinSeats);
  const columns = cabinSeats.length > 0 ? [...new Set(cabinSeats.map((seat) => seat.column))] : [];
  const groupSize = columns.length <= 4 ? 2 : 3;

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-line bg-fill px-4 py-10 text-center text-callout text-ink-2">
        This aircraft has no {CABIN_NAMES[cabin]} cabin.
      </p>
    );
  }

  function statusClass(seat: Seat): string {
    if (selected.includes(seat.id)) return "seat seat-selected";
    if (seat.status === "occupied") return "seat seat-occupied";
    if (seat.status === "blocked") return "seat seat-blocked";
    if (seat.isExitRow) return "seat seat-exit";
    return "seat seat-available";
  }

  function describe(seat: Seat): string {
    const parts = [`Seat ${seat.id}`, CABIN_NAMES[seat.cabin]];
    if (seat.isExitRow) parts.push("exit row, extra legroom");
    else if (seat.isWindow) parts.push("window");
    else if (seat.isAisle) parts.push("aisle");
    else parts.push("middle");

    if (seat.status === "occupied") parts.push("already taken");
    else if (seat.status === "blocked") parts.push("unavailable");
    else {
      const fee = seatFee(seat);
      parts.push(fee > 0 ? `fee ${formatMoney(fee)}` : "no seat fee");
    }

    if (selected.includes(seat.id)) parts.push("currently selected");
    return parts.join(", ");
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <LegendSwatch className="border-line-strong bg-surface" label="Available" />
        <LegendSwatch className="border-accent bg-accent" label="Selected" />
        <LegendSwatch className="border-transparent bg-fill-strong" label="Taken" />
        <LegendSwatch className="border-warn bg-warn-soft" label="Exit row" />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-fill p-4 sm:p-5">
        <div className="mx-auto w-fit">
          <p className="mb-4 text-center text-overline font-semibold uppercase text-ink-3">
            ▲ Front of aircraft
          </p>

          {/* Column headings */}
          <div className="mb-2 flex items-center gap-1.5">
            <span className="w-7" aria-hidden="true" />
            {columns.map((column, index) => (
              <span key={column} className="flex items-center gap-1.5">
                <span className="flex h-4 w-9 items-center justify-center text-micro font-bold text-ink-3">
                  {column}
                </span>
                {(index + 1) % groupSize === 0 && index < columns.length - 1 && (
                  <span aria-hidden="true" className="w-5" />
                )}
              </span>
            ))}
          </div>

          {rows.map(({ row, seats: rowSeats }) => {
            const isExitRow = rowSeats.some((seat) => seat.isExitRow);
            return (
              <div key={row} className="mb-1.5 flex items-center gap-1.5">
                <span
                  className={`tabular w-7 text-right text-micro font-semibold ${
                    isExitRow ? "text-warn-ink" : "text-ink-3"
                  }`}
                >
                  {row}
                </span>
                {columns.map((column, index) => {
                  const seat = rowSeats.find((candidate) => candidate.column === column);
                  const isSelectable =
                    seat &&
                    seat.status === "available" &&
                    (selected.includes(seat.id) || selected.length < maxSelectable);

                  return (
                    <span key={column} className="flex items-center gap-1.5">
                      {seat ? (
                        <button
                          type="button"
                          onClick={() => onToggle(seat.id)}
                          disabled={!isSelectable}
                          aria-pressed={selected.includes(seat.id)}
                          aria-label={describe(seat)}
                          title={describe(seat)}
                          className={statusClass(seat)}
                        >
                          {seat.column}
                        </button>
                      ) : (
                        <span aria-hidden="true" className="h-9 w-9" />
                      )}
                      {(index + 1) % groupSize === 0 && index < columns.length - 1 && (
                        <span aria-hidden="true" className="w-5" />
                      )}
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-4 text-caption text-ink-3">
        Selected {selected.length} of {maxSelectable} seat{maxSelectable === 1 ? "" : "s"}. Exit-row
        and window/aisle seats in Economy carry a selection fee; premium cabins are complimentary.
      </p>
    </div>
  );
}
