import type { BeaconStatus } from "@foundry/shared";

// Command Deck domain model. These are presentation-plane shapes the Deck renders
// and the Beacon reducer maintains. They map conceptually onto @foundry/db tables
// (employees→agents, teams→teams, work orders→tasks, runs→agent_runs,
// approvals→approval_requests) but are NOT persisted in this stage — the deck runs
// on mock/local data only.

export const SENIORITY_LEVEL = ["L1", "L2", "L3", "L4"] as const;
export type SeniorityLevel = (typeof SENIORITY_LEVEL)[number];

export const WORK_ORDER_PRIORITY = ["P0", "P1", "P2"] as const;
export type WorkOrderPriority = (typeof WORK_ORDER_PRIORITY)[number];

// The columns of the Work Order Board, in board order.
export const WORK_ORDER_COLUMN = [
  "inbox",
  "assigned",
  "running",
  "awaiting_approval",
  "awaiting_audit",
  "done",
  "blocked",
] as const;
export type WorkOrderColumn = (typeof WORK_ORDER_COLUMN)[number];

export const RISK_LEVEL = ["low", "medium", "high"] as const;
export type RiskLevel = (typeof RISK_LEVEL)[number];

export const BLOCKER_SEVERITY = ["P0", "P1", "P2"] as const;
export type BlockerSeverity = (typeof BLOCKER_SEVERITY)[number];

// An AI employee in the roster. `id` is the stable E-code (E01..E10), which the
// mock Beacon stream uses as the event `agentId`.
export interface Employee {
  id: string; // "E01".."E10"
  name: string;
  role: string;
  level: SeniorityLevel;
  teamId: string;
  lane: string; // proprietary Foundry repo path lane(s)
  escalation: string[]; // who this employee escalates to, in order
  personality: string;
  status: BeaconStatus;
  currentAssignment: string | null; // workOrderId
  currentSessionId: string | null;
  currentRepo: string | null;
  currentTool: string | null;
  lastEventTitle: string | null;
  lastEventAt: string | null;
}

export interface Team {
  id: string;
  name: string;
  memberIds: string[]; // employee ids
}

export interface WorkOrder {
  id: string;
  number: number;
  title: string;
  problem: string;
  when: string;
  priority: WorkOrderPriority;
  notes: string;
  column: WorkOrderColumn;
  assignedTo: string | null; // employee id
  repo: string;
  branch: string;
  reviewers: string[]; // employee ids required to review
  auditTodoCount: number;
  memoryUpdateRequired: boolean;
}

export interface Session {
  id: string;
  employeeId: string | null;
  repo: string | null;
  status: BeaconStatus;
  currentTool: string | null;
  startedAt: string;
  // Live placeholders — populated by statusLine snapshots later, mocked for now.
  contextPct: number | null;
  tokens: number | null;
  costUsd: number | null;
  elapsedMs: number | null;
}

export interface Run {
  id: string;
  employeeId: string | null;
  workOrderId: string | null;
  repo: string | null;
  status: BeaconStatus;
  startedAt: string;
  currentTool: string | null;
  latestOutput: string | null;
  approvalId: string | null;
}

export interface Approval {
  id: string;
  runId: string | null;
  employeeId: string | null;
  action: string; // tool/action awaiting a human gate
  reason: string;
  risk: RiskLevel;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface Blocker {
  id: string;
  title: string;
  workOrderId: string | null;
  employeeId: string | null;
  severity: BlockerSeverity;
  createdAt: string;
  resolvedAt: string | null;
}
