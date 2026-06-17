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
  decideApproval: (approvalId: string, decision: "approved" | "rejected") => void;
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

  // Optional hydrate from the dev-safe demo API (no-op if it isn't running).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/demo/beacon/events");
        if (!res.ok) return;
        const body = (await res.json()) as { events?: unknown[] };
        if (cancelled || !Array.isArray(body.events)) return;
        const events = body.events.map((e) => sanitizeBeaconEvent(e));
        dispatch({ kind: "events", events });
      } catch {
        // API not running — pure local mock mode. Expected, ignore.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // UI-only approval decision: emits a Beacon event into the local stream. No real
  // side effects (acceptance criterion 9) — the reducer just reflects the decision.
  const decideApproval = useCallback(
    (approvalId: string, decision: "approved" | "rejected") => {
      synthCounter += 1;
      const event = sanitizeBeaconEvent({
        id: `ui-${synthCounter}`,
        type: "beacon.approval.decided",
        timestamp: new Date().toISOString(),
        source: "system",
        status: decision === "approved" ? "running" : "blocked",
        title: `Approval ${decision}`,
        message: `Operator ${decision} ${approvalId}`,
        metadata: { approvalId, decision },
      });
      dispatch({ kind: "event", event });
    },
    [],
  );

  return { state, decideApproval };
}
