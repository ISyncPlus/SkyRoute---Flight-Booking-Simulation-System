"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";

const TICKER_ITEMS = [
  {
    icon: "radar" as const,
    label: "Active Simulated Flights",
    value: "42 in Air",
    detail: "Real-time vector tracking",
  },
  {
    icon: "clock" as const,
    label: "On-Time Dispatch Rate",
    value: "98.7%",
    detail: "Last 24h simulation",
  },
  {
    icon: "seat" as const,
    label: "Global Fleet Load Factor",
    value: "84.2%",
    detail: "Dynamic yield active",
  },
  {
    icon: "shield" as const,
    label: "Offline Data Engine",
    value: "100% Local",
    detail: "Browser-isolated storage",
  },
  {
    icon: "sparkles" as const,
    label: "Airports Connected",
    value: "16 Hubs",
    detail: "Domestic & International",
  },
];

export function LiveTicker() {
  const [tickerTime, setTickerTime] = useState<string>("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTickerTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZoneName: "short",
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full border-y border-line bg-surface/80 py-3 backdrop-blur-md">
      <div className="container-wide flex flex-col items-center justify-between gap-3 text-caption md:flex-row">
        {/* Left: Simulation Live Status Indicator */}
        <div className="flex items-center gap-2.5 font-medium text-ink">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
          </span>
          <span className="font-semibold text-accent-ink">SIMULATION LIVE</span>
          <span className="text-ink-3">|</span>
          <span className="font-mono text-xs text-ink-2">{tickerTime || "UTC 12:00:00"}</span>
        </div>

        {/* Right: Scrolling/Flowing Metric Pills */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-ink-2">
          {TICKER_ITEMS.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <Icon name={item.icon} className="h-3.5 w-3.5 text-accent" />
              <span className="text-ink-3">{item.label}:</span>
              <span className="font-semibold text-ink">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
