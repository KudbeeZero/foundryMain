import { z } from "zod";

// AgentEvent — the orchestration contract. Every transition in the agent-run state
// machine (Orchestration Plane) and every tool action (Execution Plane) is emitted
// as one of these. Workers persist them and the API streams them to clients.

export const agentEvent = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("run.queued"),
    runId: z.string(),
    agentId: z.string(),
    at: z.string(),
  }),
  z.object({
    type: z.literal("run.started"),
    runId: z.string(),
    at: z.string(),
  }),
  z.object({
    type: z.literal("tool.requested"),
    runId: z.string(),
    toolCallId: z.string(),
    toolName: z.string(),
    input: z.unknown(),
  }),
  z.object({
    type: z.literal("approval.requested"),
    runId: z.string(),
    approvalId: z.string(),
    toolCallId: z.string(),
    reason: z.string().optional(),
  }),
  z.object({
    type: z.literal("approval.decided"),
    runId: z.string(),
    approvalId: z.string(),
    decision: z.enum(["approved", "rejected"]),
  }),
  z.object({
    type: z.literal("tool.executed"),
    runId: z.string(),
    toolCallId: z.string(),
    ok: z.boolean(),
    output: z.unknown(),
  }),
  z.object({
    type: z.literal("message.posted"),
    runId: z.string(),
    channelId: z.string(),
    messageId: z.string(),
  }),
  z.object({
    type: z.literal("run.completed"),
    runId: z.string(),
    at: z.string(),
  }),
  z.object({
    type: z.literal("run.failed"),
    runId: z.string(),
    error: z.string(),
    at: z.string(),
  }),
]);

export type AgentEvent = z.infer<typeof agentEvent>;
export type AgentEventType = AgentEvent["type"];
