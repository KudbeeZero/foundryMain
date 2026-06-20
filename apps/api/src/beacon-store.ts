import { desc } from "drizzle-orm";
import { beaconEvents, type Database } from "@foundry/db";
import { sanitizeBeaconEvent, type BeaconEvent } from "@foundry/shared";

// Persistence + replay for the Beacon stream (ROADMAP Epic 3 · F8–F10).
//
// The row<->event mapping is pure (no IO) so it is unit-testable without a
// database; the insert/select are thin wrappers that take an injected Database,
// keeping the hook route's pure handler (and its tests) free of any db import.

type BeaconInsert = typeof beaconEvents.$inferInsert;

// Structural shape accepted by rowToEvent — tolerant of both a selected row
// (scope refs `string | null`) and a freshly built insert (`… | undefined`).
type StoredBeaconEvent = {
  eventId: string;
  type: string;
  eventTimestamp: Date | string;
  source: string;
  status: string;
  title: string;
  message: string;
  metadata?: unknown;
  orgId?: string | null;
  agentId?: string | null;
  runId?: string | null;
  sessionId?: string | null;
  repoId?: string | null;
};

export function eventToRow(e: BeaconEvent): BeaconInsert {
  return {
    eventId: e.id,
    type: e.type,
    eventTimestamp: new Date(e.timestamp),
    source: e.source,
    status: e.status,
    title: e.title,
    message: e.message,
    metadata: e.metadata,
    orgId: e.orgId ?? null,
    agentId: e.agentId ?? null,
    runId: e.runId ?? null,
    sessionId: e.sessionId ?? null,
    repoId: e.repoId ?? null,
  };
}

// Rehydrate a stored row back into a BeaconEvent, re-applying sanitizeBeaconEvent
// as defense-in-depth (the stream is trusted to have been redacted on write, but
// we never hand un-sanitized data back to a client).
export function rowToEvent(row: StoredBeaconEvent): BeaconEvent {
  const ts = row.eventTimestamp instanceof Date ? row.eventTimestamp.toISOString() : String(row.eventTimestamp);
  return sanitizeBeaconEvent({
    id: row.eventId,
    type: row.type,
    timestamp: ts,
    source: row.source,
    status: row.status,
    title: row.title,
    message: row.message,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    orgId: row.orgId ?? undefined,
    agentId: row.agentId ?? undefined,
    runId: row.runId ?? undefined,
    sessionId: row.sessionId ?? undefined,
    repoId: row.repoId ?? undefined,
  });
}

// Insert one event. Idempotent on the client event id so replayed/duplicated
// posts don't pile up.
export async function persistBeaconEvent(db: Database, event: BeaconEvent): Promise<void> {
  await db.insert(beaconEvents).values(eventToRow(event)).onConflictDoNothing({
    target: beaconEvents.eventId,
  });
}

// Newest-first slice of the persisted stream, re-sanitized.
export async function readBeaconEvents(db: Database, limit = 200): Promise<BeaconEvent[]> {
  const rows = await db
    .select()
    .from(beaconEvents)
    .orderBy(desc(beaconEvents.createdAt))
    .limit(limit);
  return rows.map(rowToEvent);
}
