import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeBeaconEvent, type BeaconEvent } from "@foundry/shared";
import { beaconReducer, reduceBeaconEvents } from "./reducer.js";
import { createInitialBeaconState } from "./state.js";
import {
  selectActiveRuns,
  selectActiveSessions,
  selectBeaconPill,
  selectCounts,
  selectOpenBlockers,
  selectPendingApprovals,
  selectWorkOrdersByColumn,
} from "./selectors.js";
import { mockSeed, generateMockHistory } from "../mock/events.js";

function ev(partial: Partial<BeaconEvent> & Pick<BeaconEvent, "type">): BeaconEvent {
  return sanitizeBeaconEvent({
    id: `t-${Math.random()}`,
    timestamp: new Date().toISOString(),
    source: "mock",
    status: "idle",
    title: "t",
    message: "m",
    metadata: {},
    ...partial,
  });
}

test("session.started registers a session and focuses the pill", () => {
  const s0 = createInitialBeaconState(mockSeed);
  const s1 = beaconReducer(
    s0,
    ev({ type: "beacon.session.started", agentId: "E01", sessionId: "S-1", repoId: "foundryMain" }),
  );
  assert.equal(selectActiveSessions(s1).length, 1);
  assert.equal(s1.focusedSessionId, "S-1");
  assert.equal(s1.employees["E01"]?.status, "thinking");
  assert.equal(s1.employees["E01"]?.currentSessionId, "S-1");
});

test("run lifecycle moves the work order across columns", () => {
  let s = createInitialBeaconState(mockSeed);
  s = beaconReducer(s, ev({ type: "beacon.run.started", agentId: "E03", runId: "R-9", workOrderId: "WO-103" }));
  assert.equal(s.workOrders["WO-103"]?.column, "running");
  assert.equal(selectActiveRuns(s).length, 1);

  s = beaconReducer(s, ev({ type: "beacon.run.completed", agentId: "E03", runId: "R-9" }));
  assert.equal(s.workOrders["WO-103"]?.column, "awaiting_audit");
  assert.equal(s.employees["E03"]?.status, "idle");
  assert.equal(selectActiveRuns(s).length, 0);
});

test("approval required then approved resumes the run", () => {
  let s = createInitialBeaconState(mockSeed);
  s = beaconReducer(s, ev({ type: "beacon.run.started", agentId: "E03", runId: "R-5", workOrderId: "WO-104" }));
  s = beaconReducer(
    s,
    ev({
      type: "beacon.approval.required",
      agentId: "E03",
      runId: "R-5",
      metadata: { approvalId: "A-9", action: "DB write", reason: "mutates table", risk: "high" },
    }),
  );
  assert.equal(selectPendingApprovals(s).length, 1);
  assert.equal(s.runs["R-5"]?.status, "awaiting_approval");
  assert.equal(s.workOrders["WO-104"]?.column, "awaiting_approval");

  s = beaconReducer(
    s,
    ev({ type: "beacon.approval.decided", metadata: { approvalId: "A-9", decision: "approved" } }),
  );
  assert.equal(selectPendingApprovals(s).length, 0);
  assert.equal(s.runs["R-5"]?.status, "running");
});

test("blocker created then resolved clears the open-blocker count", () => {
  let s = createInitialBeaconState(mockSeed);
  s = beaconReducer(
    s,
    ev({ type: "beacon.blocker.created", agentId: "E05", workOrderId: "WO-103", metadata: { blockerId: "B-9", severity: "P0" } }),
  );
  assert.equal(selectOpenBlockers(s).length, 1);
  assert.equal(s.workOrders["WO-103"]?.column, "blocked");

  s = beaconReducer(s, ev({ type: "beacon.blocker.resolved", metadata: { blockerId: "B-9" } }));
  assert.equal(selectOpenBlockers(s).length, 0);
});

test("malformed events are dropped, not fatal", () => {
  const s0 = createInitialBeaconState(mockSeed);
  // Bypass sanitize to feed a structurally invalid event straight to the reducer.
  const bad = { type: "not.a.real.type" } as unknown as BeaconEvent;
  const s1 = beaconReducer(s0, bad);
  assert.deepEqual(s1, s0);
});

test("folding the mock history yields a believable live deck", () => {
  const state = reduceBeaconEvents(createInitialBeaconState(mockSeed), generateMockHistory());
  const counts = selectCounts(state);
  assert.equal(counts.activeSessions, 3, "E01, E03, E04 sessions");
  assert.equal(counts.activeRuns, 2, "R-01 running + R-02 awaiting approval");
  assert.equal(counts.pendingApprovals, 1);
  assert.equal(counts.openBlockers, 1);

  // Every board column key is present even if empty.
  const board = selectWorkOrdersByColumn(state);
  assert.ok(Array.isArray(board.inbox));
  assert.ok(Array.isArray(board.done));

  // Pill focuses Maya (E01) editing the deck — the last history event.
  const pill = selectBeaconPill(state);
  assert.equal(pill.employee?.id, "E01");
  assert.equal(pill.status, "editing");
});
