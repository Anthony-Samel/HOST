"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { EventItem } from "@/lib/types";
import { apiFetch } from "@/lib/api";
import { CalendarIcon, ExternalLinkIcon, MapPinIcon, UsersIcon } from "@/components/Icons";

export default function DashboardOverviewPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<EventItem[]>("/events/?mine=true", { auth: true })
      .then((data) => {
        if (!active) return;
        setEvents(Array.isArray(data) ? data : []);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Could not load your events.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-[#dfd8ca] pb-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--host-ink-dark)] sm:text-3xl">
            My Hosted Events
          </h1>
          <p className="mt-1 text-sm text-[var(--host-ink-dark-muted)]">
            Manage guest registrations, confirm bank transfers, print single-use access code lists, and run gate check-in.
          </p>
        </div>

        <Link
          href="/dashboard/events/new"
          className="w-fit rounded-lg bg-[var(--host-coral)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--host-coral-hover)]"
        >
          + Host New Event
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((n) => (
            <div key={n} className="h-48 animate-pulse rounded-xl bg-white" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-[#d6cfc2] bg-white p-10 text-center">
          <h2 className="text-lg font-bold text-[var(--host-ink-dark)]">
            You haven&apos;t hosted any events yet
          </h2>
          <p className="mt-1 text-sm text-[var(--host-ink-dark-muted)]">
            Create a free hangout or paid party with customizable ticket categories and traceable map directions.
          </p>
          <Link
            href="/dashboard/events/new"
            className="mt-4 inline-block rounded-lg bg-[var(--host-navy)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--host-coral)]"
          >
            Create Your First Event
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="flex flex-col justify-between rounded-xl border border-[#d6cfc2] bg-white p-5 shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-[var(--host-coral-soft)] px-2.5 py-0.5 text-xs font-bold text-[var(--host-coral)]">
                    {ev.is_free ? "Free / Apply" : "Paid Tickets"}
                  </span>
                  <Link
                    href={`/events/${ev.slug}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--host-ink-dark-muted)] hover:text-[var(--host-coral)]"
                  >
                    Public Page
                    <ExternalLinkIcon className="h-3 w-3" />
                  </Link>
                </div>

                <h2 className="mt-2 text-lg font-extrabold text-[var(--host-ink-dark)]">
                  {ev.title}
                </h2>

                <div className="mt-3 space-y-1.5 text-xs text-[var(--host-ink-dark-muted)]">
                  <div className="flex items-center gap-1.5">
                    <CalendarIcon className="h-3.5 w-3.5 text-[var(--host-navy)]" />
                    <span>
                      {new Date(ev.start_at).toLocaleString("en-NG", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPinIcon className="h-3.5 w-3.5 text-[var(--host-navy)]" />
                    <span>{ev.location_label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <UsersIcon className="h-3.5 w-3.5 text-[var(--host-navy)]" />
                    <span>
                      {ev.capacity} capacity &bull; {ev.ticket_categories.length} ticket tier(s)
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2 border-t border-[#ece6da] pt-4">
                <Link
                  href={`/dashboard/events/${ev.id}`}
                  className="flex-1 rounded-lg bg-[var(--host-navy)] px-3.5 py-2 text-center text-xs font-bold text-white hover:bg-[var(--host-coral)]"
                >
                  Guests & Printable Codes
                </Link>
                <Link
                  href={`/dashboard/checkin?event=${ev.id}`}
                  className="rounded-lg border border-[#cbd5e1] px-3.5 py-2 text-xs font-bold text-[var(--host-ink-dark)] hover:border-[var(--host-coral)]"
                >
                  Gate Scan
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}