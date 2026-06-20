import {
  sanitizeBeaconEvent,
  type AgentEvent,
  type BeaconEvent,
} from "@foundry/shared";

// Bridge from the strict orchestration contract (AgentEvent) to the presentation
// stream (BeaconEvent) — ROADMAP Epic 4 (F13). Pure and IO-free; the worker folds
// the result and POSTs it to the receiver. Every event is run through
// sanitizeBeaconEvent so a tool input/output that carries a secret is redacted.

export interface RunBeaconContext {
  agentId?: string;
  repoId?: string;
  workOrderId?: string;
  now: string; // ISO timestamp used for events that don't carry their own `at`
}

function brief(v: unknown, max = 140): string {
  let s: string;
  if (typeof v === "string") s = v;
  else {
    try {
      s = JSON.stringify(v) ?? "";
    } catch {
      s = String(v);
    }
  }
  s = s.replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

// Map one AgentEvent to a BeaconEvent, or null when it has no Deck surface
// (run.queued, message.posted). Event ids are deterministic so re-processing a run
// is idempotent against the persisted stream (unique on event id).
export function agentEventToBeacon(
  ev: AgentEvent,
  ctx: RunBeaconContext,
): BeaconEvent | null {
  const timestamp = "at" in ev && typeof ev.at === "string" ? ev.at : ctx.now;
  const scope = {
    timestamp,
    source: "worker" as const,
    runId: ev.runId,
    agentId: ctx.agentId,
    repoId: ctx.repoId,
    workOrderId: ctx.workOrderId,
  };
  const mk = (
    id: string,
    type: BeaconEvent["type"],
    status: BeaconEvent["status"],
    title: string,
    message: string,
    metadata: Record<string, unknown> = {},
  ): BeaconEvent => sanitizeBeaconEvent({ id, type, status, title, message, metadata, ...scope });

  switch (ev.type) {
    case "run.started":
      return mk(`run:${ev.runId}:started`, "beacon.run.started", "running", "run started", `run ${ev.runId} started`);
    case "run.completed":
      return mk(`run:${ev.runId}:completed`, "beacon.run.completed", "completed", "run completed", `run ${ev.runId} completed`);
    case "run.failed":
      return mk(`run:${ev.runId}:failed`, "beacon.run.failed", "failed", "run failed", ev.error, { error: ev.error });
    case "tool.requested":
      return mk(`run:${ev.runId}:tool:${ev.toolCallId}:req`, "beacon.command.started", "running", ev.toolName, brief(ev.input), { tool: ev.toolName });
    case "tool.executed":
      return mk(`run:${ev.runId}:tool:${ev.toolCallId}:exec`, ev.ok ? "beacon.command.finished" : "beacon.command.failed", ev.ok ? "running" : "failed", "tool result", brief(ev.output), { ok: ev.ok });
    case "approval.requested":
      return mk(`run:${ev.runId}:appr:${ev.approvalId}:req`, "beacon.approval.required", "awaiting_approval", "approval required", ev.reason ?? "approval required", { approvalId: ev.approvalId });
    case "approval.decided":
      return mk(`run:${ev.runId}:appr:${ev.approvalId}:dec`, "beacon.approval.decided", ev.decision === "approved" ? "running" : "blocked", `approval ${ev.decision}`, `approval ${ev.approvalId} ${ev.decision}`, { approvalId: ev.approvalId, decision: ev.decision });
    case "run.queued":
    case "message.posted":
      return null; // no dedicated Deck surface
  }
}

// A queued run as the worker claims it from `agent_runs`. The optional fields are
// hydrated by the worker's real DB adapter (Execution plane) — the pure bridge
// ignores them.
export interface QueuedRun {
  id: string;
  agentId?: string;
  repoId?: string;
  taskId?: string;
  orgId?: string;
  channelId?: string;
  prompt?: string; // the triggering message body, fed to the model as the task
}

// Minimal, honest run lifecycle: a queued run starts and completes. Real agent
// reasoning + tool execution (Execution plane) land in a later epic; this proves
// the queue → run → Beacon → Deck wiring end-to-end. Deterministic on `now`.
export function advanceRun(run: QueuedRun, now: string): AgentEvent[] {
  return [
    { type: "run.started", runId: run.id, at: now },
    { type: "run.completed", runId: run.id, at: now },
  ];
}
