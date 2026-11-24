import type { Metadata } from "next";
import "./globals.css";
import DevNoticeBanner from "@/components/DevNoticeBanner";

export const metadata: Metadata = {
  title: "Host — Discover Campus Parties, Events & Venues",
  description:
    "Host events or parties, book venues, pay or apply without attendee signup, and check in with single-use QR access codes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased selection:bg-[var(--host-coral)] selection:text-white">
        <DevNoticeBanner />
        {children}
      </body>
    </html>
  );
}