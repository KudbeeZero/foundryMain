import Anthropic from "@anthropic-ai/sdk";
import type { QueuedRun } from "@foundry/orchestrator";

// Execution plane, increment 2 — real Claude reasoning + sandboxed code execution.
// claude-opus-4-8 with adaptive thinking + high effort, plus the Anthropic
// server-side `code_execution` tool: the model can run Python/shell in Anthropic's
// isolated, network-less container to compute, parse, and verify its work. Execution
// happens on Anthropic's infra (not ours) and the sandbox has no internet and no
// access to Foundry's systems — that isolation is the security boundary for this
// increment, so code runs without a per-call approval gate. Outward, hard-to-reverse
// actions (deploys, messages, edits to real repos) remain unavailable here and stay
// reserved for the approval-gated increment that follows.

const SYSTEM = [
  "You are an AI engineer on the Foundry team.",
  "Given a task, respond concisely with a clear plan or a direct answer.",
  "You can run Python and shell commands in a secure, network-isolated sandbox to",
  "compute, test, or verify your work — use it to check your reasoning rather than",
  "guessing. The sandbox has no internet access and cannot reach Foundry's own",
  "systems. You cannot deploy, message, or edit real repositories in this stage —",
  "describe those outward actions rather than claiming to have done them.",
].join(" ");

// Anthropic-hosted code-execution tool (REPL persistence; runs on Opus 4.5+ via the
// plain Messages API — no beta header). Declaring it lets the model run code in the
// sandbox; results return as content blocks within the same server-driven turn.
const CODE_EXECUTION_TOOL = { type: "code_execution_20260120", name: "code_execution" } as const;

// Server-side tool loops pause with stop_reason "pause_turn" when they hit the
// per-response iteration cap; we resume by re-sending the turn. Bound the resumes so
// a pathological loop can't run unbounded.
const MAX_CONTINUATIONS = 6;

export function buildPrompt(run: QueuedRun): string {
  const task = run.prompt?.trim();
  return task && task.length > 0
    ? task
    : "Continue the assigned task. No specific instructions were provided — outline how you would proceed.";
}

// Minimal structural seam over the SDK so the reasoner is unit-testable with an
// injected fake (no network, no API key). The real Anthropic client satisfies it.
// `content` carries text plus server-tool blocks (server_tool_use, *_tool_result)
// which we pass back verbatim to resume a paused turn; `stop_reason` drives that loop.
export interface LLMResponse {
  content: Array<{ type: string; text?: string }>;
  stop_reason?: string;
}

export interface LLMClient {
  messages: {
    create: (params: Record<string, unknown>) => Promise<LLMResponse>;
  };
}

export type Reasoner = (run: QueuedRun) => Promise<string>;

// Returns a reasoner only when ANTHROPIC_API_KEY is set (real model spend) or a
// client is injected; otherwise null, so the worker stays idle and CI never calls
// the API. The cast bridges the SDK's richly-overloaded client onto the small seam.
export function createAnthropicReasoner(clientOverride?: LLMClient): Reasoner | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const client: LLMClient | null =
    clientOverride ?? (apiKey ? (new Anthropic({ apiKey }) as unknown as LLMClient) : null);
  if (!client) return null;

  return async (run) => {
    // Conversation grows only when the server-tool loop pauses: we append the
    // assistant turn and re-send so the sandbox loop resumes where it left off.
    // Do NOT inject an extra user message — the trailing server_tool_use signals
    // the API to continue automatically.
    const messages: Array<{ role: string; content: unknown }> = [
      { role: "user", content: buildPrompt(run) },
    ];

    let message: LLMResponse | undefined;
    for (let i = 0; i < MAX_CONTINUATIONS; i += 1) {
      message = await client.messages.create({
        model: "claude-opus-4-8",
        max_tokens: 8192,
        thinking: { type: "adaptive" },
        output_config: { effort: "high" },
        system: SYSTEM,
        tools: [CODE_EXECUTION_TOOL],
        messages,
      });
      if (message.stop_reason !== "pause_turn") break;
      messages.push({ role: "assistant", content: message.content });
    }

    const text = (message?.content ?? [])
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text as string)
      .join("\n")
      .trim();
    return text || "(model returned no text)";
  };
}
