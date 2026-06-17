import type { BeaconState } from "./state.js";
import {
  WORK_ORDER_COLUMN,
  type Approval,
  type Blocker,
  type Employee,
  type Run,
  type Session,
  type WorkOrder,
  type WorkOrderColumn,
} from "./model.js";

// Pure projections over BeaconState for the Command Deck surfaces. None mutate.

export function selectEmployees(state: BeaconState): Employee[] {
  return Object.values(state.employees).sort((a, b) => a.id.localeCompare(b.id));
}

export function selectTeamsWithMembers(
  state: BeaconState,
): { team: BeaconState["teams"][string]; members: Employee[] }[] {
  return Object.values(state.teams)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((team) => ({
      team,
      members: team.memberIds
        .map((id) => state.employees[id])
        .filter((e): e is Employee => Boolean(e)),
    }));
}

export function selectActiveSessions(state: BeaconState): Session[] {
  return Object.values(state.sessions).sort((a, b) =>
    a.startedAt.localeCompare(b.startedAt),
  );
}

export function selectActiveRuns(state: BeaconState): Run[] {
  return Object.values(state.runs)
    .filter((r) => r.status === "running" || r.status === "awaiting_approval")
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

export function selectAllRuns(state: BeaconState): Run[] {
  return Object.values(state.runs).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

export function selectPendingApprovals(state: BeaconState): Approval[] {
  return Object.values(state.approvals)
    .filter((a) => a.status === "pending")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function selectOpenBlockers(state: BeaconState): Blocker[] {
  return Object.values(state.blockers)
    .filter((b) => b.resolvedAt === null)
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
}

export function selectWorkOrdersByColumn(
  state: BeaconState,
): Record<WorkOrderColumn, WorkOrder[]> {
  const out = {} as Record<WorkOrderColumn, WorkOrder[]>;
  for (const col of WORK_ORDER_COLUMN) out[col] = [];
  for (const wo of Object.values(state.workOrders)) out[wo.column].push(wo);
  for (const col of WORK_ORDER_COLUMN) {
    out[col].sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
  }
  return out;
}

// Top-bar / Beacon-pill summary counts.
export interface DeckCounts {
  activeSessions: number;
  activeRuns: number;
  pendingApprovals: number;
  openBlockers: number;
}

export function selectCounts(state: BeaconState): DeckCounts {
  return {
    activeSessions: selectActiveSessions(state).length,
    activeRuns: selectActiveRuns(state).length,
    pendingApprovals: selectPendingApprovals(state).length,
    openBlockers: selectOpenBlockers(state).length,
  };
}

// The single live "what's happening right now" view for the Beacon pill.
export interface BeaconPill {
  session: Session | null;
  employee: Employee | null;
  repo: string | null;
  tool: string | null;
  status: Session["status"] | "idle";
  contextPct: number | null;
  tokens: number | null;
  costUsd: number | null;
  elapsedMs: number | null;
}

export function selectBeaconPill(state: BeaconState): BeaconPill {
  const session =
    (state.focusedSessionId ? state.sessions[state.focusedSessionId] : undefined) ??
    selectActiveSessions(state).at(-1) ??
    null;
  const employee = session?.employeeId ? state.employees[session.employeeId] ?? null : null;
  return {
    session,
    employee,
    repo: session?.repo ?? null,
    tool: session?.currentTool ?? null,
    status: session?.status ?? "idle",
    contextPct: session?.contextPct ?? null,
    tokens: session?.tokens ?? null,
    costUsd: session?.costUsd ?? null,
    elapsedMs: session?.elapsedMs ?? null,
  };
}

export function selectRecentEvents(state: BeaconState, limit = 30) {
  return state.events.slice(-limit).reverse();
}

function priorityRank(p: WorkOrder["priority"]): number {
  return p === "P0" ? 0 : p === "P1" ? 1 : 2;
}

function severityRank(s: Blocker["severity"]): number {
  return s === "P0" ? 0 : s === "P1" ? 1 : 2;
}
