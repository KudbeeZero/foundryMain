import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  beaconReducer,
  createInitialBeaconState,
  createLiveEventGenerator,
  generateMockHistory,
  mockSeed,
  nextBackoffMs,
  reduceBeaconEvents,
  selectUnseen,
  type BeaconState,
} from "@foundry/orchestrator";
import { sanitizeBeaconEvent, type BeaconEvent } from "@foundry/shared";

// React binding for the Beacon reducer. Initial state folds the mock history so the
// deck is alive on first paint; a live ticker dispatches fresh mock events until
// REAL data arrives. A reconnect/backoff loop (F19) polls the persisted stream
// (/hooks/beacon/replay) and de-duplicates by event id, and exposes a live/demo/
// local connection indicator (F18) so the operator can tell what they're looking at.

type DeckAction =
  | { kind: "event"; event: BeaconEvent }
  | { kind: "events"; events: BeaconEvent[] };

function deckReducer(state: BeaconState, action: DeckAction): BeaconState {
  switch (action.kind) {
    case "event":
      return beaconReducer(state, action.event);
    case "events":
      return reduceBeaconEvents(state, action.events);
  }
}

function init(): BeaconState {
  return reduceBeaconEvents(createInitialBeaconState(mockSeed), generateMockHistory());
}

let synthCounter = 0;

// "live"  → folding REAL persisted events (replay, mode: live)
// "demo"  → API reachable but serving mock (/demo) data
// "local" → no API; pure in-browser mock ticker
export type ConnectionMode = "live" | "demo" | "local";

export interface ConnectionState {
  mode: ConnectionMode;
  lastSyncAt: number | null;
}

export interface UseBeacon {
  state: BeaconState;
  connection: ConnectionState;
  decideApproval: (approvalId: string, decision: "approved" | "rejected") => Promise<void>;
}

export function useBeacon(tickMs = 3500): UseBeacon {
  const [state, dispatch] = useReducer(deckReducer, undefined, init);
  const [connection, setConnection] = useState<ConnectionState>({ mode: "local", lastSyncAt: null });

  // Event ids already folded — the dedupe guard (F19). Seeded from the mock history
  // so re-folding a replay snapshot never double-counts the stream.
  const seen = useRef<Set<string> | null>(null);
  if (seen.current === null) seen.current = new Set(state.events.map((e) => e.id));
  const liveRef = useRef(false);

  // Fold only the events we haven't seen, recording their ids. Returns how many.
  const foldUnseen = useCallback((raw: unknown[]): number => {
    const seenSet = seen.current!;
    const events = raw.map((e) => sanitizeBeaconEvent(e));
    const fresh = selectUnseen(seenSet, events);
    for (const e of fresh) seenSet.add(e.id);
    if (fresh.length > 0) dispatch({ kind: "events", events: fresh });
    return fresh.length;
  }, []);

  // Live mock ticker — pauses once we're on REAL data so LIVE mode shows only real
  // events. Deduped so it can never collide with a folded id.
  useEffect(() => {
    const gen = createLiveEventGenerator();
    const id = setInterval(() => {
      if (liveRef.current) return;
      const event = gen.next(new Date());
      if (seen.current!.has(event.id)) return;
      seen.current!.add(event.id);
      dispatch({ kind: "event", event });
    }, tickMs);
    return () => clearInterval(id);
  }, [tickMs]);

  // Reconnect/backoff poll of the real stream (F19). On success it re-syncs at a
  // steady cadence; on failure it backs off exponentially. Dropping and restoring
  // the API neither duplicates (dedupe) nor freezes (the loop keeps retrying) the
  // stream.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;

    const poll = async () => {
      let mode: ConnectionMode = "local";
      let connected = false;
      try {
        const replay = await fetch("/hooks/beacon/replay");
        if (replay.ok) {
          connected = true;
          const body = (await replay.json()) as { mode?: string; events?: unknown[] };
          if (body.mode === "live") {
            foldUnseen(Array.isArray(body.events) ? body.events : []);
            mode = "live";
          }
        }
        if (mode !== "live") {
          const demo = await fetch("/demo/beacon/events");
          if (demo.ok) {
            connected = true;
            const body = (await demo.json()) as { events?: unknown[] };
            foldUnseen(Array.isArray(body.events) ? body.events : []);
            mode = "demo";
          }
        }
      } catch {
        connected = false; // network error → treat as offline, back off
      }
      if (cancelled) return;

      liveRef.current = mode === "live";
      if (connected) {
        attempt = 0;
        setConnection({ mode, lastSyncAt: Date.now() });
        timer = setTimeout(poll, tickMs * 2); // steady re-sync
      } else {
        attempt += 1;
        setConnection((prev) => ({ mode: "local", lastSyncAt: prev.lastSyncAt }));
        timer = setTimeout(poll, nextBackoffMs(attempt, { baseMs: 1000, maxMs: 30000 }));
      }
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [tickMs, foldUnseen]);

  // Approval decision (Epic 5 · F16). Calls the real authed endpoint
  // (POST /api/approvals/:id/decision) so the decision persists and the run
  // transitions server-side. The local Beacon event is then folded so the Deck
  // reflects it immediately. In demo / unauthed mode the API call fails (401/no
  // token) and we fall back to a local-only reflection so the Deck stays live.
  const decideApproval = useCallback(
    async (approvalId: string, decision: "approved" | "rejected") => {
      const reflect = (confirmed: boolean) => {
        synthCounter += 1;
        dispatch({
          kind: "event",
          event: sanitizeBeaconEvent({
            id: `ui-${synthCounter}`,
            type: "beacon.approval.decided",
            timestamp: new Date().toISOString(),
            source: "system",
            status: decision === "approved" ? "running" : "blocked",
            title: `Approval ${decision}`,
            message: `Operator ${decision} ${approvalId}`,
            metadata: { approvalId, decision, confirmed },
          }),
        });
      };
      try {
        const token =
          typeof localStorage !== "undefined" ? localStorage.getItem("foundry_token") : null;
        const res = await fetch(`/api/approvals/${encodeURIComponent(approvalId)}/decision`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(token ? { authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ decision }),
        });
        reflect(res.ok); // confirmed=true only when the API persisted it
      } catch {
        reflect(false); // demo / offline — local-only reflection
      }
    },
    [],
  );

  return { state, connection, decideApproval };
}
