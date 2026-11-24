import React from "react";
import Link from "next/link";
import PublicNavbar from "@/components/PublicNavbar";
import { TicketIcon } from "@/components/Icons";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--host-bone)] text-[var(--host-ink-dark)]">
      <PublicNavbar />
      <main className="flex-1">{children}</main>
      <footer className="no-print border-t border-[var(--host-navy-border)] bg-[var(--host-navy)] text-[var(--host-ink-light-muted)]">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 py-6 text-xs sm:flex-row sm:items-center sm:px-6">
          <p>
            <span className="font-semibold text-[var(--host-ink-light)]">Host</span> — Campus event discovery, venue booking & single-use entry codes.
          </p>
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/ticket/lookup" className="inline-flex items-center gap-1.5 hover:text-white">
              <TicketIcon className="h-3.5 w-3.5 text-[var(--host-coral)]" />
              <span>Find My Access Code</span>
            </Link>
            <Link href="/venues" className="hover:text-white">
              Browse Venues
            </Link>
            <Link href="/dashboard/events/new" className="hover:text-white">
              Host an Event
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}