import { z } from "zod";

// BeaconEvent — Foundry's live status/event layer. Where AgentEvent is the
// strict orchestration state-machine contract, Beacon is the broader presentation
// stream that the Command Deck consumes: sessions, runs, approvals, work orders,
// blockers, and (later) Claude Code statusLine/hook snapshots. It is intentionally
// a flat, generic envelope so any plane — mock, api, worker, claude-code, system —
// can emit it and the Command Deck reducer can fold it without bespoke per-type
// parsing. AgentEvent is left untouched; Beacon is a sibling contract.

export const BEACON_EVENT_TYPE = [
  "beacon.session.started",
  "beacon.session.status",
  "beacon.session.stopped",
  "beacon.claude.statusline.snapshot",
  "beacon.claude.hook.received",
  "beacon.command.started",
  "beacon.command.finished",
  "beacon.command.failed",
  "beacon.agent.assigned",
  "beacon.agent.idle",
  "beacon.subagent.started",
  "beacon.subagent.finished",
  "beacon.work_order.created",
  "beacon.work_order.assigned",
  "beacon.run.started",
  "beacon.run.waiting_approval",
  "beacon.run.completed",
  "beacon.run.failed",
  "beacon.approval.required",
  "beacon.approval.decided",
  "beacon.memory.updated",
  "beacon.blocker.created",
  "beacon.blocker.resolved",
] as const;
export type BeaconEventType = (typeof BEACON_EVENT_TYPE)[number];

// Where the event came from. "claude-code" arrives via the future statusLine/hook
// bridge (see docs/CLAUDE_CODE_INTEGRATION.md); "mock" powers the local demo deck.
export const BEACON_SOURCE = [
  "mock",
  "api",
  "worker",
  "claude-code",
  "system",
] as const;
export type BeaconSource = (typeof BEACON_SOURCE)[number];

// A coarse live status used by the Beacon pill and roster cards. Distinct from the
// strict AgentRunStatus enum — this is a presentation-level signal.
export const BEACON_STATUS = [
  "idle",
  "thinking",
  "editing",
  "running",
  "awaiting_approval",
  "blocked",
  "completed",
  "failed",
] as const;
export type BeaconStatus = (typeof BEACON_STATUS)[number];

// Metadata is an open bag, but it is redacted before storage (see redactMetadata).
// No prompt bodies, API keys, or env secrets are ever persisted by default.
export const beaconMetadata = z.record(z.string(), z.unknown());
export type BeaconMetadata = z.infer<typeof beaconMetadata>;

export const beaconEvent = z.object({
  id: z.string(),
  type: z.enum(BEACON_EVENT_TYPE),
  timestamp: z.string(), // ISO-8601
  source: z.enum(BEACON_SOURCE),
  status: z.enum(BEACON_STATUS),
  title: z.string(),
  message: z.string(),
  metadata: beaconMetadata.default({}),
  // All scope refs are optional — mock mode often omits orgId entirely.
  orgId: z.string().optional(),
  teamId: z.string().optional(),
  agentId: z.string().optional(),
  runId: z.string().optional(),
  taskId: z.string().optional(),
  workOrderId: z.string().optional(),
  repoId: z.string().optional(),
  sessionId: z.string().optional(),
});
export type BeaconEvent = z.infer<typeof beaconEvent>;

// ---------------------------------------------------------------------------
// Privacy / redaction. Foundry never stores raw prompts, API keys, or env
// secrets in the Beacon stream. These helpers scrub obvious tokens from any
// command string or metadata bag before it is persisted or rendered. They are
// best-effort defense-in-depth, not a substitute for not collecting secrets.
// ---------------------------------------------------------------------------

const REDACTED = "«redacted»";

// Patterns for well-known secret shapes. Order matters: longer/more-specific
// patterns run first so they are not partially eaten by broader ones.
const SECRET_PATTERNS: readonly RegExp[] = [
  /\bBearer\s+[A-Za-z0-9._\-]+/gi, // Authorization: Bearer <jwt>
  /\bsk-[A-Za-z0-9._\-]{8,}/g, // OpenAI-style / Anthropic-style keys
  /\bgh[pousr]_[A-Za-z0-9]{20,}/g, // GitHub tokens (ghp_, gho_, ghu_, ghs_, ghr_)
  /\bxox[abposr]-[A-Za-z0-9-]{10,}/g, // Slack tokens
  /\bAKIA[0-9A-Z]{16}\b/g, // AWS access key id
  /\beyJ[A-Za-z0-9._\-]{20,}/g, // JWT (header starts with eyJ)
  /\b[A-Za-z0-9+/]{40}\b/g, // generic 40-char base64-ish secret (AWS secret key, etc.)
];

// Redact KEY=value / SECRET=value / TOKEN=value / PASSWORD=value pairs, keeping
// the key name so the log still reads sensibly.
const ENV_PAIR_PATTERN =
  /\b([A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD|PASSWD|PWD)[A-Z0-9_]*)\s*[=:]\s*\S+/gi;

// Keys whose *value* is always dropped regardless of shape.
const SENSITIVE_KEY_PATTERN =
  /(key|secret|token|password|passwd|pwd|authorization|cookie|credential|prompt)/i;

export function redactBeaconText(input: string): string {
  let out = input.replace(ENV_PAIR_PATTERN, (_m, key: string) => `${key}=${REDACTED}`);
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, REDACTED);
  }
  return out;
}

// Deep-redact a metadata bag. String values are scrubbed for token shapes; any
// value under a sensitive key name is dropped wholesale. Recurses into nested
// objects/arrays. Non-plain values are passed through untouched.
export function redactMetadata(metadata: BeaconMetadata): BeaconMetadata {
  return redactValue(metadata, false) as BeaconMetadata;
}

function redactValue(value: unknown, keyIsSensitive: boolean): unknown {
  if (keyIsSensitive) return REDACTED;
  if (typeof value === "string") return redactBeaconText(value);
  if (Array.isArray(value)) return value.map((v) => redactValue(v, false));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = redactValue(v, SENSITIVE_KEY_PATTERN.test(k));
    }
    return out;
  }
  return value;
}

// Parse + redact in one step. Use this at every ingestion boundary (mock
// generator, future hook receiver, worker emitters) so nothing unredacted is
// ever admitted into BeaconState.
export function sanitizeBeaconEvent(input: unknown): BeaconEvent {
  const parsed = beaconEvent.parse(input);
  return {
    ...parsed,
    title: redactBeaconText(parsed.title),
    message: redactBeaconText(parsed.message),
    metadata: redactMetadata(parsed.metadata),
  };
}
