"use client";

import React, { useEffect, useState } from "react";
import { CloseIcon } from "./Icons";

const DISMISS_KEY = "host_dev_notice_dismissed_v1";

export default function DevNoticeBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(DISMISS_KEY);
    setDismissed(saved === "true");
  }, []);

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "true");
    setDismissed(true);
  };

  return (
    <div
      role="status"
      className="no-print border-b border-[var(--host-navy-border)] bg-[var(--host-navy-elevated)] text-[var(--host-ink-light)]"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 text-xs sm:px-6">
        <p className="text-[var(--host-ink-light-muted)]">
          <span className="font-semibold text-[var(--host-coral)]">Campus Beta:</span>{" "}
          Development is ongoing and structure or strategy may change.
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss development notice"
          className="rounded p-1 text-[var(--host-ink-light-muted)] hover:bg-white/10 hover:text-white"
        >
          <CloseIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}