import React from "react";
import Link from "next/link";
import { EventItem } from "@/lib/types";
import { resolveMediaUrl } from "@/lib/api";
import { CalendarIcon, ExternalLinkIcon, MapPinIcon, UsersIcon } from "./Icons";

interface EventCardProps {
  event: EventItem;
}

export default function EventCard({ event }: EventCardProps) {
  const flyerUrl = resolveMediaUrl(event.flyer);
  const formattedDate = new Date(event.start_at).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const minPaidPrice =
    !event.is_free && event.ticket_categories.length > 0
      ? Math.min(...event.ticket_categories.map((c) => Number(c.price || 0)))
      : 0;

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-[#d6cfc2] bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="relative h-44 w-full bg-[var(--host-navy)]">
        {flyerUrl ? (
          <img
            src={flyerUrl}
            alt={event.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col justify-between p-4 text-[var(--host-ink-light)]">
            <span className="inline-flex w-fit rounded-full bg-[var(--host-coral-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--host-coral)]">
              {event.category || "Campus Event"}
            </span>
            <p className="text-xs text-[var(--host-ink-light-muted)]">
              Hosted by {event.hosted_by_label}
            </p>
          </div>
        )}
        <span
          className={`absolute top-3 right-3 rounded-full px-2.5 py-1 text-xs font-bold ${
            event.is_free
              ? "bg-[var(--host-bone)] text-[var(--host-ink-dark)]"
              : "bg-[var(--host-coral)] text-white"
          }`}
        >
          {event.is_free
            ? "Free / Apply"
            : minPaidPrice > 0
            ? `From NGN ${minPaidPrice.toLocaleString()}`
            : "Paid Ticket"}
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs text-[var(--host-ink-dark-muted)]">
            <span className="font-medium text-[var(--host-coral)]">{event.category}</span>
            <span>By {event.hosted_by_label}</span>
          </div>

          <h2 className="line-clamp-1 text-lg font-bold text-[var(--host-ink-dark)]">
            {event.title}
          </h2>

          <p className="mt-1 line-clamp-2 text-sm text-[var(--host-ink-dark-muted)]">
            {event.description}
          </p>

          <div className="mt-3 space-y-1.5 text-xs text-[var(--host-ink-dark-muted)]">
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-[var(--host-navy)]" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 truncate">
                <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-[var(--host-navy)]" />
                <span className="truncate">{event.location_label}</span>
              </span>
              {event.map_url && (
                <a
                  href={event.map_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 font-semibold text-[var(--host-coral)] hover:underline"
                >
                  Map
                  <ExternalLinkIcon className="h-3 w-3" />
                </a>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <UsersIcon className="h-3.5 w-3.5 shrink-0 text-[var(--host-navy)]" />
              <span>{event.capacity} guest capacity</span>
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-[#ece6da] pt-3">
          <Link
            href={`/events/${event.slug}`}
            className="block w-full rounded-lg bg-[var(--host-navy)] px-4 py-2 text-center text-sm font-semibold text-[var(--host-ink-light)] transition-colors hover:bg-[var(--host-coral)] hover:text-white"
          >
            {event.is_free ? "Apply for Access Code" : "Get Ticket & Pay"}
          </Link>
        </div>
      </div>
    </article>
  );
}