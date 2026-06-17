import { beaconEvent, type BeaconEvent, type BeaconStatus } from "@foundry/shared";
import { MAX_EVENT_BUFFER, type BeaconState } from "./state.js";
import type {
  Approval,
  Blocker,
  Run,
  Session,
  WorkOrder,
  WorkOrderColumn,
  WorkOrderPriority,
  RiskLevel,
  BlockerSeverity,
} from "./model.js";

// beaconReducer — the pure, deterministic heart of the Command Deck. Given the
// current folded state and one Beacon event, it returns the next state. No IO, no
// randomness, no Date.now(): event timestamps drive all time. Workers (Stage 3+)
// and the web app (now) share this exact function so the deck is consistent
// wherever it runs.
export function beaconReducer(state: BeaconState, event: BeaconEvent): BeaconState {
  // Defensive validation: malformed events are dropped rather than corrupting state.
  const parsed = beaconEvent.safeParse(event);
  if (!parsed.success) return state;
  const e = parsed.data;

  // Every event lands in the bounded ring buffer and refreshes the emitting
  // employee's "last event" line, before any per-type handling.
  let next = pushEvent(state, e);
  next = touchEmployee(next, e);

  switch (e.type) {
    case "beacon.session.started": {
      const session: Session = {
        id: e.sessionId ?? e.id,
        employeeId: e.agentId ?? null,
        repo: e.repoId ?? str(e.metadata, "repo"),
        status: "thinking",
        currentTool: null,
        startedAt: e.timestamp,
        contextPct: num(e.metadata, "contextPct"),
        tokens: num(e.metadata, "tokens"),
        costUsd: num(e.metadata, "costUsd"),
        elapsedMs: num(e.metadata, "elapsedMs"),
      };
      next = upsertSession(next, session);
      next = { ...next, focusedSessionId: session.id };
      return patchEmployee(next, e.agentId, {
        currentSessionId: session.id,
        currentRepo: session.repo,
        status: "thinking",
      });
    }

    case "beacon.session.status":
    case "beacon.claude.statusline.snapshot": {
      const id = e.sessionId ?? next.focusedSessionId;
      if (!id) return next;
      const existing = next.sessions[id];
      if (!existing) return next;
      const status = asStatus(e.status, existing.status);
      const tool = str(e.metadata, "tool") ?? existing.currentTool;
      next = upsertSession(next, {
        ...existing,
        status,
        currentTool: tool,
        contextPct: num(e.metadata, "contextPct") ?? existing.contextPct,
        tokens: num(e.metadata, "tokens") ?? existing.tokens,
        costUsd: num(e.metadata, "costUsd") ?? existing.costUsd,
        elapsedMs: num(e.metadata, "elapsedMs") ?? existing.elapsedMs,
      });
      next = { ...next, focusedSessionId: id };
      return patchEmployee(next, existing.employeeId, { status, currentTool: tool });
    }

    case "beacon.session.stopped": {
      const id = e.sessionId;
      if (!id) return next;
      const existing = next.sessions[id];
      if (!existing) return next;
      next = removeSession(next, id);
      const focus = next.focusedSessionId === id ? null : next.focusedSessionId;
      next = { ...next, focusedSessionId: focus };
      return patchEmployee(next, existing.employeeId, {
        status: "idle",
        currentSessionId: null,
        currentTool: null,
      });
    }

    case "beacon.claude.hook.received":
    case "beacon.subagent.started":
    case "beacon.subagent.finished":
    case "beacon.memory.updated":
      // Informational: recorded in the event buffer (already done above).
      return next;

    case "beacon.command.started": {
      const tool = str(e.metadata, "command") ?? str(e.metadata, "tool");
      next = patchSessionByEvent(next, e, { currentTool: tool, status: "running" });
      return patchEmployee(next, e.agentId, { currentTool: tool, status: "running" });
    }

    case "beacon.command.finished":
    case "beacon.command.failed": {
      next = patchSessionByEvent(next, e, { currentTool: null });
      return next;
    }

    case "beacon.agent.assigned": {
      return patchEmployee(next, e.agentId, {
        currentAssignment: e.workOrderId ?? e.taskId ?? null,
        status: "thinking",
      });
    }

    case "beacon.agent.idle": {
      return patchEmployee(next, e.agentId, {
        status: "idle",
        currentTool: null,
      });
    }

    case "beacon.work_order.created": {
      const wo = workOrderFromEvent(e);
      return { ...next, workOrders: { ...next.workOrders, [wo.id]: wo } };
    }

    case "beacon.work_order.assigned": {
      const id = e.workOrderId ?? e.taskId;
      next = patchWorkOrder(next, id, {
        assignedTo: e.agentId ?? null,
        column: "assigned",
      });
      return patchEmployee(next, e.agentId, { currentAssignment: id ?? null });
    }

    case "beacon.run.started": {
      const run: Run = {
        id: e.runId ?? e.id,
        employeeId: e.agentId ?? null,
        workOrderId: e.workOrderId ?? e.taskId ?? null,
        repo: e.repoId ?? str(e.metadata, "repo"),
        status: "running",
        startedAt: e.timestamp,
        currentTool: str(e.metadata, "tool"),
        latestOutput: str(e.metadata, "output"),
        approvalId: null,
      };
      next = upsertRun(next, run);
      next = patchWorkOrder(next, run.workOrderId, { column: "running" });
      return patchEmployee(next, e.agentId, { status: "running" });
    }

    case "beacon.run.waiting_approval": {
      next = patchRun(next, e.runId, {
        status: "awaiting_approval",
        approvalId: str(e.metadata, "approvalId"),
        latestOutput: str(e.metadata, "output") ?? runOutput(next, e.runId),
      });
      next = patchWorkOrderByRun(next, e.runId, { column: "awaiting_approval" });
      return patchEmployee(next, e.agentId, { status: "awaiting_approval" });
    }

    case "beacon.run.completed": {
      next = patchRun(next, e.runId, {
        status: "completed",
        latestOutput: str(e.metadata, "output") ?? runOutput(next, e.runId),
      });
      next = patchWorkOrderByRun(next, e.runId, { column: "awaiting_audit" });
      return patchEmployee(next, e.agentId, { status: "idle", currentTool: null });
    }

    case "beacon.run.failed": {
      next = patchRun(next, e.runId, {
        status: "failed",
        latestOutput: str(e.metadata, "error") ?? e.message,
      });
      next = patchWorkOrderByRun(next, e.runId, { column: "blocked" });
      return patchEmployee(next, e.agentId, { status: "blocked", currentTool: null });
    }

    case "beacon.approval.required": {
      const approval: Approval = {
        id: str(e.metadata, "approvalId") ?? e.id,
        runId: e.runId ?? null,
        employeeId: e.agentId ?? null,
        action: str(e.metadata, "action") ?? e.title,
        reason: str(e.metadata, "reason") ?? e.message,
        risk: asRisk(str(e.metadata, "risk")),
        status: "pending",
        createdAt: e.timestamp,
      };
      next = { ...next, approvals: { ...next.approvals, [approval.id]: approval } };
      if (approval.runId) {
        next = patchRun(next, approval.runId, {
          status: "awaiting_approval",
          approvalId: approval.id,
        });
        next = patchWorkOrderByRun(next, approval.runId, {
          column: "awaiting_approval",
        });
      }
      return patchEmployee(next, e.agentId, { status: "awaiting_approval" });
    }

    case "beacon.approval.decided": {
      const id = str(e.metadata, "approvalId");
      const existing = id ? next.approvals[id] : undefined;
      if (!existing) return next;
      const decision = str(e.metadata, "decision");
      const status = decision === "rejected" ? "rejected" : "approved";
      next = {
        ...next,
        approvals: { ...next.approvals, [existing.id]: { ...existing, status } },
      };
      // Resume or block the run depending on the decision.
      if (existing.runId) {
        next =
          status === "approved"
            ? patchRun(next, existing.runId, { status: "running", approvalId: null })
            : patchRun(next, existing.runId, { status: "blocked", approvalId: null });
      }
      return patchEmployee(next, existing.employeeId, {
        status: status === "approved" ? "running" : "blocked",
      });
    }

    case "beacon.blocker.created": {
      const blocker: Blocker = {
        id: str(e.metadata, "blockerId") ?? e.id,
        title: str(e.metadata, "blockerTitle") ?? e.title,
        workOrderId: e.workOrderId ?? e.taskId ?? null,
        employeeId: e.agentId ?? null,
        severity: asSeverity(str(e.metadata, "severity")),
        createdAt: e.timestamp,
        resolvedAt: null,
      };
      next = { ...next, blockers: { ...next.blockers, [blocker.id]: blocker } };
      next = patchWorkOrder(next, blocker.workOrderId, { column: "blocked" });
      return patchEmployee(next, e.agentId, { status: "blocked" });
    }

    case "beacon.blocker.resolved": {
      const id = str(e.metadata, "blockerId");
      const existing = id ? next.blockers[id] : undefined;
      if (!existing) return next;
      next = {
        ...next,
        blockers: {
          ...next.blockers,
          [existing.id]: { ...existing, resolvedAt: e.timestamp },
        },
      };
      next = patchWorkOrder(next, existing.workOrderId, { column: "assigned" });
      return patchEmployee(next, existing.employeeId, { status: "thinking" });
    }

    default: {
      // Exhaustiveness guard: if a BeaconEventType is added without a case here,
      // this line fails to compile.
      const _exhaustive: never = e.type;
      void _exhaustive;
      return next;
    }
  }
}

