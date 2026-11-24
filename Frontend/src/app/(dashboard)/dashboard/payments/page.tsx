"use client";

import React, { useCallback, useEffect, useState } from "react";
import { EventItem, GuestRegistrationItem } from "@/lib/types";
import { apiFetch, resolveMediaUrl } from "@/lib/api";

interface RegistrationWithEvent extends GuestRegistrationItem {
  eventSlug?: string;
}

export default function PaymentsQueuePage() {
  const [items, setItems] = useState<RegistrationWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const events = await apiFetch<EventItem[]>("/events/?mine=true", {
        auth: true,
      });
      const perEvent = await Promise.all(
        events.map(async (ev) => {
          const regs = await apiFetch<GuestRegistrationItem[]>(
            `/events/${ev.id}/registrations/`,
            { auth: true }
          );
          return regs.map((r) => ({ ...r, eventSlug: ev.slug }));
        })
      );
      const flattened = perEvent
        .flat()
        .filter((r) => Number(r.total_amount || 0) > 0 || r.payment_proof);
      setItems(flattened);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Could not load payment queue."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const handleAction = async (regId: number, action: "confirm" | "reject") => {
    setBusyId(regId);
    setError(null);
    try {
      await apiFetch(`/registrations/${regId}/decision/`, {
        method: "POST",
        auth: true,
        body: JSON.stringify({ action }),
      });
      await loadQueue();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="border-b border-[#dfd8ca] pb-4">
        <h1 className="text-2xl font-extrabold text-[var(--host-ink-dark)]">
          Payments & Transfer Proofs
        </h1>
        <p className="mt-1 text-sm text-[var(--host-ink-dark-muted)]">
          Review guest bank transfer proofs. Single-use access codes are released only after you confirm payment.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-56 animate-pulse rounded-2xl bg-white" />
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-[#d6cfc2] bg-white p-10 text-center text-sm text-[var(--host-ink-dark-muted)]">
          No paid ticket registrations or transfer proofs submitted yet.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((reg) => {
            const proofUrl = resolveMediaUrl(reg.payment_proof);
            return (
              <div
                key={reg.id}
                className="flex flex-col justify-between rounded-xl border border-[#d6cfc2] bg-white p-5 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-[var(--host-coral)]">
                      {reg.reference}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                        reg.status === "confirmed"
                          ? "bg-emerald-100 text-emerald-800"
                          : reg.status === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {reg.status.replace("_", " ")}
                    </span>
                  </div>

                  <h2 className="mt-1.5 text-base font-extrabold text-[var(--host-ink-dark)]">
                    {reg.event_title}
                  </h2>
                  <p className="text-xs text-[var(--host-ink-dark-muted)]">
                    <strong>{reg.full_name}</strong> ({reg.phone}) &bull;{" "}
                    {reg.ticket_category_name} &times; {reg.quantity} ({reg.guest_slots}{" "}
                    slots)
                  </p>
                  <p className="mt-2 text-sm font-extrabold text-[var(--host-ink-dark)]">
                    NGN {Number(reg.total_amount).toLocaleString()}
                  </p>
                  {reg.payment_note && (
                    <p className="mt-1 text-xs text-[var(--host-ink-dark-muted)]">
                      Note: {reg.payment_note}
                    </p>
                  )}

                  {proofUrl && (
                    <div className="mt-3 overflow-hidden rounded-lg border border-[#e2dcd0] bg-[var(--host-bone)]">
                      <a href={proofUrl} target="_blank" rel="noopener noreferrer">
                        <img
                          src={proofUrl}
                          alt={`Payment proof for ${reg.reference}`}
                          className="max-h-48 w-full object-contain"
                        />
                      </a>
                    </div>
                  )}
                </div>

                {reg.status !== "confirmed" && (
                  <div className="mt-4 flex gap-2 border-t border-[#ece6da] pt-3">
                    <button
                      type="button"
                      disabled={busyId === reg.id}
                      onClick={() => handleAction(reg.id, "confirm")}
                      className="flex-1 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                    >
                      Confirm & Release Code(s)
                    </button>
                    {reg.status !== "rejected" && (
                      <button
                        type="button"
                        disabled={busyId === reg.id}
                        onClick={() => handleAction(reg.id, "reject")}
                        className="rounded-lg border border-red-300 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}