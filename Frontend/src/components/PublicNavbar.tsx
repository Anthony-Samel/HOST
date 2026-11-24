"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMarkIcon } from "./Icons";
import { getAccessToken } from "@/lib/auth";

export default function PublicNavbar() {
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(Boolean(getAccessToken()));
  }, [pathname]);

  const navLinkClass = (href: string) => {
    const active = pathname === href || (href !== "/" && pathname?.startsWith(href));
    return `text-sm font-medium transition-colors ${
      active
        ? "text-[var(--host-coral)]"
        : "text-[var(--host-ink-light-muted)] hover:text-[var(--host-ink-light)]"
    }`;
  };

  return (
    <header className="no-print sticky top-0 z-40 border-b border-[var(--host-navy-border)] bg-[var(--host-navy)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-[var(--host-ink-light)]"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--host-coral)] text-white">
            <BrandMarkIcon className="h-5 w-5" />
          </span>
          <span>Host</span>
        </Link>

        <nav aria-label="Primary navigation" className="flex items-center gap-4 sm:gap-6">
          <Link href="/" className={navLinkClass("/")}>
            Discover
          </Link>
          <Link href="/venues" className={navLinkClass("/venues")}>
            Venues
          </Link>
          <Link href="/dashboard/events/new" className={navLinkClass("/dashboard/events/new")}>
            Host an event
          </Link>
          {signedIn ? (
            <Link
              href="/dashboard"
              className="rounded-lg bg-[var(--host-coral)] px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--host-coral-hover)]"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-lg border border-[var(--host-navy-border)] bg-[var(--host-navy-elevated)] px-3.5 py-2 text-sm font-semibold text-[var(--host-ink-light)] transition-colors hover:border-[var(--host-coral)] hover:text-white"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}