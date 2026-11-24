"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearAuthTokens, getAccessToken } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { HostProfileData } from "@/lib/types";
import {
  BrandMarkIcon,
  CalendarIcon,
  CloseIcon,
  MapPinIcon,
  MenuIcon,
  QrCodeIcon,
  TicketIcon,
} from "./Icons";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profile, setProfile] = useState<HostProfileData | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    let active = true;
    apiFetch<HostProfileData>("/auth/me/", { auth: true })
      .then((data) => {
        if (!active) return;
        setProfile(data);
        setAuthChecked(true);
      })
      .catch(() => {
        if (!active) return;
        clearAuthTokens();
        router.replace("/login");
      });

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const navItems: NavItem[] = [
    {
      href: "/dashboard",
      label: "My Events",
      icon: <CalendarIcon className="h-4 w-4" />,
    },
    {
      href: "/dashboard/events/new",
      label: "Host an Event",
      icon: <TicketIcon className="h-4 w-4" />,
    },
    {
      href: "/dashboard/payments",
      label: "Payments & Proofs",
      icon: <TicketIcon className="h-4 w-4" />,
    },
    {
      href: "/dashboard/checkin",
      label: "Gate Check-In",
      icon: <QrCodeIcon className="h-4 w-4" />,
    },
    {
      href: "/dashboard/venues",
      label: "Venues",
      icon: <MapPinIcon className="h-4 w-4" />,
    },
  ];

  const handleSignOut = () => {
    clearAuthTokens();
    router.push("/login");
  };

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--host-bone)] text-sm font-medium text-[var(--host-ink-dark-muted)]">
        Loading host workspace...
      </div>
    );
  }

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-[var(--host-navy)] p-5 text-[var(--host-ink-light)]">
      <div>
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-lg font-bold">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--host-coral)] text-white">
              <BrandMarkIcon className="h-5 w-5" />
            </span>
            <span>Host</span>
          </Link>

          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation menu"
            className="rounded-lg p-1.5 text-[var(--host-ink-light-muted)] hover:bg-white/10 hover:text-white lg:hidden"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {profile && (
          <div className="mt-6 rounded-xl border border-[var(--host-navy-border)] bg-[var(--host-navy-elevated)] p-3.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--host-coral)]">
              {profile.host_type === "group" ? "Group Host" : "Individual Host"}
            </p>
            <p className="mt-0.5 truncate text-sm font-bold text-white">
              {profile.host_type === "group" && profile.group_name
                ? profile.group_name
                : profile.display_name}
            </p>
            <p className="truncate text-xs text-[var(--host-ink-light-muted)]">
              @{profile.username}
            </p>
          </div>
        )}

        <nav aria-label="Dashboard navigation" className="mt-6 space-y-1.5">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[var(--host-coral)] text-white"
                    : "text-[var(--host-ink-light-muted)] hover:bg-[var(--host-navy-elevated)] hover:text-white"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-2 border-t border-[var(--host-navy-border)] pt-4">
        <Link
          href="/"
          className="block rounded-lg border border-[var(--host-navy-border)] px-3.5 py-2 text-center text-xs font-semibold text-[var(--host-ink-light-muted)] hover:border-[var(--host-coral)] hover:text-white"
        >
          View Public Discover
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full rounded-lg px-3.5 py-2 text-left text-xs font-semibold text-red-300 hover:bg-red-500/10"
        >
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[var(--host-bone)] text-[var(--host-ink-dark)]">
      {/* Desktop Left Sidebar */}
      <aside className="no-print hidden w-64 shrink-0 border-r border-[var(--host-navy-border)] lg:block">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile Top Hamburger Header + Slide-Out Drawer */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-[var(--host-navy-border)] bg-[var(--host-navy)] px-4 py-3 text-[var(--host-ink-light)] lg:hidden">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--host-coral)] text-white">
              <BrandMarkIcon className="h-4 w-4" />
            </span>
            <span>Host Dashboard</span>
          </Link>

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation drawer"
            className="rounded-lg border border-[var(--host-navy-border)] bg-[var(--host-navy-elevated)] p-2 text-white"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
        </header>

        {drawerOpen && (
          <div className="no-print fixed inset-0 z-50 flex lg:hidden">
            <div
              className="fixed inset-0 bg-black/60"
              onClick={() => setDrawerOpen(false)}
            />
            <div className="relative z-10 w-72 max-w-[82vw]">{sidebarContent}</div>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}