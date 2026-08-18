"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "./AppProvider";
import { Icon, type IconName } from "./icons";
import { LogoMark } from "./Brand";
import { ThemeToggle } from "./ui/theme-toggle";

/* The icons are for the mobile sheet, where each link is a full-width row and
   the glyph is what the eye lands on first. The desktop bar stays text-only:
   four labelled icons plus the account controls would crowd it at the width
   the breakpoint actually starts. */
/* How far the page scrolls while the bar gathers itself in. Short enough that
   it is fully a pill by the time the first section clears the top, long enough
   that the change reads as motion rather than a snap. */
const TRAVEL = 120;

const LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Search flights", icon: "search" },
  { href: "/bookings", label: "My bookings", icon: "ticket" },
  { href: "/manage", label: "Manage booking", icon: "luggage" },
];

export function Navbar() {
  const { user, isGuest, isAdmin, signOut, exitGuest, ready } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);

  // A menu that cannot be dismissed with Escape traps the user in it.
  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  /**
   * Scroll progress, 0 → 1 across the first {@link TRAVEL} pixels, written
   * straight onto the rail as a CSS variable. Deliberately *not* React state:
   * this updates on every frame of a scroll, and re-rendering the whole
   * navigation that often to move a number would be wasteful. The CSS owns
   * what the number means; this only reports where the page is.
   */
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;

    function update() {
      frame = 0;
      const raw = Math.min(1, Math.max(0, window.scrollY / TRAVEL));
      // Reduced motion gets the same two end states, with none of the travel.
      rail!.style.setProperty("--nav-p", String(reduceMotion ? Math.round(raw) : raw));
    }

    function onScroll() {
      // Coalesce to one write per frame: scroll fires far more often than paint.
      if (!frame) frame = requestAnimationFrame(update);
    }

    update(); // A reload partway down the page must not start out attached.
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  function handleSignOut() {
    signOut();
    setMenuOpen(false);
    router.push("/");
  }

  function isCurrent(href: string) {
    return href === "/admin" ? pathname.startsWith("/admin") : pathname === href;
  }

  const navLinks = isAdmin
    ? [...LINKS, { href: "/admin", label: "Admin", icon: "shield" as IconName }]
    : LINKS;

  function handleLogoClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (pathname === "/") {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <header className="no-print sticky top-0 z-40">
      {/* Dismiss layer with backdrop blur */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={() => setMenuOpen(false)}
        className={`fixed inset-0 top-16 cursor-default transition-opacity duration-200 md:hidden ${
          menuOpen ? "block bg-black/40 backdrop-blur-md" : "hidden"
        }`}
      />

      <div ref={railRef} className="nav-rail material scroll-edge">
        <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6" aria-label="Main">
          <Link
            href="/"
            onClick={handleLogoClick}
            className="pressable flex shrink-0 items-center gap-2 text-title-3 font-semibold text-ink whitespace-nowrap cursor-pointer"
          >
            <LogoMark className="h-7 w-7" />
            SkyRoute
          </Link>

          <ul className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isCurrent(link.href) ? "page" : undefined}
                  className={`pressable hover-fill block whitespace-nowrap rounded-md px-3 py-1.5 text-footnote font-medium transition-colors ${
                    isCurrent(link.href) ? "bg-fill text-ink" : "text-ink-2"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden shrink-0 items-center gap-2.5 md:flex">
            <ThemeToggle />
            {!ready ? null : user ? (
              <>
                <span className="on-material flex items-center gap-1.5 text-footnote whitespace-nowrap">
                  <Icon name="user" className="h-4 w-4 text-ink-3" />
                  <span className="font-medium text-ink">{user.fullName.split(" ")[0]}</span>
                  {isAdmin && (
                    <span className="badge gap-1 bg-warn-soft px-2 py-0.5 text-warn-ink text-micro">
                      <Icon name="shield" className="h-3 w-3" />
                      Admin
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="btn-secondary !px-3 !py-1.5 text-footnote whitespace-nowrap"
                >
                  <Icon name="signOut" className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </>
            ) : isGuest ? (
              <>
                <span className="on-material flex items-center gap-1.5 rounded-full border border-line bg-surface/70 px-2.5 py-1 text-footnote font-medium text-ink whitespace-nowrap shadow-sm">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-white font-semibold text-micro">
                    G
                  </span>
                  <span>Guest</span>
                </span>
                <Link
                  href="/register"
                  className="btn-primary !px-3.5 !py-1.5 text-footnote whitespace-nowrap shadow-sm"
                >
                  Create account
                </Link>
                <button
                  type="button"
                  onClick={exitGuest}
                  className="btn-secondary !px-2.5 !py-1.5 text-footnote whitespace-nowrap"
                  title="Exit guest mode"
                >
                  <Icon name="signOut" className="h-3.5 w-3.5" />
                  <span>Exit</span>
                </button>
              </>
            ) : (
              /* One door in, rather than a sign-in/register pair: booking never
                 requires an account now, so the bar should not open with a
                 choice the visitor does not have to make yet. */
              <Link
                href="/register"
                className="btn-primary !px-4 !py-1.5 text-footnote whitespace-nowrap shadow-sm"
              >
                Get started
                <Icon name="arrowRight" className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              type="button"
              className="btn-secondary h-10 w-10 !px-0"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            >
              <Icon name={menuOpen ? "close" : "menu"} className="h-5 w-5" />
            </button>
          </div>
        </nav>

        {/* Enters and leaves along the same path, anchored under the bar it
            came from. It lives inside the rail so it tracks the rail's width —
            hung off the header instead, it would stay viewport-wide while the
            bar above it contracted. */}
        <div
          data-open={menuOpen}
          className="sheet material absolute inset-x-2 top-full mt-2 rounded-2xl border border-line px-4 pb-4 pt-2 shadow-e3 backdrop-blur-2xl md:hidden"
        >
          <ul className="flex flex-col">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={isCurrent(link.href) ? "page" : undefined}
                  className={`pressable flex items-center gap-3 rounded-md px-3 py-2.5 text-callout font-medium ${
                    isCurrent(link.href) ? "bg-fill text-ink" : "text-ink"
                  }`}
                >
                  <Icon
                    name={link.icon}
                    className={`h-5 w-5 ${isCurrent(link.href) ? "text-accent" : "text-ink-3"}`}
                  />
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex gap-2 border-t border-line pt-3">
            {user ? (
              <button type="button" onClick={handleSignOut} className="btn-secondary w-full">
                <Icon name="signOut" className="h-4 w-4" />
                Sign out
              </button>
            ) : isGuest ? (
              <div className="flex w-full flex-col gap-2.5">
                <div className="flex items-center justify-between px-1 text-footnote font-medium text-ink">
                  <span className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-soft text-accent-ink font-semibold text-micro">
                      G
                    </span>
                    Guest Traveler
                  </span>
                  <span className="badge bg-fill text-ink-3 text-micro">Guest Mode</span>
                </div>
                <div className="flex gap-2">
                  <Link
                    href="/register"
                    onClick={() => setMenuOpen(false)}
                    className="btn-primary flex-1 text-center justify-center"
                  >
                    Create account
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      exitGuest();
                      setMenuOpen(false);
                    }}
                    className="btn-secondary"
                  >
                    Exit
                  </button>
                </div>
              </div>
            ) : (
              <Link href="/register" onClick={() => setMenuOpen(false)} className="btn-primary w-full">
                Get started
                <Icon name="arrowRight" className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
