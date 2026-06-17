import type { BeaconEvent } from "@foundry/shared";
import type {
  Approval,
  Blocker,
  Employee,
  Run,
  Session,
  Team,
  WorkOrder,
} from "./model.js";

// BeaconState is the folded view the Command Deck renders. It is produced by
// reducing an ordered BeaconEvent stream over an initial seed. Everything is a
// keyed record for O(1) updates inside the reducer; selectors project to arrays.

export interface BeaconState {
  // Seeded reference data (roster + teams + initial work orders). The reducer
  // overlays live status onto these but does not invent employees/teams.
  employees: Record<string, Employee>;
  teams: Record<string, Team>;
  workOrders: Record<string, WorkOrder>;
  // Live, event-driven slices.
  sessions: Record<string, Session>;
  runs: Record<string, Run>;
  approvals: Record<string, Approval>;
  blockers: Record<string, Blocker>;
  // Bounded ring buffer of the most recent events (newest last).
  events: BeaconEvent[];
  // The session the Beacon pill is currently "focused" on (last active).
  focusedSessionId: string | null;
}

export const MAX_EVENT_BUFFER = 200;

export interface BeaconSeed {
  employees: Employee[];
  teams: Team[];
  workOrders: WorkOrder[];
}

export function createInitialBeaconState(seed: BeaconSeed): BeaconState {
  return {
    employees: keyBy(seed.employees),
    teams: keyBy(seed.teams),
    workOrders: keyBy(seed.workOrders),
    sessions: {},
    runs: {},
    approvals: {},
    blockers: {},
    events: [],
    focusedSessionId: null,
  };
}

export const emptyBeaconState: BeaconState = createInitialBeaconState({
  employees: [],
  teams: [],
  workOrders: [],
});

function keyBy<T extends { id: string }>(items: T[]): Record<string, T> {
  const out: Record<string, T> = {};
  for (const item of items) out[item.id] = item;
  return out;
}
