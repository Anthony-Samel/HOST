"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface QrScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScan: (decodedValue: string) => void;
}

export default function QrScannerModal({ open, onClose, onScan }: QrScannerModalProps) {
  const scannerDomId = useId().replace(/:/g, "");
  const qrInstanceRef = useRef<Html5Qrcode | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!open) return;

    let active = true;
    setCameraError(null);
    setStarting(true);

    const instance = new Html5Qrcode(scannerDomId);
    qrInstanceRef.current = instance;

    instance
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          if (!active) return;
          onScan(decodedText.trim().toUpperCase());
          onClose();
        },
        () => {
          // Ignore per-frame scan misses while searching for a QR code
        }
      )
      .then(() => {
        if (active) setStarting(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setStarting(false);
        const msg = err instanceof Error ? err.message : "Unable to access camera.";
        setCameraError(
          `${msg} You can still type or paste the access code directly in the check-in box.`
        );
      });

    return () => {
      active = false;
      if (qrInstanceRef.current) {
        qrInstanceRef.current
          .stop()
          .then(() => qrInstanceRef.current?.clear())
          .catch(() => {});
        qrInstanceRef.current = null;
      }
    };
  }, [open, scannerDomId, onScan, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#070b14]/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Scan Guest Access QR Code"
    >
      <div className="w-full max-w-md rounded-xl border border-[#24324d] bg-[#0f172a] p-5 text-[#f8f5ef] shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Scan Guest QR Code</h2>
            <p className="text-xs text-[#cbd5e1]">
              Works offline once your gate list is cached on this device.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close scanner"
            className="rounded-lg border border-[#334155] p-2 text-[#cbd5e1] hover:border-[#ff5a36] hover:text-white"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-hidden rounded-lg border border-[#24324d] bg-[#070b14]">
          <div id={scannerDomId} className="min-h-[260px] w-full" />
        </div>

        {starting && !cameraError && (
          <p className="mt-3 text-xs text-[#cbd5e1]">Starting camera...</p>
        )}

        {cameraError && (
          <div className="mt-3 rounded-lg border border-[#ff5a36]/50 bg-[#ff5a36]/10 p-3 text-xs text-[#ffd7ce]">
            {cameraError}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#ff5a36] px-4 py-2 text-sm font-medium text-white hover:bg-[#e64825]"
          >
            Done / Type Code Instead
          </button>
        </div>
      </div>
    </div>
  );
}