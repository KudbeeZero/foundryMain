import Anthropic from "@anthropic-ai/sdk";
import type { QueuedRun } from "@foundry/orchestrator";

// Execution plane, increment 1 — real Claude reasoning (no tool execution).
// claude-opus-4-8 with adaptive thinking + high effort. The model produces a text
// result (a plan / answer); the worker surfaces it on the Deck and posts it back as
// a channel message. No bash, no file writes, no code execution — zero local side
// effects (the security boundary chosen for this increment).

const SYSTEM = [
  "You are an AI engineer on the Foundry team.",
  "Given a task, respond concisely with a clear plan or a direct answer.",
  "You cannot execute tools, run commands, or edit files in this stage — describe",
  "what you would do and why, rather than claiming to have done it.",
].join(" ");

export function buildPrompt(run: QueuedRun): string {
  const task = run.prompt?.trim();
  return task && task.length > 0
    ? task
    : "Continue the assigned task. No specific instructions were provided — outline how you would proceed.";
}

// Minimal structural seam over the SDK so the reasoner is unit-testable with an
// injected fake (no network, no API key). The real Anthropic client satisfies it.
export interface LLMClient {
  messages: {
    create: (
      params: Record<string, unknown>,
    ) => Promise<{ content: Array<{ type: string; text?: string }> }>;
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
    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
      system: SYSTEM,
      messages: [{ role: "user", content: buildPrompt(run) }],
    });
    const text = (message.content ?? [])
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text as string)
      .join("\n")
      .trim();
    return text || "(model returned no text)";
  };
}
