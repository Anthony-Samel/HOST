"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { EventItem } from "@/lib/types";
import { apiFetch } from "@/lib/api";
import {
  GateManifestCode,
  loadGateManifest,
  loadPendingCheckins,
  OfflineGateManifest,
  saveGateManifest,
  savePendingCheckins,
  verifyCodeOffline,
} from "@/lib/offlineGate";
import QrScannerModal from "@/components/QrScannerModal";
import { QrCodeIcon } from "@/components/Icons";

interface CheckinFeedback {
  valid: boolean;
  reason: string;
  code?: string;
  guestName?: string;
  ticketLabel?: string;
}

export default function GateCheckinPage() {
  const searchParams = useSearchParams();
  const initialEventId = Number(searchParams?.get("event") || 0);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number>(initialEventId);
  const [manifest, setManifest] = useState<OfflineGateManifest | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  const [codeInput, setCodeInput] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [feedback, setFeedback] = useState<CheckinFeedback | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const refreshLocalState = useCallback((evId: number) => {
    if (!evId) return;
    setManifest(loadGateManifest(evId));
    setPendingCount(loadPendingCheckins(evId).length);
  }, []);

  const downloadManifest = useCallback(
    async (evId: number) => {
      if (!evId) return;
      try {
        const data = await apiFetch<OfflineGateManifest>(
          `/events/${evId}/gate-manifest/`,
          { auth: true }
        );
        saveGateManifest(evId, data);
        setManifest(data);
      } catch {
        // Keep cached manifest if offline
        setManifest(loadGateManifest(evId));
      }
    },
    []
  );

  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    apiFetch<EventItem[]>("/events/?mine=true", { auth: true })
      .then((list) => {
        setEvents(list);
        const targetId = initialEventId || list[0]?.id || 0;
        if (targetId) {
          setSelectedEventId(targetId);
          refreshLocalState(targetId);
          downloadManifest(targetId);
        }
      })
      .catch(() => {});

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [initialEventId, downloadManifest, refreshLocalState]);

  const handleSelectEvent = (evId: number) => {
    setSelectedEventId(evId);
    setFeedback(null);
    refreshLocalState(evId);
    downloadManifest(evId);
  };

  const verifyCode = useCallback(
    async (rawCode: string) => {
      const clean = rawCode.trim().toUpperCase();
      if (!clean || !selectedEventId) return;
      setSubmitting(true);
      setFeedback(null);

      try {
        const res = await apiFetch<{
          valid: boolean;
          reason: string;
          code?: GateManifestCode;
        }>("/access-codes/verify/", {
          method: "POST",
          auth: true,
          body: JSON.stringify({ code: clean, event_id: selectedEventId }),
        });

        setFeedback({
          valid: res.valid,
          reason: res.reason,
          code: res.code?.code || clean,
          guestName: res.code?.guest_name,
          ticketLabel: res.code?.ticket_label,
        });
        await downloadManifest(selectedEventId);
        refreshLocalState(selectedEventId);
      } catch (err: unknown) {
        // Network error / offline fallback: verify against cached manifest
        const isNetworkFailure =
          !navigator.onLine ||
          (err instanceof Error && err.message.toLowerCase().includes("fetch"));

        if (isNetworkFailure) {
          const offlineRes = verifyCodeOffline(selectedEventId, clean);
          setFeedback({
            valid: offlineRes.valid,
            reason: offlineRes.reason,
            code: offlineRes.entry?.code || clean,
            guestName: offlineRes.entry?.guest_name,
            ticketLabel: offlineRes.entry?.ticket_label,
          });
          refreshLocalState(selectedEventId);
        } else {
          setFeedback({
            valid: false,
            reason: err instanceof Error ? err.message : "Code rejected.",
            code: clean,
          });
        }
      } finally {
        setSubmitting(false);
        setCodeInput("");
      }
    },
    [selectedEventId, downloadManifest, refreshLocalState]
  );

  const handleSyncOffline = async () => {
    if (!selectedEventId) return;
    const pending = loadPendingCheckins(selectedEventId);
    if (pending.length === 0) return;

    setSyncing(true);
    try {
      await apiFetch("/access-codes/sync-checkins/", {
        method: "POST",
        auth: true,
        body: JSON.stringify({ checkins: pending }),
      });
      savePendingCheckins(selectedEventId, []);
      await downloadManifest(selectedEventId);
      refreshLocalState(selectedEventId);
    } finally {
      setSyncing(false);
    }
  };

  const filteredCodes = useMemo(() => {
    const list = manifest?.codes || [];
    const q = codeInput.trim().toUpperCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.code.toUpperCase().includes(q) ||
        c.guest_name.toUpperCase().includes(q) ||
        c.registration_reference.toUpperCase().includes(q)
    );
  }, [manifest, codeInput]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-[#dfd8ca] pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--host-ink-dark)]">
            Gate Check-In & QR Scanner
          </h1>
          <p className="mt-1 text-sm text-[var(--host-ink-dark-muted)]">
            Scan QR codes, type or search an access code, and verify single-use entry even without network signal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              isOnline
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {isOnline ? "Online" : "Offline Mode"}
          </span>

          {pendingCount > 0 && (
            <button
              type="button"
              disabled={syncing}
              onClick={handleSyncOffline}
              className="rounded-lg bg-[var(--host-coral)] px-3 py-1.5 text-xs font-bold text-white hover:bg-[var(--host-coral-hover)]"
            >
              {syncing ? "Syncing..." : `Sync ${pendingCount} Offline Check-In(s)`}
            </button>
          )}
        </div>
      </div>

      {/* Event Selector + Scan / Type Controls */}
      <div className="rounded-2xl border border-[var(--host-navy-border)] bg-[var(--host-navy)] p-6 text-[var(--host-ink-light)]">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--host-ink-light-muted)]">
              Select Event
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => handleSelectEvent(Number(e.target.value))}
              className="w-full rounded-lg border border-[var(--host-navy-border)] bg-[var(--host-navy-elevated)] px-3.5 py-2.5 text-sm text-white focus:border-[var(--host-coral)] focus:outline-none"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--host-coral)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--host-coral-hover)]"
            >
              <QrCodeIcon className="h-4 w-4" />
              <span>Scan QR Code</span>
            </button>

            <button
              type="button"
              onClick={() => downloadManifest(selectedEventId)}
              className="shrink-0 rounded-lg border border-[var(--host-navy-border)] bg-[var(--host-navy-elevated)] px-3.5 py-2.5 text-xs font-semibold text-white hover:border-[var(--host-coral)]"
            >
              Cache List
            </button>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            verifyCode(codeInput);
          }}
          className="mt-4 flex flex-col gap-3 sm:flex-row"
        >
          <input
            type="text"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder="Type or search access code (e.g. E1-9X4K2P) or guest name..."
            className="flex-1 rounded-lg border border-[var(--host-navy-border)] bg-[var(--host-navy-elevated)] px-4 py-2.5 font-mono text-sm uppercase text-white placeholder:font-sans placeholder:normal-case placeholder:text-slate-400 focus:border-[var(--host-coral)] focus:outline-none"
          />
          <button
            type="submit"
            disabled={submitting || !codeInput.trim()}
            className="rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-[var(--host-ink-dark)] hover:bg-[var(--host-bone)] disabled:opacity-50"
          >
            {submitting ? "Checking..." : "Verify & Admit"}
          </button>
        </form>

        {feedback && (
          <div
            role="alert"
            className={`mt-4 rounded-xl border p-4 text-sm ${
              feedback.valid
                ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-100"
                : "border-red-400/50 bg-red-500/15 text-red-100"
            }`}
          >
            <p className="font-extrabold">
              {feedback.valid ? "APPROVED FOR ENTRY" : "ENTRY DENIED"} —{" "}
              {feedback.reason}
            </p>
            {(feedback.code || feedback.guestName) && (
              <p className="mt-1 text-xs opacity-90">
                {feedback.code ? `Code: ${feedback.code}` : ""}{" "}
                {feedback.guestName ? `• Guest: ${feedback.guestName}` : ""}{" "}
                {feedback.ticketLabel ? `• ${feedback.ticketLabel}` : ""}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Cached Guest Code Directory for Quick Search / Tap-to-Verify */}
      <div className="rounded-2xl border border-[#d6cfc2] bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--host-ink-dark)]">
            Event Access Codes ({filteredCodes.length})
          </h2>
          {manifest?.synced_at && (
            <span className="text-xs text-[var(--host-ink-dark-muted)]">
              Cached: {new Date(manifest.synced_at).toLocaleTimeString("en-NG")}
            </span>
          )}
        </div>

        <div className="divide-y divide-[#ece6da]">
          {filteredCodes.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs"
            >
              <div>
                <span className="font-mono text-sm font-extrabold text-[var(--host-ink-dark)]">
                  {item.code}
                </span>
                <span className="ml-2 font-semibold text-[var(--host-ink-dark)]">
                  {item.guest_name}
                </span>
                <span className="ml-2 text-[var(--host-ink-dark-muted)]">
                  ({item.ticket_label} &bull; Slot #{item.slot_number})
                </span>
              </div>

              <div className="flex items-center gap-2">
                {item.is_used ? (
                  <span className="rounded-full bg-slate-200 px-2.5 py-0.5 font-bold text-slate-700">
                    Used
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => verifyCode(item.code)}
                    className="rounded-lg bg-[var(--host-navy)] px-3 py-1 font-bold text-white hover:bg-[var(--host-coral)]"
                  >
                    Mark Used
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <QrScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(decoded) => verifyCode(decoded)}
      />
    </div>
  );
}