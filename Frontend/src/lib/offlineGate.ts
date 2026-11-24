export interface GateManifestCode {
  id: number;
  event_id: number;
  slot_number: number;
  code: string;
  is_used: boolean;
  used_at: string | null;
  event_title: string;
  guest_name: string;
  guest_phone: string;
  registration_reference: string;
  ticket_label: string;
}

export interface OfflineGateManifest {
  event_id: number;
  event_title: string;
  synced_at: string;
  codes: GateManifestCode[];
}

export interface PendingOfflineCheckin {
  code: string;
  checked_in_at: string;
}

const manifestKey = (eventId: number) => `host_gate_manifest_${eventId}`;
const pendingKey = (eventId: number) => `host_gate_pending_${eventId}`;

export function saveGateManifest(eventId: number, manifest: OfflineGateManifest): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(manifestKey(eventId), JSON.stringify(manifest));
}

export function loadGateManifest(eventId: number): OfflineGateManifest | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(manifestKey(eventId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OfflineGateManifest;
  } catch {
    return null;
  }
}

export function loadPendingCheckins(eventId: number): PendingOfflineCheckin[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(pendingKey(eventId));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PendingOfflineCheckin[];
  } catch {
    return [];
  }
}

export function savePendingCheckins(eventId: number, checkins: PendingOfflineCheckin[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(pendingKey(eventId), JSON.stringify(checkins));
}

export function verifyCodeOffline(
  eventId: number,
  rawCode: string
): {
  valid: boolean;
  alreadyUsed: boolean;
  reason: string;
  entry?: GateManifestCode;
} {
  const normalized = rawCode.trim().toUpperCase();
  if (!normalized) {
    return { valid: false, alreadyUsed: false, reason: "Enter or scan an access code." };
  }

  const manifest = loadGateManifest(eventId);
  if (!manifest) {
    return {
      valid: false,
      alreadyUsed: false,
      reason: "No offline gate manifest cached for this event yet.",
    };
  }

  const idx = manifest.codes.findIndex((item) => item.code.toUpperCase() === normalized);
  if (idx === -1) {
    return { valid: false, alreadyUsed: false, reason: "Code not found in event guest list." };
  }

  const target = manifest.codes[idx];
  if (target.is_used) {
    return {
      valid: false,
      alreadyUsed: true,
      reason: "Code already used for entry.",
      entry: target,
    };
  }

  const nowIso = new Date().toISOString();
  const updatedEntry: GateManifestCode = {
    ...target,
    is_used: true,
    used_at: nowIso,
  };
  manifest.codes[idx] = updatedEntry;
  manifest.synced_at = nowIso;
  saveGateManifest(eventId, manifest);

  const pending = loadPendingCheckins(eventId);
  if (!pending.some((p) => p.code.toUpperCase() === normalized)) {
    pending.push({ code: normalized, checked_in_at: nowIso });
    savePendingCheckins(eventId, pending);
  }

  return {
    valid: true,
    alreadyUsed: false,
    reason: "Entry approved (recorded offline).",
    entry: updatedEntry,
  };
}