// Fold an ordered stream into a single state. Convenience for the demo and tests.
export function reduceBeaconEvents(
  state: BeaconState,
  events: readonly BeaconEvent[],
): BeaconState {
  return events.reduce(beaconReducer, state);
}

// --- immutable helpers -----------------------------------------------------

function pushEvent(state: BeaconState, e: BeaconEvent): BeaconState {
  const events = [...state.events, e];
  if (events.length > MAX_EVENT_BUFFER) events.splice(0, events.length - MAX_EVENT_BUFFER);
  return { ...state, events };
}

function touchEmployee(state: BeaconState, e: BeaconEvent): BeaconState {
  if (!e.agentId || !state.employees[e.agentId]) return state;
  return patchEmployee(state, e.agentId, {
    lastEventTitle: e.title,
    lastEventAt: e.timestamp,
  });
}

function patchEmployee(
  state: BeaconState,
  employeeId: string | null | undefined,
  patch: Partial<BeaconState["employees"][string]>,
): BeaconState {
  if (!employeeId) return state;
  const existing = state.employees[employeeId];
  if (!existing) return state;
  return {
    ...state,
    employees: { ...state.employees, [employeeId]: { ...existing, ...patch } },
  };
}

function patchWorkOrder(
  state: BeaconState,
  id: string | null | undefined,
  patch: Partial<WorkOrder>,
): BeaconState {
  if (!id) return state;
  const existing = state.workOrders[id];
  if (!existing) return state;
  return {
    ...state,
    workOrders: { ...state.workOrders, [id]: { ...existing, ...patch } },
  };
}

