"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { EventItem, GuestRegistrationItem } from "@/lib/types";
import { apiFetch, resolveMediaUrl } from "@/lib/api";
import {
  CalendarIcon,
  ExternalLinkIcon,
  MapPinIcon,
  TicketIcon,
  UsersIcon,
} from "@/components/Icons";

export default function EventDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug;

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [registration, setRegistration] = useState<GuestRegistrationItem | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [paymentNote, setPaymentNote] = useState("");
  const [uploadingProof, setUploadingProof] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    apiFetch<EventItem>(`/events/${slug}/`)
      .then((data) => {
        if (!active) return;
        setEvent(data);
        if (data.ticket_categories?.length > 0) {
          setSelectedCategoryId(data.ticket_categories[0].id);
        }
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Could not load event details.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  const activeCategory = useMemo(() => {
    if (!event?.ticket_categories?.length) return null;
    return (
      event.ticket_categories.find((c) => c.id === selectedCategoryId) ||
      event.ticket_categories[0]
    );
  }, [event, selectedCategoryId]);

  const totalGuests = (activeCategory?.guests_per_ticket || 1) * quantity;
  const totalAmount = event?.is_free
    ? 0
    : Number(activeCategory?.price || 0) * quantity;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    setSubmitting(true);
    setFormError(null);

    try {
      const created = await apiFetch<GuestRegistrationItem>(
        `/events/${event.slug}/register/`,
        {
          method: "POST",
          body: JSON.stringify({
            ticket_category: activeCategory?.id || null,
            quantity,
            full_name: fullName.trim(),
            email: email.trim(),
            phone: phone.trim(),
          }),
        }
      );

      if (created.status === "confirmed") {
        router.push(`/ticket/${created.reference}`);
        return;
      }

      setRegistration(created);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Could not submit your registration.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleProofUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registration || !proofFile) {
      setFormError("Please select a screenshot or photo of your transfer receipt.");
      return;
    }

    setUploadingProof(true);
    setFormError(null);

    try {
      const formData = new FormData();
      formData.append("payment_proof", proofFile);
      formData.append("payment_note", paymentNote.trim());

      const updated = await apiFetch<GuestRegistrationItem>(
        `/registrations/${registration.reference}/proof/`,
        {
          method: "POST",
          body: formData,
        }
      );
      setRegistration(updated);
      router.push(`/ticket/${updated.reference}`);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to upload payment proof.");
    } finally {
      setUploadingProof(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="h-96 animate-pulse rounded-2xl bg-white" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          {error || "Event not found."}
        </div>
      </div>
    );
  }

  const flyerUrl = resolveMediaUrl(event.flyer);
  const formattedStart = new Date(event.start_at).toLocaleString("en-NG", {
    dateStyle: "full",
    timeStyle: "short",
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <Link
          href="/"
          className="text-xs font-semibold uppercase tracking-wide text-[var(--host-ink-dark-muted)] hover:text-[var(--host-coral)]"
        >
          &larr; Back to Discover
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Column: Event Details & Traceable Location */}
        <div className="space-y-6 lg:col-span-7">
          <div className="overflow-hidden rounded-2xl border border-[#d6cfc2] bg-white shadow-sm">
            {flyerUrl && (
              <div className="h-72 w-full bg-[var(--host-navy)] sm:h-80">
                <img
                  src={flyerUrl}
                  alt={event.title}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[var(--host-coral-soft)] px-3 py-1 text-xs font-bold text-[var(--host-coral)]">
                  {event.category}
                </span>
                <span className="rounded-full bg-[var(--host-bone)] px-3 py-1 text-xs font-semibold text-[var(--host-ink-dark)]">
                  {event.is_free ? "Free Entry (Code Required)" : "Paid Ticket"}
                </span>
              </div>

              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-[var(--host-ink-dark)] sm:text-4xl">
                {event.title}
              </h1>
              <p className="mt-1 text-sm font-medium text-[var(--host-ink-dark-muted)]">
                Hosted by <span className="text-[var(--host-ink-dark)]">{event.hosted_by_label}</span>
              </p>

              <div className="mt-6 grid gap-4 rounded-xl border border-[#e7e0d2] bg-[var(--host-bone)] p-4 sm:grid-cols-2">
                <div className="flex items-start gap-2.5 text-sm">
                  <CalendarIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--host-coral)]" />
                  <div>
                    <p className="font-semibold text-[var(--host-ink-dark)]">Date & Time</p>
                    <p className="text-xs text-[var(--host-ink-dark-muted)]">{formattedStart}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-sm">
                  <UsersIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--host-coral)]" />
                  <div>
                    <p className="font-semibold text-[var(--host-ink-dark)]">Capacity</p>
                    <p className="text-xs text-[var(--host-ink-dark-muted)]">
                      {event.capacity} guest slots
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-sm sm:col-span-2">
                  <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--host-coral)]" />
                  <div className="flex-1">
                    <p className="font-semibold text-[var(--host-ink-dark)]">
                      {event.location_label}
                      {event.booked_venue_name ? ` (${event.booked_venue_name})` : ""}
                    </p>
                    <p className="text-xs text-[var(--host-ink-dark-muted)]">
                      {event.location_address}
                    </p>
                    {event.map_url && (
                      <a
                        href={event.map_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-[var(--host-coral)] hover:underline"
                      >
                        Open Exact Location on Map
                        <ExternalLinkIcon className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h2 className="text-base font-bold text-[var(--host-ink-dark)]">About this event</h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[var(--host-ink-dark-muted)]">
                  {event.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Ticket Selection / Application / Bank Transfer Proof */}
        <div className="lg:col-span-5">
          <div className="sticky top-24 rounded-2xl border border-[var(--host-navy-border)] bg-[var(--host-navy)] p-6 text-[var(--host-ink-light)] shadow-lg">
            {!registration ? (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="flex items-center gap-2">
                  <TicketIcon className="h-5 w-5 text-[var(--host-coral)]" />
                  <h2 className="text-lg font-bold">
                    {event.is_free ? "Apply for Entry Code" : "Select Ticket & Register"}
                  </h2>
                </div>
                <p className="text-xs text-[var(--host-ink-light-muted)]">
                  No account signup needed. Every confirmed guest slot receives its own unique single-use QR access code.
                </p>

                {formError && (
                  <div className="rounded-lg border border-red-400/50 bg-red-500/15 p-3 text-xs text-red-200">
                    {formError}
                  </div>
                )}

                {event.ticket_categories.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--host-ink-light-muted)]">
                      Ticket Category
                    </label>
                    <div className="space-y-2">
                      {event.ticket_categories.map((cat) => {
                        const selected = activeCategory?.id === cat.id;
                        const priceNum = Number(cat.price || 0);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setSelectedCategoryId(cat.id)}
                            className={`w-full rounded-xl border p-3 text-left transition-colors ${
                              selected
                                ? "border-[var(--host-coral)] bg-[var(--host-navy-elevated)]"
                                : "border-[var(--host-navy-border)] bg-[var(--host-navy-elevated)]/50 hover:border-slate-500"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-bold text-white">{cat.name}</span>
                              <span className="text-sm font-extrabold text-[var(--host-coral)]">
                                {event.is_free || priceNum === 0
                                  ? "FREE"
                                  : `NGN ${priceNum.toLocaleString()}`}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-[var(--host-ink-light-muted)]">
                              Admits {cat.guests_per_ticket}{" "}
                              {cat.guests_per_ticket === 1 ? "guest" : "guests"} per ticket
                              {cat.description ? ` • ${cat.description}` : ""}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--host-ink-light-muted)]">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      required
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                      className="w-full rounded-lg border border-[var(--host-navy-border)] bg-[var(--host-navy-elevated)] px-3 py-2 text-sm text-white focus:border-[var(--host-coral)] focus:outline-none"
                    />
                  </div>
                  <div className="rounded-lg border border-[var(--host-navy-border)] bg-[var(--host-navy-elevated)] px-3 py-2">
                    <span className="block text-[11px] text-[var(--host-ink-light-muted)]">
                      Total Access Codes
                    </span>
                    <span className="text-base font-bold text-white">
                      {totalGuests} {totalGuests === 1 ? "code" : "codes"}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--host-ink-light-muted)]">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Tunde Adeyemi"
                    className="w-full rounded-lg border border-[var(--host-navy-border)] bg-[var(--host-navy-elevated)] px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-[var(--host-coral)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--host-ink-light-muted)]">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-[var(--host-navy-border)] bg-[var(--host-navy-elevated)] px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-[var(--host-coral)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--host-ink-light-muted)]">
                    WhatsApp / Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08012345678"
                    className="w-full rounded-lg border border-[var(--host-navy-border)] bg-[var(--host-navy-elevated)] px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-[var(--host-coral)] focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-[var(--host-navy-border)] pt-3 text-sm">
                  <span className="text-[var(--host-ink-light-muted)]">Total Due</span>
                  <span className="text-lg font-extrabold text-white">
                    {totalAmount === 0 ? "NGN 0 (Free)" : `NGN ${totalAmount.toLocaleString()}`}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-[var(--host-coral)] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[var(--host-coral-hover)] disabled:opacity-60"
                >
                  {submitting
                    ? "Processing..."
                    : event.is_free
                    ? "Get Instant Access Code"
                    : "Continue to Bank Transfer"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleProofUpload} className="space-y-4">
                <div>
                  <span className="inline-block rounded-full bg-[var(--host-coral-soft)] px-2.5 py-0.5 text-xs font-bold text-[var(--host-coral)]">
                    Step 2 of 2 • Bank Transfer
                  </span>
                  <h2 className="mt-2 text-lg font-bold">Transfer & Upload Proof</h2>
                  <p className="mt-1 text-xs text-[var(--host-ink-light-muted)]">
                    Reference:{" "}
                    <span className="font-mono font-bold text-white">{registration.reference}</span>
                  </p>
                </div>

                {formError && (
                  <div className="rounded-lg border border-red-400/50 bg-red-500/15 p-3 text-xs text-red-200">
                    {formError}
                  </div>
                )}

                <div className="space-y-1.5 rounded-xl border border-[var(--host-navy-border)] bg-[var(--host-navy-elevated)] p-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[var(--host-ink-light-muted)]">Bank Name</span>
                    <span className="font-bold text-white">
                      {registration.payment_instructions?.bank_name || event.bank_name || "Contact Host"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--host-ink-light-muted)]">Account Number</span>
                    <span className="font-mono text-sm font-extrabold text-[var(--host-coral)]">
                      {registration.payment_instructions?.account_number || event.account_number || "Not set"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--host-ink-light-muted)]">Account Name</span>
                    <span className="font-bold text-white">
                      {registration.payment_instructions?.account_name || event.account_name || event.hosted_by_label}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-[var(--host-navy-border)] pt-2">
                    <span className="text-[var(--host-ink-light-muted)]">Amount to Pay</span>
                    <span className="font-extrabold text-white">
                      NGN {Number(registration.total_amount).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--host-ink-light-muted)]">
                    Upload Transfer Receipt (Image)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    required
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                    className="w-full rounded-lg border border-[var(--host-navy-border)] bg-[var(--host-navy-elevated)] px-3 py-2 text-xs text-white file:mr-3 file:rounded file:border-0 file:bg-[var(--host-coral)] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--host-ink-light-muted)]">
                    Sender Name / Narration Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="e.g. Sent from OPay - Tunde A."
                    className="w-full rounded-lg border border-[var(--host-navy-border)] bg-[var(--host-navy-elevated)] px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-[var(--host-coral)] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={uploadingProof}
                  className="w-full rounded-lg bg-[var(--host-coral)] px-4 py-3 text-sm font-bold text-white hover:bg-[var(--host-coral-hover)] disabled:opacity-60"
                >
                  {uploadingProof ? "Uploading Receipt..." : "Submit Payment Proof"}
                </button>

                <Link
                  href={`/ticket/${registration.reference}`}
                  className="block text-center text-xs text-[var(--host-ink-light-muted)] underline hover:text-white"
                >
                  Save reference & check status later
                </Link>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}