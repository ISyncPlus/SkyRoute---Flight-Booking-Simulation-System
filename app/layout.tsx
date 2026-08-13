import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/components/AppProvider";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "SkyRoute | Flight Booking Simulation System",
  description:
    "A flight booking simulation system built with Next.js, using browser localStorage for persistence.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* Column layout so the footer sits at the bottom of short pages rather
          than halfway up the viewport. */}
      <body className="flex min-h-screen flex-col">
        <AppProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent"
          >
            Skip to main content
          </a>
          <Navbar />
          <main id="main" className="flex-1 pb-20 pt-7">
            {children}
          </main>
          <footer className="no-print border-t border-line py-8">
            <div className="container-page text-center text-caption text-ink-3">
              <p className="font-medium text-ink-2">SkyRoute Flight Booking Simulation System</p>
              <p className="mx-auto mt-1.5 max-w-lg">
                An academic project. No real flights, seats or payments are involved, and all
                schedules and fares are fictional.
              </p>
            </div>
          </footer>
        </AppProvider>
      </body>
    </html>
  );
}
