"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { VenueItem } from "@/lib/types";
import { apiFetch } from "@/lib/api";

export default function DashboardVenuesPage() {
  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [campusOrArea, setCampusOrArea] = useState("");
  const [address, setAddress] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [capacity, setCapacity] = useState(60);
  const [bookingFee, setBookingFee] = useState("0");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const loadVenues = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiFetch<VenueItem[]>("/venues/");
      setVenues(list);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load venues.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVenues();
  }, [loadVenues]);

  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await apiFetch("/venues/", {
        method: "POST",
        auth: true,
        body: JSON.stringify({
          name: name.trim(),
          campus_or_area: campusOrArea.trim(),
          address: address.trim(),
          map_url: mapUrl.trim(),
          capacity: Number(capacity),
          booking_fee: String(Number(bookingFee || 0)),
          description: description.trim(),
        }),
      });
      setName("");
      setCampusOrArea("");
      setAddress("");
      setMapUrl("");
      setDescription("");
      await loadVenues();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not add venue.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="border-b border-[#dfd8ca] pb-4">
        <h1 className="text-2xl font-extrabold text-[var(--host-ink-dark)]">
          Venues Directory & Listing
        </h1>
        <p className="mt-1 text-sm text-[var(--host-ink-dark-muted)]">
          List a campus or local venue with a map link so hosts can book it when creating events.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Add New Venue Form */}
        <form
          onSubmit={handleCreateVenue}
          className="space-y-4 rounded-2xl border border-[#d6cfc2] bg-white p-6 lg:col-span-5"
        >
          <h2 className="text-base font-bold text-[var(--host-ink-dark)]">
            List a Venue
          </h2>

          <div>
            <label className="mb-1 block text-xs font-semibold">Venue Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Lounge 24 / Courtyard"
              className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm focus:border-[var(--host-coral)] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold">Campus / Area</label>
            <input
              type="text"
              required
              value={campusOrArea}
              onChange={(e) => setCampusOrArea(e.target.value)}
              placeholder="e.g. Main Campus / Okesa"
              className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm focus:border-[var(--host-coral)] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold">Street Address</label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm focus:border-[var(--host-coral)] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold">Map Link (URL)</label>
            <input
              type="url"
              value={mapUrl}
              onChange={(e) => setMapUrl(e.target.value)}
              placeholder="https://maps.google.com/?q=..."
              className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm focus:border-[var(--host-coral)] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold">Capacity</label>
              <input
                type="number"
                min={1}
                required
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm focus:border-[var(--host-coral)] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Fee (NGN)</label>
              <input
                type="number"
                min={0}
                value={bookingFee}
                onChange={(e) => setBookingFee(e.target.value)}
                className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm focus:border-[var(--host-coral)] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold">Notes</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-[#cbd5e1] px-3 py-2 text-sm focus:border-[var(--host-coral)] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={creating}
            className="w-full rounded-lg bg-[var(--host-navy)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--host-coral)] disabled:opacity-50"
          >
            {creating ? "Saving Venue..." : "Publish Venue"}
          </button>
        </form>

        {/* Listed Venues */}
        <div className="space-y-4 lg:col-span-7">
          <h2 className="text-base font-bold text-[var(--host-ink-dark)]">
            Available Venues ({venues.length})
          </h2>

          {loading ? (
            <div className="h-48 animate-pulse rounded-xl bg-white" />
          ) : venues.length === 0 ? (
            <div className="rounded-xl border border-[#d6cfc2] bg-white p-6 text-sm text-[var(--host-ink-dark-muted)]">
              No venues listed yet. Add one using the form or host directly at any traceable location.
            </div>
          ) : (
            <div className="space-y-3">
              {venues.map((v) => (
                <div
                  key={v.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#d6cfc2] bg-white p-4"
                >
                  <div>
                    <p className="text-sm font-extrabold text-[var(--host-ink-dark)]">
                      {v.name}{" "}
                      <span className="text-xs font-medium text-[var(--host-coral)]">
                        ({v.campus_or_area})
                      </span>
                    </p>
                    <p className="text-xs text-[var(--host-ink-dark-muted)]">
                      {v.address} &bull; Cap: {v.capacity} &bull; NGN{" "}
                      {Number(v.booking_fee || 0).toLocaleString()}
                    </p>
                  </div>

                  <Link
                    href={`/dashboard/events/new?venue=${v.id}`}
                    className="rounded-lg bg-[var(--host-coral)] px-3.5 py-2 text-xs font-bold text-white hover:bg-[var(--host-coral-hover)]"
                  >
                    Use for Event
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}