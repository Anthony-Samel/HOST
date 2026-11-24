"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { setAuthTokens } from "@/lib/auth";
import { BrandMarkIcon } from "@/components/Icons";

interface TokenResponse {
  access: string;
  refresh: string;
}

export default function HostLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const tokens = await apiFetch<TokenResponse>("/auth/login/", {
        method: "POST",
        body: JSON.stringify({ username: username.trim(), password }),
      });
      setAuthTokens(tokens.access, tokens.refresh);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Invalid username or password."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-14 sm:px-6">
      <div className="rounded-2xl border border-[var(--host-navy-border)] bg-[var(--host-navy)] p-7 text-[var(--host-ink-light)] shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--host-coral)] text-white">
            <BrandMarkIcon className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold">Host Sign In</h1>
            <p className="text-xs text-[var(--host-ink-light-muted)]">
              Attendees do not need an account—only event hosts sign in.
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
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[var(--host-navy-border)] bg-[var(--host-navy-elevated)] px-3.5 py-2.5 text-sm text-white focus:border-[var(--host-coral)] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-[var(--host-coral)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--host-coral-hover)] disabled:opacity-60"
          >
            {submitting ? "Signing in..." : "Sign In to Dashboard"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[var(--host-ink-light-muted)]">
          New individual or group host?{" "}
          <Link href="/register" className="font-bold text-[var(--host-coral)] hover:underline">
            Create a Host Account
          </Link>
        </p>
      </div>
    </div>
  );
}