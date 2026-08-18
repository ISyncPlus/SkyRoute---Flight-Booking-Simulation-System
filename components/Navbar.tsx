"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "./AppProvider";
import { Icon, type IconName } from "./icons";
import { LogoMark } from "./Brand";
import { ThemeToggle } from "./ui/theme-toggle";

/* The icons are for the mobile sheet, where each link is a full-width row and
   the glyph is what the eye lands on first. The desktop bar stays text-only:
   four labelled icons plus the account controls would crowd it at the width
   the breakpoint actually starts. */
const LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Search flights", icon: "search" },
  { href: "/bookings", label: "My bookings", icon: "ticket" },
  { href: "/manage", label: "Manage booking", icon: "luggage" },
];

export function Navbar() {
  const { user, isAdmin, signOut, ready } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  /** Drives the bar's contract-and-detach. See `.nav-rail` in globals.css. */
  const [scrolled, setScrolled] = useState(false);

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
   * The threshold is well clear of 0 so that the elastic overscroll at the
   * top of the page — and the couple of pixels a focus jump moves things —
   * cannot flip the bar back and forth. React bails out of the re-render
   * when the boolean is unchanged, so this stays cheap on every frame.
   */
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24);
    }
    onScroll(); // A reload partway down the page must not start attached.
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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

      <div
        data-scrolled={scrolled}
        className={`nav-rail material ${scrolled ? "" : "scroll-edge"}`}
      >
        <nav className="container-page flex h-16 items-center justify-between gap-4" aria-label="Main">
          <Link
            href="/"
            className="pressable flex items-center gap-2.5 text-title-3 font-semibold text-ink"
          >
            <LogoMark className="h-8 w-8" />
            SkyRoute
          </Link>

          <ul className="hidden items-center gap-0.5 md:flex">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isCurrent(link.href) ? "page" : undefined}
                  className={`pressable hover-fill block rounded-md px-3 py-2 text-footnote font-medium ${
                    isCurrent(link.href) ? "bg-fill text-ink" : "text-ink-2"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden items-center gap-3 md:flex">
            <ThemeToggle />
            {!ready ? null : user ? (
              <>
                <span className="on-material flex items-center gap-2 text-footnote">
                  <Icon name="user" className="h-4 w-4 text-ink-3" />
                  {user.fullName.split(" ")[0]}
                  {isAdmin && (
                    <span className="badge gap-1 bg-warn-soft text-warn-ink">
                      <Icon name="shield" className="h-3 w-3" />
                      Admin
                    </span>
                  )}
                </span>
                <button type="button" onClick={handleSignOut} className="btn-secondary">
                  <Icon name="signOut" className="h-4 w-4" />
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-secondary">
                  <Icon name="signIn" className="h-4 w-4" />
                  Sign in
                </Link>
                <Link href="/register" className="btn-primary">
                  <Icon name="plus" className="h-4 w-4" />
                  Create account
                </Link>
              </>
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
            ) : (
              <>
                <Link href="/login" onClick={() => setMenuOpen(false)} className="btn-secondary w-full">
                  <Icon name="signIn" className="h-4 w-4" />
                  Sign in
                </Link>
                <Link href="/register" onClick={() => setMenuOpen(false)} className="btn-primary w-full">
                  <Icon name="plus" className="h-4 w-4" />
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
