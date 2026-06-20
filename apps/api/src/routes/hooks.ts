import { Hono } from "hono";
import { timingSafeEqual } from "node:crypto";
import { sanitizeBeaconEvent, type BeaconEvent } from "@foundry/shared";
import { env } from "../env.js";

// Beacon hook receiver (ROADMAP F1 + F2). Accepts BeaconEvents from Claude Code
// statusLine/hook publishers (see docs/CLAUDE_CODE_INTEGRATION.md) and folds them
// into the Command Deck stream. Mounted OUTSIDE the /api/* boundary: publishers
// carry a shared BEACON_HOOK_TOKEN (x-beacon-token header), not a Supabase JWT.
//
// Two hard rules:
//   1. Fail-closed on auth. No configured token → the receiver is disabled (503);
//      a wrong/missing token → 401. The guard runs BEFORE any body parsing so an
//      unauthenticated caller learns nothing about the payload shape.
//   2. Redact server-side. Every accepted event passes through sanitizeBeaconEvent
//      regardless of what the publisher claims to have sent — redaction is enforced
//      here, never trusted to the client.
//
// Persistence is deferred (ROADMAP Epic 3 / F8–F9); for now a valid event is
// sanitized and acknowledged with 202.

export type HookResult = {
  status: 202 | 400 | 401 | 503;
  body: Record<string, unknown>;
};

// Constant-time token comparison. The length check leaks only the token length
// (acceptable); the byte comparison itself is timing-safe.
function tokensMatch(configured: string, presented: string): boolean {
  const a = Buffer.from(configured);
  const b = Buffer.from(presented);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Pure receiver logic — no IO, no framework — so it is exhaustively unit-testable
// (mirrors the pure Beacon reducer in @foundry/orchestrator). The Hono handler
// below is a thin adapter that feeds it the env token, the header, and the body.
export function handleBeaconHook(
  configuredToken: string,
  presentedToken: string | undefined,
  rawBody: unknown,
): HookResult {
  if (!configuredToken) {
    return { status: 503, body: { error: "beacon receiver not configured" } };
  }
  if (!presentedToken || !tokensMatch(configuredToken, presentedToken)) {
    return { status: 401, body: { error: "invalid beacon token" } };
  }
  try {
    const event = sanitizeBeaconEvent(rawBody);
    return { status: 202, body: { accepted: true, event } };
  } catch {
    // Never echo the raw body or validation detail — it may carry unredacted input.
    return { status: 400, body: { error: "invalid beacon event" } };
  }
}

export const hooksRoute = new Hono();

// Persist an accepted event, best-effort. Dynamic-imported so the pure handler
// (and its tests) never load the db driver, and so the db is only touched when
// BEACON_PERSIST is on. A DB error is swallowed — it must never block the 202.
function persistInBackground(event: BeaconEvent): void {
  if (!env.BEACON_PERSIST) return;
  void (async () => {
    try {
      const [{ db }, store] = await Promise.all([
        import("../db.js"),
        import("../beacon-store.js"),
      ]);
      await store.persistBeaconEvent(db, event);
    } catch {
      // DB down / not configured → drop silently (fail-open).
    }
  })();
}

// POST /hooks/beacon — accept one BeaconEvent from a publisher.
hooksRoute.post("/beacon", async (c) => {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    raw = undefined; // malformed JSON → handled as an invalid event (400)
  }

  const result = handleBeaconHook(
    env.BEACON_HOOK_TOKEN,
    c.req.header("x-beacon-token"),
    raw,
  );
  if (result.status === 202) {
    persistInBackground(result.body.event as BeaconEvent);
  }
  return c.json(result.body, result.status);
});

// GET /hooks/beacon/replay — newest-first slice of the persisted, re-sanitized
// stream so the Deck can rehydrate real history on load (F10/F11). Returns an
// empty list (never an error) when persistence is off or the DB is unreachable,
// so the Deck degrades cleanly to mock mode.
hooksRoute.get("/beacon/replay", async (c) => {
  if (!env.BEACON_PERSIST) return c.json({ mode: "disabled", events: [] });
  const limit = Math.min(Math.max(Number(c.req.query("limit")) || 200, 1), 1000);
  try {
    const [{ db }, store] = await Promise.all([
      import("../db.js"),
      import("../beacon-store.js"),
    ]);
    const events = await store.readBeaconEvents(db, limit);
    return c.json({ mode: "live", events });
  } catch {
    return c.json({ mode: "error", events: [] });
  }
});
