"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { setAuthTokens } from "@/lib/auth";
import { BrandMarkIcon } from "@/components/Icons";

export default function HostRegisterPage() {
  const router = useRouter();
  const [hostType, setHostType] = useState<"individual" | "group">("individual");
  const [displayName, setDisplayName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [defaultBankName, setDefaultBankName] = useState("");
  const [defaultAccountNumber, setDefaultAccountNumber] = useState("");
  const [defaultAccountName, setDefaultAccountName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await apiFetch("/auth/register/", {
        method: "POST",
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password,
          display_name: displayName.trim(),
          host_type: hostType,
          group_name: hostType === "group" ? groupName.trim() : "",
          phone_number: phoneNumber.trim(),
          default_bank_name: defaultBankName.trim(),
          default_account_number: defaultAccountNumber.trim(),
          default_account_name: defaultAccountName.trim(),
        }),
      });

      const tokens = await apiFetch<{ access: string; refresh: string }>("/auth/login/", {
        method: "POST",
        body: JSON.stringify({ username: username.trim(), password }),
      });
      setAuthTokens(tokens.access, tokens.refresh);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not create host account.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <div className="rounded-2xl border border-[var(--host-navy-border)] bg-[var(--host-navy)] p-7 text-[var(--host-ink-light)] shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--host-coral)] text-white">
            <BrandMarkIcon className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold">Create a Host Account</h1>
            <p className="text-xs text-[var(--host-ink-light-muted)]">
              Host campus parties, house hangouts, or group events with printable & scannable access codes.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-400/50 bg-red-500/15 p-3 text-xs text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--host-ink-light-muted)]">
              Hosting As
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(["individual", "group"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setHostType(type)}
                  className={`rounded-lg border px-3 py-2 text-xs font-bold uppercase tracking-wide ${
                    hostType === type
                      ? "border-[var(--host-coral)] bg-[var(--host-coral-soft)] text-white"
                      : "border-[var(--host-navy-border)] bg-[var(--host-navy-elevated)] text-[var(--host-ink-light-muted)]"
                  }`}
                >
                  {type === "individual" ? "Individual" : "Group / Collective"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--host-ink-light-muted)]">
                Your Name
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Chinedu Okafor"
                className="w-full rounded-lg border border-[var(--host-navy-border)] bg-[var(--host-navy-elevated)] px-3.5 py-2.5 text-sm text-white focus:border-[var(--host-coral)] focus:outline-none"
              />
            </div>

            {hostType === "group" ? (
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--host-ink-light-muted)]">
                  Group / Crew Name
                </label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Midnight Campus Crew"
                  className="w-full rounded-lg border border-[var(--host-navy-border)] bg-[var(--host-navy-elevated)] px-3.5 py-2.5 text-sm text-white focus:border-[var(--host-coral)] focus:outline-none"
                />
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--host-ink-light-muted)]">
                  Phone / WhatsApp
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="08012345678"
                  className="w-full rounded-lg border border-[var(--host-navy-border)] bg-[var(--host-navy-elevated)] px-3.5 py-2.5 text-sm text-white focus:border-[var(--host-coral)] focus:outline-none"
                />
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--host-ink-light-muted)]">
                Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-[var(--host-navy-border)] bg-[var(--host-navy-elevated)] px-3.5 py-2.5 text-sm text-white focus:border-[var(--host-coral)] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--host-ink-light-muted)]">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-[var(--host-navy-border)] bg-[var(--host-navy-elevated)] px-3.5 py-2.5 text-sm text-white focus:border-[var(--host-coral)] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--host-ink-light-muted)]">
              Password (minimum 8 characters)
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[var(--host-navy-border)] bg-[var(--host-navy-elevated)] px-3.5 py-2.5 text-sm text-white focus:border-[var(--host-coral)] focus:outline-none"
            />
          </div>

          <div className="rounded-xl border border-[var(--host-navy-border)] bg-[var(--host-navy-elevated)]/60 p-4">
            <p className="text-xs font-bold text-white">
              Default Payout Bank Account (Optional — for paid tickets)
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--host-ink-light-muted)]">
              Pre-fills when you host paid events via Bank Transfer (OPay, PalmPay, Moniepoint, GTBank, etc.).
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <input
                type="text"
                value={defaultBankName}
                onChange={(e) => setDefaultBankName(e.target.value)}
                placeholder="Bank (e.g. OPay)"
                className="rounded-lg border border-[var(--host-navy-border)] bg-[var(--host-navy)] px-3 py-2 text-xs text-white focus:border-[var(--host-coral)] focus:outline-none"
              />
              <input
                type="text"
                value={defaultAccountNumber}
                onChange={(e) => setDefaultAccountNumber(e.target.value)}
                placeholder="Account Number"
                className="rounded-lg border border-[var(--host-navy-border)] bg-[var(--host-navy)] px-3 py-2 text-xs text-white focus:border-[var(--host-coral)] focus:outline-none"
              />
              <input
                type="text"
                value={defaultAccountName}
                onChange={(e) => setDefaultAccountName(e.target.value)}
                placeholder="Account Name"
                className="rounded-lg border border-[var(--host-navy-border)] bg-[var(--host-navy)] px-3 py-2 text-xs text-white focus:border-[var(--host-coral)] focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-[var(--host-coral)] px-4 py-3 text-sm font-bold text-white hover:bg-[var(--host-coral-hover)] disabled:opacity-60"
          >
            {submitting ? "Creating Account..." : "Create Host Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[var(--host-ink-light-muted)]">
          Already have a host account?{" "}
          <Link href="/login" className="font-bold text-[var(--host-coral)] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}