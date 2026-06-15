// Single source of truth for status enums shared across the Core, Orchestration,
// and Execution planes. Drizzle pgEnum columns in @foundry/db are built from these
// tuples, and the orchestrator state machine references the same literal unions.

export const AGENT_RUN_STATUS = [
  "queued",
  "running",
  "awaiting_approval",
  "succeeded",
  "failed",
  "cancelled",
] as const;
export type AgentRunStatus = (typeof AGENT_RUN_STATUS)[number];

export const TOOL_CALL_STATUS = [
  "pending",
  "running",
  "succeeded",
  "failed",
] as const;
export type ToolCallStatus = (typeof TOOL_CALL_STATUS)[number];

export const APPROVAL_STATUS = ["pending", "approved", "rejected"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUS)[number];

export const MEMBER_ROLE = ["owner", "admin", "member"] as const;
export type MemberRole = (typeof MEMBER_ROLE)[number];

export const CHANNEL_TYPE = ["public", "private", "dm"] as const;
export type ChannelType = (typeof CHANNEL_TYPE)[number];

export const ACTOR_TYPE = ["user", "agent", "system"] as const;
export type ActorType = (typeof ACTOR_TYPE)[number];
