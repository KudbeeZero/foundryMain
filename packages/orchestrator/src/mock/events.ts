import {
  sanitizeBeaconEvent,
  type BeaconEvent,
  type BeaconEventType,
  type BeaconStatus,
} from "@foundry/shared";
import type { BeaconSeed } from "../beacon/state.js";
import { mockRoster } from "./roster.js";
import { mockTeams } from "./teams.js";
import { mockWorkOrders } from "./workOrders.js";

// The seed the Command Deck starts from (reference data the reducer overlays).
export const mockSeed: BeaconSeed = {
  employees: mockRoster,
  teams: mockTeams,
  workOrders: mockWorkOrders,
};

let counter = 0;
function makeEvent(
  type: BeaconEventType,
  status: BeaconStatus,
  title: string,
  message: string,
  at: string,
  extra: Partial<BeaconEvent> = {},
): BeaconEvent {
  counter += 1;
  // Every mock event passes through the same redaction boundary a real hook would.
  return sanitizeBeaconEvent({
    id: `mock-${counter}`,
    type,
    timestamp: at,
    source: "mock",
    status,
    title,
    message,
    metadata: {},
    ...extra,
  });
}

// A believable backstory: three live sessions, two in-flight runs (one waiting on
// approval), one open blocker, one completed run awaiting audit. Folding this with
// beaconReducer over `mockSeed` yields a deck that already looks alive on first
// paint. Timestamps are relative to `base` so the demo reads as "the last ~10 min".
export function generateMockHistory(base: Date = new Date()): BeaconEvent[] {
  const t = (offsetSec: number) =>
    new Date(base.getTime() - 600_000 + offsetSec * 1000).toISOString();

  return [
    makeEvent("beacon.session.started", "thinking", "Session started", "Maya opened a session on foundryMain", t(0), {
      agentId: "E01",
      sessionId: "S-01",
      repoId: "foundryMain",
    }),
    makeEvent("beacon.agent.assigned", "thinking", "Assigned WO-101", "Maya picked up the Command Deck shell", t(10), {
      agentId: "E01",
      workOrderId: "WO-101",
    }),
    makeEvent("beacon.run.started", "running", "Run started", "Building the Command Deck shell", t(20), {
      agentId: "E01",
      runId: "R-01",
      workOrderId: "WO-101",
      repoId: "foundryMain",
      metadata: { tool: "vite", output: "scaffolding apps/web" },
    }),
    makeEvent("beacon.session.started", "thinking", "Session started", "Priya opened a session on foundryMain", t(40), {
      agentId: "E03",
      sessionId: "S-02",
      repoId: "foundryMain",
    }),
    makeEvent("beacon.run.started", "running", "Run started", "Wiring the demo route layer", t(55), {
      agentId: "E03",
      runId: "R-02",
      workOrderId: "WO-104",
      repoId: "foundryMain",
      metadata: { tool: "drizzle", output: "inspecting approval_requests" },
    }),
    makeEvent("beacon.approval.required", "awaiting_approval", "Approval required", "Run R-02 wants to write to approval_requests", t(70), {
      agentId: "E03",
      runId: "R-02",
      metadata: {
        approvalId: "A-01",
        action: "DB write: insert approval_requests",
        reason: "Mutates a core table; requires human gate.",
        risk: "high",
      },
    }),
    makeEvent("beacon.session.started", "thinking", "Session started", "Diego opened a read-only review session", t(85), {
      agentId: "E04",
      sessionId: "S-03",
      repoId: "foundryMain",
    }),
    makeEvent("beacon.agent.idle", "idle", "Idle", "Diego finished the funds/chain risk review (none found)", t(110), {
      agentId: "E04",
    }),
    makeEvent("beacon.blocker.created", "blocked", "Blocker created", "DB audit awaiting Sasha sign-off", t(130), {
      agentId: "E05",
      workOrderId: "WO-107",
      metadata: { blockerId: "B-01", blockerTitle: "DB audit pending sign-off", severity: "P1" },
    }),
    makeEvent("beacon.run.started", "running", "Run started", "Drafting the Beacon contract", t(150), {
      agentId: "E10",
      runId: "R-03",
      workOrderId: "WO-102",
      repoId: "foundryMain",
      metadata: { tool: "tsc", output: "type-checking packages/shared" },
    }),
    makeEvent("beacon.run.completed", "completed", "Run completed", "Beacon contract compiled clean", t(175), {
      agentId: "E10",
      runId: "R-03",
      workOrderId: "WO-102",
      metadata: { output: "tsc --noEmit: 0 errors" },
    }),
    makeEvent("beacon.memory.updated", "idle", "Memory updated", "NOW.md flipped WO-102 to AWAITING_AUDIT", t(185), {
      agentId: "E10",
    }),
    // Final event focuses the Beacon pill on Maya actively editing the deck.
    makeEvent("beacon.claude.statusline.snapshot", "editing", "Editing", "apps/web/src/components/BeaconPill.tsx", t(300), {
      agentId: "E01",
      sessionId: "S-01",
      repoId: "foundryMain",
      metadata: {
        tool: "Edit apps/web/src/components/BeaconPill.tsx",
        contextPct: 47,
        tokens: 21000,
        costUsd: 0.27,
        elapsedMs: 540000,
      },
    }),
  ];
}

// --- live ticker -----------------------------------------------------------

const LIVE_TOOLS = [
  "Edit apps/web/src/App.tsx",
  "Read packages/orchestrator/src/beacon/reducer.ts",
  "Bash pnpm -r exec tsc --noEmit",
  "Grep beacon.session",
  "Edit apps/web/src/components/RosterBoard.tsx",
  "Write docs/COMMAND_DECK.md",
];

// A factory that, on each call to `next`, returns one fresh Beacon event keeping
// the deck visibly moving (rotating tools, context drift, occasional run flips).
// Pure presentation — randomness lives here, never in the reducer.
export function createLiveEventGenerator() {
  const liveSessions = [
    { sessionId: "S-01", agentId: "E01" },
    { sessionId: "S-02", agentId: "E03" },
  ];
  let i = 0;

  return {
    next(now: Date = new Date()): BeaconEvent {
      const at = now.toISOString();
      i += 1;
      const session = liveSessions[i % liveSessions.length]!;
      const tool = LIVE_TOOLS[i % LIVE_TOOLS.length]!;
      const status: BeaconStatus = tool.startsWith("Edit")
        ? "editing"
        : tool.startsWith("Bash")
          ? "running"
          : "thinking";
      return makeEvent(
        "beacon.claude.statusline.snapshot",
        status,
        statusLabel(status),
        tool,
        at,
        {
          agentId: session.agentId,
          sessionId: session.sessionId,
          repoId: "foundryMain",
          metadata: {
            tool,
            contextPct: 30 + ((i * 7) % 60),
            tokens: 12000 + i * 850,
            costUsd: Number((0.12 + i * 0.03).toFixed(2)),
            elapsedMs: 60000 + i * 5000,
          },
        },
      );
    },
  };
}

function statusLabel(status: BeaconStatus): string {
  return status === "editing" ? "Editing" : status === "running" ? "Running" : "Thinking";
}