function patchWorkOrderByRun(
  state: BeaconState,
  runId: string | null | undefined,
  patch: Partial<WorkOrder>,
): BeaconState {
  if (!runId) return state;
  const run = state.runs[runId];
  return patchWorkOrder(state, run?.workOrderId, patch);
}

function upsertSession(state: BeaconState, session: Session): BeaconState {
  return { ...state, sessions: { ...state.sessions, [session.id]: session } };
}

function removeSession(state: BeaconState, id: string): BeaconState {
  const sessions = { ...state.sessions };
  delete sessions[id];
  return { ...state, sessions };
}

function patchSessionByEvent(
  state: BeaconState,
  e: BeaconEvent,
  patch: Partial<Session>,
): BeaconState {
  const id = e.sessionId ?? state.focusedSessionId;
  if (!id) return state;
  const existing = state.sessions[id];
  if (!existing) return state;
  return upsertSession(state, { ...existing, ...patch });
}

function upsertRun(state: BeaconState, run: Run): BeaconState {
  return { ...state, runs: { ...state.runs, [run.id]: run } };
}

function patchRun(
  state: BeaconState,
  id: string | null | undefined,
  patch: Partial<Run>,
): BeaconState {
  if (!id) return state;
  const existing = state.runs[id];
  if (!existing) return state;
  return { ...state, runs: { ...state.runs, [id]: { ...existing, ...patch } } };
}

function runOutput(state: BeaconState, runId: string | null | undefined): string | null {
  if (!runId) return null;
  return state.runs[runId]?.latestOutput ?? null;
}

function workOrderFromEvent(e: BeaconEvent): WorkOrder {
  const id = e.workOrderId ?? e.taskId ?? e.id;
  return {
    id,
    number: num(e.metadata, "number") ?? 0,
    title: str(e.metadata, "title") ?? e.title,
    problem: str(e.metadata, "problem") ?? e.message,
    when: str(e.metadata, "when") ?? "",
    priority: asPriority(str(e.metadata, "priority")),
    notes: str(e.metadata, "notes") ?? "",
    column: asColumn(str(e.metadata, "column")) ?? "inbox",
    assignedTo: e.agentId ?? null,
    repo: e.repoId ?? str(e.metadata, "repo") ?? "",
    branch: str(e.metadata, "branch") ?? "",
    reviewers: strArray(e.metadata, "reviewers"),
    auditTodoCount: num(e.metadata, "auditTodoCount") ?? 0,
    memoryUpdateRequired: bool(e.metadata, "memoryUpdateRequired"),
  };
}

// --- metadata coercion (defensive, never throws) ---------------------------

function str(meta: Record<string, unknown>, key: string): string | null {
  const v = meta[key];
  return typeof v === "string" ? v : null;
}

function num(meta: Record<string, unknown>, key: string): number | null {
  const v = meta[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function bool(meta: Record<string, unknown>, key: string): boolean {
  return meta[key] === true;
}

function strArray(meta: Record<string, unknown>, key: string): string[] {
  const v = meta[key];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function asStatus(value: string, fallback: BeaconStatus): BeaconStatus {
  return (value as BeaconStatus) ?? fallback;
}

function asPriority(value: string | null): WorkOrderPriority {
  return value === "P0" || value === "P1" || value === "P2" ? value : "P2";
}

function asColumn(value: string | null): WorkOrderColumn | null {
  const cols: WorkOrderColumn[] = [
    "inbox",
    "assigned",
    "running",
    "awaiting_approval",
    "awaiting_audit",
    "done",
    "blocked",
  ];
  return value && (cols as string[]).includes(value) ? (value as WorkOrderColumn) : null;
}

function asRisk(value: string | null): RiskLevel {
  return value === "high" || value === "medium" || value === "low" ? value : "medium";
}

function asSeverity(value: string | null): BlockerSeverity {
  return value === "P0" || value === "P1" || value === "P2" ? value : "P1";
}
