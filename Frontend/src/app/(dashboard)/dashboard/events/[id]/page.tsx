"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  AccessCodeItem,
  EventItem,
  GuestRegistrationItem,
} from "@/lib/types";
import { apiFetch, resolveMediaUrl } from "@/lib/api";

export default function EventManagePage() {
  const params = useParams<{ id: string }>();
  const eventId = Number(params?.id);

  const [event, setEvent] = useState<EventItem | null>(null);
  const [registrations, setRegistrations] = useState<GuestRegistrationItem[]>([]);
  const [accessCodes, setAccessCodes] = useState<AccessCodeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const [allMine, regs, codes] = await Promise.all([
        apiFetch<EventItem[]>("/events/?mine=true", { auth: true }),
        apiFetch<GuestRegistrationItem[]>(`/events/${eventId}/registrations/`, {
          auth: true,
        }),
        apiFetch<AccessCodeItem[]>(`/events/${eventId}/access-codes/`, {
          auth: true,
        }),
      ]);
      const found = allMine.find((e) => e.id === eventId) || null;
      setEvent(found);
      setRegistrations(regs);
      setAccessCodes(codes);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Could not load event roster."
      );
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDecision = async (regId: number, action: "confirm" | "reject") => {
    setBusyId(regId);
    setError(null);
    try {
      await apiFetch(`/registrations/${regId}/decision/`, {
        method: "POST",
        auth: true,
        body: JSON.stringify({ action }),
      });
      await loadData();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Could not update registration."
      );
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <div className="h-72 animate-pulse rounded-2xl bg-white" />;
  }

  if (error || !event) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
        {error || "Event not found in your host account."}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="no-print flex flex-col justify-between gap-4 border-b border-[#dfd8ca] pb-5 sm:flex-row sm:items-center">
        <div>
          <Link
            href="/dashboard"
            className="text-xs font-semibold uppercase tracking-wide text-[var(--host-ink-dark-muted)] hover:text-[var(--host-coral)]"
          >
            &larr; My Events
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold text-[var(--host-ink-dark)]">
            {event.title}
          </h1>
          <p className="text-xs text-[var(--host-ink-dark-muted)]">
            {event.location_label} &bull; {accessCodes.length} single-use code(s) issued
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href={`/dashboard/checkin?event=${event.id}`}
            className="rounded-lg bg-[var(--host-navy)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--host-coral)]"
          >
            Open Gate Scanner
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-[var(--host-coral)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--host-coral-hover)]"
          >
            Print Access Code List
          </button>
        </div>
      </div>

      {/* Registrations & Bank Proof Approval Table (Hidden when printing the code sheet) */}
      <section className="no-print space-y-3 rounded-2xl border border-[#d6cfc2] bg-white p-5">
        <h2 className="text-base font-bold text-[var(--host-ink-dark)]">
          Guest Applications & Payment Proofs ({registrations.length})
        </h2>

        {registrations.length === 0 ? (
          <p className="py-4 text-sm text-[var(--host-ink-dark-muted)]">
            No guest registrations yet. Share{" "}
            <Link
              href={`/events/${event.slug}`}
              className="font-semibold text-[var(--host-coral)] underline"
            >
              /events/{event.slug}
            </Link>{" "}
            with attendees.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#ece6da] text-[var(--host-ink-dark-muted)]">
                  <th className="py-2.5 pr-3">Guest</th>
                  <th className="py-2.5 pr-3">Ticket & Slots</th>
                  <th className="py-2.5 pr-3">Amount</th>
                  <th className="py-2.5 pr-3">Proof</th>
                  <th className="py-2.5 pr-3">Status</th>
                  <th className="py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1ece1]">
                {registrations.map((reg) => {
                  const proofUrl = resolveMediaUrl(reg.payment_proof);
                  return (
                    <tr key={reg.id}>
                      <td className="py-3 pr-3">
                        <p className="font-bold text-[var(--host-ink-dark)]">
                          {reg.full_name}
                        </p>
                        <p className="text-[var(--host-ink-dark-muted)]">
                          {reg.phone} &bull; <span className="font-mono">{reg.reference}</span>
                        </p>
                      </td>
                      <td className="py-3 pr-3">
                        <p className="font-semibold">{reg.ticket_category_name}</p>
                        <p className="text-[var(--host-ink-dark-muted)]">
                          {reg.quantity} ticket(s) &rarr; {reg.guest_slots} code(s)
                        </p>
                      </td>
                      <td className="py-3 pr-3 font-bold">
                        NGN {Number(reg.total_amount).toLocaleString()}
                      </td>
                      <td className="py-3 pr-3">
                        {proofUrl ? (
                          <a
                            href={proofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-[var(--host-coral)] underline"
                          >
                            View Proof
                          </a>
                        ) : (
                          <span className="text-[var(--host-ink-dark-muted)]">
                            {reg.payment_note || "—"}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 font-bold uppercase ${
                            reg.status === "confirmed"
                              ? "bg-emerald-100 text-emerald-800"
                              : reg.status === "rejected"
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {reg.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {reg.status !== "confirmed" && (
                          <div className="inline-flex gap-2">
                            <button
                              type="button"
                              disabled={busyId === reg.id}
                              onClick={() => handleDecision(reg.id, "confirm")}
                              className="rounded bg-emerald-700 px-2.5 py-1 font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                            >
                              Confirm & Release Codes
                            </button>
                            {reg.status !== "rejected" && (
                              <button
                                type="button"
                                disabled={busyId === reg.id}
                                onClick={() => handleDecision(reg.id, "reject")}
                                className="rounded border border-red-300 px-2.5 py-1 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Printable Access Code Sheet */}
      <section className="space-y-4 rounded-2xl border border-[#d6cfc2] bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ece6da] pb-3">
          <div>
            <h2 className="text-lg font-extrabold text-[var(--host-ink-dark)]">
              Printable Single-Use Access Code Roster — {event.title}
            </h2>
            <p className="text-xs text-[var(--host-ink-dark-muted)]">
              Each code admits 1 guest slot and can only be marked used once.
            </p>
          </div>
          <span className="text-xs font-bold text-[var(--host-ink-dark)]">
            {accessCodes.filter((c) => c.is_used).length} / {accessCodes.length} Used
          </span>
        </div>

        {accessCodes.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--host-ink-dark-muted)]">
            No confirmed access codes generated yet. Confirm guest applications or bank transfer proofs above to release codes.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accessCodes.map((ac) => (
              <div
                key={ac.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#d6cfc2] bg-[var(--host-bone)] p-3.5"
              >
                <div className="min-w-0">
                  <p className="font-mono text-base font-extrabold tracking-wider text-[var(--host-ink-dark)]">
                    {ac.code}
                  </p>
                  <p className="truncate text-xs font-bold text-[var(--host-ink-dark)]">
                    {ac.guest_name} (Slot #{ac.slot_number})
                  </p>
                  <p className="truncate text-[11px] text-[var(--host-ink-dark-muted)]">
                    {ac.ticket_label} &bull; {ac.guest_phone}
                  </p>
                  <span
                    className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                      ac.is_used
                        ? "bg-slate-300 text-slate-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {ac.is_used ? "Used" : "Unused"}
                  </span>
                </div>

                <div className="shrink-0 rounded bg-white p-1.5">
                  <QRCodeSVG value={ac.code} size={68} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}