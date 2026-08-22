import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { AppProvider } from "@/components/AppProvider";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const DESCRIPTION =
  "A full-stack flight booking system: a Next.js front end backed by a hosted API for schedules, accounts and reservations.";

/* The favicon, home-screen icon and social card are picked up by file
   convention from app/icon.svg, app/apple-icon.tsx and app/opengraph-image.tsx,
   all three cut from the vectors in design/. */
export const metadata: Metadata = {
  title: "SkyRoute | Flight Booking System",
  description: DESCRIPTION,
  applicationName: "SkyRoute",
  openGraph: {
    title: "SkyRoute - Flight Booking System",
    description: DESCRIPTION,
    siteName: "SkyRoute",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f3f2" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)} suppressHydrationWarning>
      {/* Column layout so the footer sits at the bottom of short pages rather
          than halfway up the viewport. */}
      <body className="flex min-h-screen flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AppProvider>
            <SmoothScroll>
              <a
                href="#main"
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent"
              >
                Skip to main content
              </a>
              <Navbar />
              {/* The footer brings its own generous top padding, so main only
                  needs enough to keep the last section off the hairline. */}
              <main id="main" className="flex-1 pb-8">
                {children}
              </main>
              <Footer />
            </SmoothScroll>
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
