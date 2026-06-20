import { useCallback, useEffect, useReducer } from "react";
import {
  beaconReducer,
  createInitialBeaconState,
  createLiveEventGenerator,
  generateMockHistory,
  mockSeed,
  reduceBeaconEvents,
  type BeaconState,
} from "@foundry/orchestrator";
import { sanitizeBeaconEvent, type BeaconEvent } from "@foundry/shared";

// React binding for the Beacon reducer. Initial state folds the mock history so
// the deck is alive on first paint; a live ticker then dispatches fresh events on
// an interval (this is what "mock Beacon events update UI state" means in the
// acceptance criteria). If the dev API is up, /demo/beacon/events is folded in too.

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

export interface UseBeacon {
  state: BeaconState;
  decideApproval: (approvalId: string, decision: "approved" | "rejected") => Promise<void>;
}

export function useBeacon(tickMs = 3500): UseBeacon {
  const [state, dispatch] = useReducer(deckReducer, undefined, init);

  // Live mock ticker.
  useEffect(() => {
    const gen = createLiveEventGenerator();
    const id = setInterval(() => {
      dispatch({ kind: "event", event: gen.next(new Date()) });
    }, tickMs);
    return () => clearInterval(id);
  }, [tickMs]);

  // Hydrate from the API on load. Prefer the persisted Beacon stream
  // (/hooks/beacon/replay — real history, Epic 3); fall back to the dev-safe demo
  // events; if neither responds, stay in pure local mock mode. Either way we fold
  // whatever real events we get on top of the mock seed.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fold = (raw: unknown[]) => {
        if (cancelled || !Array.isArray(raw) || raw.length === 0) return false;
        dispatch({ kind: "events", events: raw.map((e) => sanitizeBeaconEvent(e)) });
        return true;
      };
      try {
        const replay = await fetch("/hooks/beacon/replay");
        if (replay.ok) {
          const body = (await replay.json()) as { mode?: string; events?: unknown[] };
          if (body.mode === "live" && fold(body.events ?? [])) return; // real history wins
        }
      } catch {
        // receiver not reachable — fall through to demo / mock
      }
      try {
        const res = await fetch("/demo/beacon/events");
        if (!res.ok) return;
        const body = (await res.json()) as { events?: unknown[] };
        fold(body.events ?? []);
      } catch {
        // API not running — pure local mock mode. Expected, ignore.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  return { state, decideApproval };
}
