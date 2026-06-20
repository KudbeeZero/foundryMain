import type { BeaconEvent } from "@foundry/shared";

// Client stream helpers for the Command Deck's live connection (ROADMAP Epic 6 ·
// F19). Pure + IO-free so they're unit-tested without React or a network; the
// useBeacon hook composes them into its reconnect/dedupe loop.

// Return only the events whose id isn't already in `seen` (and de-duplicate within
// the batch), preserving order. The caller records ids into its own set so that
// re-folding a replay snapshot never double-counts the stream.
export function selectUnseen(
  seen: ReadonlySet<string>,
  events: readonly BeaconEvent[],
): BeaconEvent[] {
  const out: BeaconEvent[] = [];
  const batch = new Set<string>();
  for (const e of events) {
    if (seen.has(e.id) || batch.has(e.id)) continue;
    batch.add(e.id);
    out.push(e);
  }
  return out;
}

export interface BackoffOptions {
  baseMs?: number;
  maxMs?: number;
}

// Exponential backoff for the reconnect loop: attempt 0 → base, doubling up to a
// cap. Deterministic (no jitter) so the schedule is testable.
export function nextBackoffMs(attempt: number, opts: BackoffOptions = {}): number {
  const base = opts.baseMs ?? 1000;
  const max = opts.maxMs ?? 30000;
  const a = Math.max(0, Math.floor(attempt));
  return Math.min(max, base * 2 ** a);
}
