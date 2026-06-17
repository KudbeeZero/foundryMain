// Branded ID types — compile-time only. They prevent accidentally passing, say, a
// UserId where an AgentId is expected. At runtime these are plain strings (UUIDs).

export type Brand<T, B extends string> = T & { readonly __brand: B };

export type OrgId = Brand<string, "OrgId">;
export type UserId = Brand<string, "UserId">;
export type AgentId = Brand<string, "AgentId">;
export type TeamId = Brand<string, "TeamId">;
export type ChannelId = Brand<string, "ChannelId">;
export type MessageId = Brand<string, "MessageId">;
export type RepoId = Brand<string, "RepoId">;
export type TaskId = Brand<string, "TaskId">;
export type RunId = Brand<string, "RunId">;
export type ToolCallId = Brand<string, "ToolCallId">;
export type ApprovalId = Brand<string, "ApprovalId">;

// Beacon / Command Deck additions. SessionId tracks a live coding session
// (one Claude Code run-surface); BeaconEventId is a single event in the stream.
// WorkOrderId is an alias of TaskId — a "work order" is the product-facing name
// for a row in the tasks table.
export type SessionId = Brand<string, "SessionId">;
export type BeaconEventId = Brand<string, "BeaconEventId">;
export type WorkOrderId = TaskId;
