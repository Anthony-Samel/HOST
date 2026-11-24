"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EventItem, HostProfileData, VenueItem } from "@/lib/types";
import { apiFetch } from "@/lib/api";

interface CategoryDraft {
  kind: "regular" | "duo" | "family" | "vip" | "custom";
  name: string;
  price: string;
  guests_per_ticket: number;
  quota: number;
  description: string;
}

const PRESET_TEMPLATES: Record<
  "regular" | "duo" | "family" | "vip",
  Omit<CategoryDraft, "price" | "quota" | "description">
> = {
  regular: { kind: "regular", name: "Regular", guests_per_ticket: 1 },
  duo: { kind: "duo", name: "Duo (Admits 2)", guests_per_ticket: 2 },
  family: { kind: "family", name: "Family / Squad (Admits 4)", guests_per_ticket: 4 },
  vip: { kind: "vip", name: "VIP", guests_per_ticket: 1 },
};

export default function CreateEventPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedVenueId = searchParams?.get("venue") || "";

  const [venues, setVenues] = useState<VenueItem[]>([]);
  const [title, setTitle] = useState("");
  const [hostedByLabel, setHostedByLabel] = useState("");
  const [category, setCategory] = useState("House Party");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [capacity, setCapacity] = useState(80);
  const [isFree, setIsFree] = useState(true);

  const [selectedVenueId, setSelectedVenueId] = useState<string>(preselectedVenueId);
  const [locationLabel, setLocationLabel] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [mapUrl, setMapUrl] = useState("");

  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");

  const [useCustomCategories, setUseCustomCategories] = useState(false);
  const [ticketCategories, setTicketCategories] = useState<CategoryDraft[]>([
    {
      kind: "regular",
      name: "Regular",
      price: "2000",
      guests_per_ticket: 1,
      quota: 50,
      description: "",
    },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<VenueItem[]>("/venues/")
      .then((list) => {
        setVenues(list);
        if (preselectedVenueId) {
          const match = list.find((v) => String(v.id) === preselectedVenueId);
          if (match) {
            setLocationLabel(match.name);
            setLocationAddress(match.address);
            setMapUrl(match.map_url);
            setCapacity(match.capacity);
          }
        }
      })
      .catch(() => {});

    apiFetch<HostProfileData>("/auth/me/", { auth: true })
      .then((me) => {
        setHostedByLabel(
          me.host_type === "group" && me.group_name ? me.group_name : me.display_name
        );
        setBankName(me.default_bank_name || "");
        setAccountNumber(me.default_account_number || "");
        setAccountName(me.default_account_name || "");
      })
      .catch(() => {});
  }, [preselectedVenueId]);

  const handleVenueChange = (venueId: string) => {
    setSelectedVenueId(venueId);
    const chosen = venues.find((v) => String(v.id) === venueId);
    if (chosen) {
      setLocationLabel(chosen.name);
      setLocationAddress(chosen.address);
      setMapUrl(chosen.map_url);
      setCapacity(chosen.capacity);
    }
  };

  const addPresetCategory = (presetKey: "regular" | "duo" | "family" | "vip") => {
    const preset = PRESET_TEMPLATES[presetKey];
    setTicketCategories((prev) => [
      ...prev,
      {
        ...preset,
        price: presetKey === "vip" ? "5000" : presetKey === "duo" ? "3500" : "2000",
        quota: 25,
        description: "",
      },
    ]);
  };

  const addCustomCategory = () => {
    setTicketCategories((prev) => [
      ...prev,
      {
        kind: "custom",
        name: "",
        price: "3000",
        guests_per_ticket: 1,
        quota: 20,
        description: "",
      },
    ]);
  };

  const updateCategoryRow = <K extends keyof CategoryDraft>(
    index: number,
    field: K,
    value: CategoryDraft[K]
  ) => {
    setTicketCategories((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, [field]: value } : row))
    );
  };

  const removeCategoryRow = (index: number) => {
    setTicketCategories((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        hosted_by_label: hostedByLabel.trim(),
        category: category.trim(),
        description: description.trim(),
        start_at: new Date(startAt).toISOString(),
        capacity: Number(capacity),
        is_free: isFree,
        location_label: locationLabel.trim(),
        location_address: locationAddress.trim(),
        map_url: mapUrl.trim(),
        booked_venue: selectedVenueId ? Number(selectedVenueId) : null,
        bank_name: isFree ? "" : bankName.trim(),
        account_number: isFree ? "" : accountNumber.trim(),
        account_name: isFree ? "" : accountName.trim(),
      };

      if (useCustomCategories && ticketCategories.length > 0) {
        payload.ticket_categories = ticketCategories.map((c) => ({
          kind: c.kind,
          name: c.name.trim() || "Regular",
          price: isFree ? "0.00" : String(Number(c.price || 0)),
          guests_per_ticket: Math.max(1, Number(c.guests_per_ticket || 1)),
          quota: Math.max(1, Number(c.quota || 1)),
          description: c.description.trim(),
        }));
      }

      const created = await apiFetch<EventItem>("/events/", {
        method: "POST",
        auth: true,
        body: JSON.stringify(payload),
      });

      if (selectedVenueId && startAt) {
        await apiFetch("/venues/book/", {
          method: "POST",
          auth: true,
          body: JSON.stringify({
            venue: Number(selectedVenueId),
            event: created.id,
            booking_date: startAt.slice(0, 10),
            notes: `Booked for event: ${created.title}`,
          }),
        }).catch(() => {});
      }

      router.push(`/dashboard/events/${created.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not publish event.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 border-b border-[#dfd8ca] pb-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--host-ink-dark)]">
          Host an Event or Party
        </h1>
        <p className="mt-1 text-sm text-[var(--host-ink-dark-muted)]">
          Attach a traceable address or book a listed venue, choose free or paid admission, and generate single-use codes per guest slot.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core Info */}
        <section className="space-y-4 rounded-2xl border border-[#d6cfc2] bg-white p-6">
          <h2 className="text-base font-bold text-[var(--host-ink-dark)]">1. Event Details</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--host-ink-dark)]">
                Event / Party Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Friday Night Backyard Hangout"
                className="w-full rounded-lg border border-[#cbd5e1] px-3.5 py-2 text-sm focus:border-[var(--host-coral)] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--host-ink-dark)]">
                Hosted By (Individual or Group Name)
              </label>
              <input
                type="text"
                required
                value={hostedByLabel}
                onChange={(e) => setHostedByLabel(e.target.value)}
                className="w-full rounded-lg border border-[#cbd5e1] px-3.5 py-2 text-sm focus:border-[var(--host-coral)] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--host-ink-dark)]">
                Category
              </label>
              <input
                type="text"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="House Party, Game Night, Concert..."
                className="w-full rounded-lg border border-[#cbd5e1] px-3.5 py-2 text-sm focus:border-[var(--host-coral)] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--host-ink-dark)]">
                Date & Start Time
              </label>
              <input
                type="datetime-local"
                required
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="w-full rounded-lg border border-[#cbd5e1] px-3.5 py-2 text-sm focus:border-[var(--host-coral)] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--host-ink-dark)]">
                Total Guest Capacity
              </label>
              <input
                type="number"
                min={1}
                required
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full rounded-lg border border-[#cbd5e1] px-3.5 py-2 text-sm focus:border-[var(--host-coral)] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--host-ink-dark)]">
              Description, Vibe & Entry Rules
            </label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell guests what to expect, dress code, gate rules, etc."
              className="w-full rounded-lg border border-[#cbd5e1] px-3.5 py-2 text-sm focus:border-[var(--host-coral)] focus:outline-none"
            />
          </div>
        </section>

        {/* Traceable Location or Listed Venue */}
        <section className="space-y-4 rounded-2xl border border-[#d6cfc2] bg-white p-6">
          <h2 className="text-base font-bold text-[var(--host-ink-dark)]">
            2. Traceable Location or Listed Venue
          </h2>

          {venues.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--host-ink-dark)]">
                Book a Listed Venue (Optional)
              </label>
              <select
                value={selectedVenueId}
                onChange={(e) => handleVenueChange(e.target.value)}
                className="w-full rounded-lg border border-[#cbd5e1] bg-white px-3.5 py-2 text-sm focus:border-[var(--host-coral)] focus:outline-none"
              >
                <option value="">-- Custom House / Own Traceable Spot --</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} — {v.campus_or_area} (Cap: {v.capacity})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--host-ink-dark)]">
                Spot / House Name
              </label>
              <input
                type="text"
                required
                value={locationLabel}
                onChange={(e) => setLocationLabel(e.target.value)}
                placeholder="e.g. White House Lodge, Behind Campus Gate"
                className="w-full rounded-lg border border-[#cbd5e1] px-3.5 py-2 text-sm focus:border-[var(--host-coral)] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--host-ink-dark)]">
                Google Maps / Map Link
              </label>
              <input
                type="url"
                value={mapUrl}
                onChange={(e) => setMapUrl(e.target.value)}
                placeholder="https://maps.google.com/?q=..."
                className="w-full rounded-lg border border-[#cbd5e1] px-3.5 py-2 text-sm focus:border-[var(--host-coral)] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--host-ink-dark)]">
              Full Street / Landmark Directions
            </label>
            <input
              type="text"
              required
              value={locationAddress}
              onChange={(e) => setLocationAddress(e.target.value)}
              placeholder="e.g. Plot 14, Oke-Opa Road, 3 mins from Main Gate"
              className="w-full rounded-lg border border-[#cbd5e1] px-3.5 py-2 text-sm focus:border-[var(--host-coral)] focus:outline-none"
            />
          </div>
        </section>

        {/* Admission, Ticket Categories & Bank Transfer */}
        <section className="space-y-4 rounded-2xl border border-[#d6cfc2] bg-white p-6">
          <h2 className="text-base font-bold text-[var(--host-ink-dark)]">
            3. Admission, Ticket Categories & Payment
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsFree(true)}
              className={`rounded-xl border p-3 text-left ${
                isFree
                  ? "border-[var(--host-coral)] bg-[var(--host-coral-soft)]"
                  : "border-[#cbd5e1] bg-white"
              }`}
            >
              <p className="text-sm font-bold text-[var(--host-ink-dark)]">Free Event (Apply)</p>
              <p className="text-xs text-[var(--host-ink-dark-muted)]">
                Guests apply and get instant single-use entry codes.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setIsFree(false)}
              className={`rounded-xl border p-3 text-left ${
                !isFree
                  ? "border-[var(--host-coral)] bg-[var(--host-coral-soft)]"
                  : "border-[#cbd5e1] bg-white"
              }`}
            >
              <p className="text-sm font-bold text-[var(--host-ink-dark)]">Paid Tickets</p>
              <p className="text-xs text-[var(--host-ink-dark-muted)]">
                Guest uploads transfer proof; you confirm to release codes.
              </p>
            </button>
          </div>

          {!isFree && (
            <div className="rounded-xl border border-[var(--host-navy-border)] bg-[var(--host-navy)] p-4 text-[var(--host-ink-light)]">
              <p className="text-xs font-bold text-white">
                Bank Transfer Account Details (Shown to Ticket Buyers)
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <input
                  type="text"
                  required={!isFree}
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Bank (e.g. OPay)"
                  className="rounded-lg border border-[var(--host-navy-border)] bg-[var(--host-navy-elevated)] px-3 py-2 text-xs text-white focus:border-[var(--host-coral)] focus:outline-none"
                />
                <input
                  type="text"
                  required={!isFree}
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Account Number"
                  className="rounded-lg border border-[var(--host-navy-border)] bg-[var(--host-navy-elevated)] px-3 py-2 text-xs text-white focus:border-[var(--host-coral)] focus:outline-none"
                />
                <input
                  type="text"
                  required={!isFree}
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Account Name"
                  className="rounded-lg border border-[var(--host-navy-border)] bg-[var(--host-navy-elevated)] px-3 py-2 text-xs text-white focus:border-[var(--host-coral)] focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="pt-2">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-[var(--host-ink-dark)]">
              <input
                type="checkbox"
                checked={useCustomCategories}
                onChange={(e) => setUseCustomCategories(e.target.checked)}
                className="h-4 w-4 accent-[var(--host-coral)]"
              />
              <span>Configure Ticket Categories (Regular, Duo, Family, VIP, or Custom)</span>
            </label>
          </div>

          {useCustomCategories && (
            <div className="space-y-3 rounded-xl border border-[#e5dec9] bg-[var(--host-bone)] p-4">
              <div className="flex flex-wrap gap-2">
                {(["regular", "duo", "family", "vip"] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => addPresetCategory(key)}
                    className="rounded-lg border border-[#cbd5e1] bg-white px-2.5 py-1 text-xs font-semibold hover:border-[var(--host-coral)]"
                  >
                    + {PRESET_TEMPLATES[key].name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={addCustomCategory}
                  className="rounded-lg bg-[var(--host-navy)] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[var(--host-coral)]"
                >
                  + Custom Category
                </button>
              </div>

              <div className="space-y-3">
                {ticketCategories.map((cat, idx) => (
                  <div
                    key={idx}
                    className="grid gap-2 rounded-lg border border-[#d6cfc2] bg-white p-3 sm:grid-cols-12"
                  >
                    <input
                      type="text"
                      required
                      value={cat.name}
                      onChange={(e) => updateCategoryRow(idx, "name", e.target.value)}
                      placeholder="Category Name"
                      className="rounded border border-[#cbd5e1] px-2.5 py-1.5 text-xs sm:col-span-4"
                    />
                    <input
                      type="number"
                      min={0}
                      disabled={isFree}
                      value={isFree ? 0 : cat.price}
                      onChange={(e) => updateCategoryRow(idx, "price", e.target.value)}
                      placeholder="Price (NGN)"
                      className="rounded border border-[#cbd5e1] px-2.5 py-1.5 text-xs disabled:bg-slate-100 sm:col-span-3"
                    />
                    <input
                      type="number"
                      min={1}
                      value={cat.guests_per_ticket}
                      onChange={(e) =>
                        updateCategoryRow(idx, "guests_per_ticket", Number(e.target.value))
                      }
                      title="Guests admitted per ticket"
                      placeholder="Guests/ticket"
                      className="rounded border border-[#cbd5e1] px-2.5 py-1.5 text-xs sm:col-span-2"
                    />
                    <input
                      type="number"
                      min={1}
                      value={cat.quota}
                      onChange={(e) => updateCategoryRow(idx, "quota", Number(e.target.value))}
                      title="Ticket quota"
                      placeholder="Quota"
                      className="rounded border border-[#cbd5e1] px-2.5 py-1.5 text-xs sm:col-span-2"
                    />
                    <button
                      type="button"
                      onClick={() => removeCategoryRow(idx)}
                      className="rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 sm:col-span-1"
                    >
                      Del
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-[var(--host-coral)] px-6 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-[var(--host-coral-hover)] disabled:opacity-60"
        >
          {submitting ? "Publishing Event..." : "Publish Event & Generate Access System"}
        </button>
      </form>
    </div>
  );
}