"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { GuestRegistrationItem } from "@/lib/types";
import { apiFetch } from "@/lib/api";
import { QrCodeIcon, TicketIcon } from "@/components/Icons";

export default function TicketLookupPage() {
  const params = useParams<{ reference: string }>();
  const router = useRouter();
  const routeRef = params?.reference || "";

  const [lookupInput, setLookupInput] = useState(
    routeRef && routeRef !== "lookup" ? routeRef : ""
  );
  const [registration, setRegistration] = useState<GuestRegistrationItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [paymentNote, setPaymentNote] = useState("");
  const [uploading, setUploading] = useState(false);

  const fetchByReference = async (refCode: string) => {
    const clean = refCode.trim().toUpperCase();
    if (!clean || clean === "LOOKUP") return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<GuestRegistrationItem>(`/registrations/${clean}/`);
      setRegistration(data);
    } catch (err: unknown) {
      setRegistration(null);
      setError(err instanceof Error ? err.message : "No ticket found for that reference.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (routeRef && routeRef !== "lookup") {
      setLookupInput(routeRef.toUpperCase());
      fetchByReference(routeRef);
    }
  }, [routeRef]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = lookupInput.trim().toUpperCase();
    if (!clean) return;
    router.push(`/ticket/${clean}`);
  };

  const handleProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registration || !proofFile) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("payment_proof", proofFile);
      fd.append("payment_note", paymentNote.trim());
      const updated = await apiFetch<GuestRegistrationItem>(
        `/registrations/${registration.reference}/proof/`,
        { method: "POST", body: fd }
      );
      setRegistration(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not upload proof.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="no-print rounded-2xl border border-[var(--host-navy-border)] bg-[var(--host-navy)] p-6 text-[var(--host-ink-light)]">
        <div className="flex items-center gap-2">
          <TicketIcon className="h-5 w-5 text-[var(--host-coral)]" />
          <h1 className="text-xl font-bold">Retrieve Your Access Codes</h1>
        </div>
        <p className="mt-1 text-xs text-[var(--host-ink-light-muted)]">
          Enter your booking reference (e.g. HST-8A2F9C1B) to view payment status or display your QR entry codes.
        </p>

        <form onSubmit={handleSearch} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={lookupInput}
            onChange={(e) => setLookupInput(e.target.value)}
            placeholder="HST-XXXXXXXX"
            className="flex-1 rounded-lg border border-[var(--host-navy-border)] bg-[var(--host-navy-elevated)] px-4 py-2.5 font-mono text-sm uppercase text-white placeholder:text-slate-400 focus:border-[var(--host-coral)] focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-[var(--host-coral)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--host-coral-hover)]"
          >
            Find Ticket
          </button>
        </form>
      </div>

      {loading && (
        <div className="mt-6 h-56 animate-pulse rounded-2xl bg-white" />
      )}

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {registration && !loading && (
        <div className="mt-8 space-y-6">
          <div className="rounded-2xl border border-[#d6cfc2] bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#ece6da] pb-4">
              <div>
                <span className="font-mono text-xs font-bold text-[var(--host-coral)]">
                  REF: {registration.reference}
                </span>
                <h2 className="mt-1 text-2xl font-extrabold text-[var(--host-ink-dark)]">
                  {registration.event_title}
                </h2>
                <p className="text-sm text-[var(--host-ink-dark-muted)]">
                  Guest: <strong className="text-[var(--host-ink-dark)]">{registration.full_name}</strong> ({registration.ticket_category_name} &times; {registration.quantity})
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                    registration.status === "confirmed"
                      ? "bg-emerald-100 text-emerald-800"
                      : registration.status === "rejected"
                      ? "bg-red-100 text-red-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {registration.status.replace("_", " ")}
                </span>

                {registration.status === "confirmed" && (
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="no-print rounded-lg border border-[#cbd5e1] px-3 py-1.5 text-xs font-semibold text-[var(--host-ink-dark)] hover:border-[var(--host-coral)]"
                  >
                    Print Passes
                  </button>
                )}
              </div>
            </div>

            {registration.status === "pending_payment" && (
              <form onSubmit={handleProofSubmit} className="mt-5 space-y-3 rounded-xl bg-[var(--host-bone)] p-4">
                <p className="text-sm font-bold text-[var(--host-ink-dark)]">
                  Payment proof not uploaded yet
                </p>
                <p className="text-xs text-[var(--host-ink-dark-muted)]">
                  Upload your transfer receipt so the host can confirm your payment and release your access code(s).
                </p>
                <input
                  type="file"
                  accept="image/*"
                  required
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-[var(--host-ink-dark)]"
                />
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Sender name or transfer note"
                  className="w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={uploading}
                  className="rounded-lg bg-[var(--host-coral)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--host-coral-hover)]"
                >
                  {uploading ? "Uploading..." : "Upload Receipt"}
                </button>
              </form>
            )}

            {registration.status === "proof_submitted" && (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Your payment proof has been submitted. Once the host confirms your transfer, your unique single-use QR access codes will appear right here.
              </div>
            )}

            {registration.status === "rejected" && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                This registration was declined by the host. Reach out to the host directly if you believe this was an error.
              </div>
            )}

            {registration.status === "confirmed" && (
              <div className="mt-6">
                <div className="mb-4 flex items-center gap-2">
                  <QrCodeIcon className="h-4 w-4 text-[var(--host-coral)]" />
                  <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--host-ink-dark)]">
                    Single-Use Entry Passes ({registration.access_codes.length})
                  </h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {registration.access_codes.map((ac) => (
                    <div
                      key={ac.id}
                      className="flex items-center justify-between gap-4 rounded-xl border border-[#d6cfc2] bg-[var(--host-bone)] p-4"
                    >
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold uppercase text-[var(--host-coral)]">
                          Guest Slot #{ac.slot_number} • {ac.ticket_label}
                        </span>
                        <p className="font-mono text-lg font-extrabold tracking-wider text-[var(--host-ink-dark)]">
                          {ac.code}
                        </p>
                        <p className="text-xs text-[var(--host-ink-dark-muted)]">
                          {ac.is_used ? "USED AT GATE" : "Valid for 1 entry only"}
                        </p>
                      </div>

                      <div className="shrink-0 rounded-lg bg-white p-2 shadow-xs">
                        <QRCodeSVG value={ac.code} size={92} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}