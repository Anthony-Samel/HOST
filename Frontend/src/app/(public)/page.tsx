"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { EventItem } from "@/lib/types";
import { apiFetch } from "@/lib/api";
import EventCard from "@/components/EventCard";
import { TicketIcon } from "@/components/Icons";

export default function DiscoverPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "free" | "paid">("all");

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiFetch<EventItem[]>("/events/")
      .then((data) => {
        if (!active) return;
        setEvents(Array.isArray(data) ? data : []);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Could not load events.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (filterMode === "free" && !ev.is_free) return false;
      if (filterMode === "paid" && ev.is_free) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        ev.title.toLowerCase().includes(q) ||
        ev.location_label.toLowerCase().includes(q) ||
        ev.hosted_by_label.toLowerCase().includes(q) ||
        ev.category.toLowerCase().includes(q)
      );
    });
  }, [events, filterMode, search]);

  return (
    <div>
      {/* Hero Band */}
      <section className="border-b border-[var(--host-navy-border)] bg-[var(--host-navy)] text-[var(--host-ink-light)]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="max-w-3xl">
            <span className="inline-block rounded-full bg-[var(--host-coral-soft)] px-3 py-1 text-xs font-semibold text-[var(--host-coral)]">
              No Attendee Account Required
            </span>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">
              Find parties, hangouts, and campus events—get a one-use code in minutes.
            </h1>
            <p className="mt-3 text-sm text-[var(--host-ink-light-muted)] sm:text-base">
              Apply for free events or pay via bank transfer for tickets, receive unique QR access codes per guest slot, and let hosts verify entry cleanly.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard/events/new"
                className="rounded-lg bg-[var(--host-coral)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--host-coral-hover)]"
              >
                Host an Event
              </Link>
              <Link
                href="/ticket/lookup"
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--host-navy-border)] bg-[var(--host-navy-elevated)] px-4 py-2.5 text-sm font-semibold text-[var(--host-ink-light)] hover:border-[var(--host-coral)]"
              >
                <TicketIcon className="h-4 w-4 text-[var(--host-coral)]" />
                <span>Check Ticket / Access Code</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Filter & Event Grid */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            {(["all", "free", "paid"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFilterMode(mode)}
                className={`rounded-lg px-3.5 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  filterMode === mode
                    ? "bg-[var(--host-navy)] text-white"
                    : "border border-[#d6cfc2] bg-white text-[var(--host-ink-dark)] hover:border-[var(--host-coral)]"
                }`}
              >
                {mode === "all" ? "All Events" : mode === "free" ? "Free / Apply" : "Paid Tickets"}
              </button>
            ))}
          </div>

          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search event, host, spot, or category..."
            aria-label="Search events"
            className="w-full rounded-lg border border-[#cbd5e1] bg-white px-4 py-2 text-sm text-[var(--host-ink-dark)] placeholder:text-slate-400 focus:border-[var(--host-coral)] focus:outline-none sm:w-80"
          />
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-80 animate-pulse rounded-xl border border-[#e2dcd0] bg-white"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            {error}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="rounded-xl border border-[#d6cfc2] bg-white p-10 text-center">
            <h2 className="text-lg font-bold text-[var(--host-ink-dark)]">No matching events yet</h2>
            <p className="mt-1 text-sm text-[var(--host-ink-dark-muted)]">
              Be the first host to publish a campus hangout or event.
            </p>
            <Link
              href="/dashboard/events/new"
              className="mt-4 inline-block rounded-lg bg-[var(--host-coral)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--host-coral-hover)]"
            >
              Host an Event
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}