"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { VenueItem } from "@/lib/types";
import { apiFetch, resolveMediaUrl } from "@/lib/api";
import { ExternalLinkIcon, MapPinIcon, UsersIcon } from "@/components/Icons";

export default function VenuesPage() {
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<VenueItem[]>("/venues/")
      .then((data) => {
        if (!active) return;
        setVenues(Array.isArray(data) ? data : []);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Could not load venues.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-col justify-between gap-4 border-b border-[#dfd8ca] pb-6 sm:flex-row sm:items-end">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--host-coral)]">
            Listed Spaces
          </span>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[var(--host-ink-dark)]">
            Campus & Local Venues
          </h1>
          <p className="mt-1 text-sm text-[var(--host-ink-dark-muted)]">
            Book a listed spot directly when setting up your event, or host at your own traceable location.
          </p>
        </div>
        <Link
          href="/dashboard/venues"
          className="w-fit rounded-lg bg-[var(--host-navy)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--host-coral)]"
        >
          Manage & Book Venues
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-72 animate-pulse rounded-xl bg-white" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          {error}
        </div>
      ) : venues.length === 0 ? (
        <div className="rounded-xl border border-[#d6cfc2] bg-white p-10 text-center">
          <h2 className="text-lg font-bold">No listed venues yet</h2>
          <p className="mt-1 text-sm text-[var(--host-ink-dark-muted)]">
            Hosts can still attach any traceable house or spot address with a map link when creating an event, or add a venue in the dashboard.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((venue) => {
            const photoUrl = resolveMediaUrl(venue.photo);
            const fee = Number(venue.booking_fee || 0);
            return (
              <article
                key={venue.id}
                className="flex flex-col overflow-hidden rounded-xl border border-[#d6cfc2] bg-white shadow-sm"
              >
                <div className="h-44 w-full bg-[var(--host-navy)]">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={venue.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-end p-4 text-xs text-[var(--host-ink-light-muted)]">
                      {venue.campus_or_area}
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col justify-between p-4">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[var(--host-coral)]">
                        {venue.campus_or_area}
                      </span>
                      <span className="text-xs font-bold text-[var(--host-ink-dark)]">
                        {fee > 0 ? `NGN ${fee.toLocaleString()}` : "Free / Negotiable"}
                      </span>
                    </div>
                    <h2 className="mt-1 text-lg font-bold text-[var(--host-ink-dark)]">
                      {venue.name}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--host-ink-dark-muted)]">
                      {venue.description || venue.address}
                    </p>
                    <div className="mt-3 space-y-1 text-xs text-[var(--host-ink-dark-muted)]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 truncate">
                          <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-[var(--host-navy)]" />
                          <span className="truncate">{venue.address}</span>
                        </span>
                        {venue.map_url && (
                          <a
                            href={venue.map_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex shrink-0 items-center gap-1 font-semibold text-[var(--host-coral)] hover:underline"
                          >
                            Map
                            <ExternalLinkIcon className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <UsersIcon className="h-3.5 w-3.5 shrink-0 text-[var(--host-navy)]" />
                        <span>Up to {venue.capacity} guests</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-[#ece6da] pt-3">
                    <Link
                      href={`/dashboard/events/new?venue=${venue.id}`}
                      className="block w-full rounded-lg bg-[var(--host-navy)] px-4 py-2 text-center text-sm font-semibold text-white hover:bg-[var(--host-coral)]"
                    >
                      Book for Event
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}