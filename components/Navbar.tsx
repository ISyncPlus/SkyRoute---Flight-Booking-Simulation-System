"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "./AppProvider";
import { PlaneGlyph } from "./ui";

const LINKS = [
  { href: "/", label: "Search flights" },
  { href: "/bookings", label: "My bookings" },
  { href: "/manage", label: "Manage booking" },
];

export function Navbar() {
  const { user, isAdmin, signOut, ready } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  // A menu that cannot be dismissed with Escape traps the user in it.
  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  function handleSignOut() {
    signOut();
    setMenuOpen(false);
    router.push("/");
  }

  function isCurrent(href: string) {
    return href === "/admin" ? pathname.startsWith("/admin") : pathname === href;
  }

  const navLinks = isAdmin ? [...LINKS, { href: "/admin", label: "Admin" }] : LINKS;

  return (
    <header className="no-print scroll-edge material sticky top-0 z-40 border-b border-line">
      <nav className="container-page flex h-16 items-center justify-between gap-4" aria-label="Main">
        <Link
          href="/"
          className="pressable flex items-center gap-2.5 text-title-3 font-semibold text-ink"
        >
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-on-accent shadow-e1"
          >
            <PlaneGlyph />
          </span>
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
          {!ready ? null : user ? (
            <>
              <span className="on-material flex items-center gap-2 text-footnote">
                {user.fullName.split(" ")[0]}
                {isAdmin && <span className="badge bg-warn-soft text-warn-ink">Admin</span>}
              </span>
              <button type="button" onClick={handleSignOut} className="btn-secondary">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-secondary">
                Sign in
              </Link>
              <Link href="/register" className="btn-primary">
                Create account
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="btn-secondary h-10 w-10 !px-0 md:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          <span aria-hidden="true" className="text-title-3 leading-none">
            {menuOpen ? "×" : "≡"}
          </span>
        </button>
      </nav>

      {/* Dismiss layer. Translucent rather than a heavy scrim — the menu is a
          parallel panel, not a modal task that should push the page away. */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={() => setMenuOpen(false)}
        className={`fixed inset-0 top-16 cursor-default md:hidden ${menuOpen ? "block" : "hidden"}`}
      />

      {/* Enters and leaves along the same path, anchored under the bar it
          came from. */}
      <div
        data-open={menuOpen}
        className="sheet material absolute inset-x-0 top-full border-b border-line px-4 pb-4 pt-2 md:hidden"
      >
        <ul className="flex flex-col">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={() => setMenuOpen(false)}
                aria-current={isCurrent(link.href) ? "page" : undefined}
                className={`pressable block rounded-md px-3 py-2.5 text-callout font-medium ${
                  isCurrent(link.href) ? "bg-fill text-ink" : "text-ink"
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex gap-2 border-t border-line pt-3">
          {user ? (
            <button type="button" onClick={handleSignOut} className="btn-secondary w-full">
              Sign out
            </button>
          ) : (
            <>
              <Link href="/login" onClick={() => setMenuOpen(false)} className="btn-secondary w-full">
                Sign in
              </Link>
              <Link href="/register" onClick={() => setMenuOpen(false)} className="btn-primary w-full">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
