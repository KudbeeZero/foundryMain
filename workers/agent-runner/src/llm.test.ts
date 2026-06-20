import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPrompt, createAnthropicReasoner, type LLMClient } from "./llm.js";

test("buildPrompt uses the triggering message when present", () => {
  assert.equal(buildPrompt({ id: "R1", prompt: "Add a /health route" }), "Add a /health route");
});

test("buildPrompt falls back when there is no task text", () => {
  assert.match(buildPrompt({ id: "R1" }), /Continue the assigned task/);
  assert.match(buildPrompt({ id: "R1", prompt: "   " }), /Continue the assigned task/);
});

test("createAnthropicReasoner returns null without an API key (worker idle)", () => {
  const prev = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  assert.equal(createAnthropicReasoner(), null);
  if (prev !== undefined) process.env.ANTHROPIC_API_KEY = prev;
});

test("reasoner sends opus-4-8 + adaptive thinking + the code_execution tool and returns the joined text", async () => {
  let seen: Record<string, unknown> | undefined;
  const fake: LLMClient = {
    messages: {
      create: async (params) => {
        seen = params;
        return {
          content: [
            { type: "thinking", text: undefined },
            { type: "text", text: "Step 1." },
            { type: "text", text: "Step 2." },
          ],
        };
      },
    },
  };
  const reason = createAnthropicReasoner(fake);
  assert.ok(reason, "injected client yields a reasoner even without a key");

  const text = await reason!({ id: "R1", prompt: "do the thing" });
  assert.equal(text, "Step 1.\nStep 2.");
  assert.equal(seen?.model, "claude-opus-4-8");
  assert.deepEqual(seen?.thinking, { type: "adaptive" });
  assert.deepEqual((seen?.messages as Array<{ content: string }>)[0]?.content, "do the thing");

  const tools = seen?.tools as Array<{ type: string; name: string }>;
  assert.equal(tools?.length, 1);
  assert.equal(tools[0]?.type, "code_execution_20260120");
  assert.equal(tools[0]?.name, "code_execution");
});

test("reasoner resumes a paused server-tool turn and keeps only the final text", async () => {
  const calls: Array<Array<{ role: string; content: unknown }>> = [];
  let n = 0;
  const fake: LLMClient = {
    messages: {
      create: async (params) => {
        calls.push((params.messages as Array<{ role: string; content: unknown }>).map((m) => ({ ...m })));
        n += 1;
        if (n === 1) {
          // The sandbox loop hit its per-response cap mid-execution.
          return {
            stop_reason: "pause_turn",
            content: [
              { type: "text", text: "Running a quick check..." },
              { type: "server_tool_use", text: undefined },
            ],
          };
        }
        return { stop_reason: "end_turn", content: [{ type: "text", text: "Verified: 42." }] };
      },
    },
  };

  const text = await createAnthropicReasoner(fake)!({ id: "R1", prompt: "compute it" });
  assert.equal(text, "Verified: 42.");
  assert.equal(calls.length, 2, "paused turn is resumed exactly once");
  // The resume re-sends the original user turn plus the paused assistant turn,
  // with no extra user message appended.
  assert.equal(calls[1]?.length, 2);
  assert.equal(calls[1]?.[0]?.role, "user");
  assert.equal(calls[1]?.[1]?.role, "assistant");
});

test("reasoner bounds an unending pause loop", async () => {
  let n = 0;
  const fake: LLMClient = {
    messages: {
      create: async () => {
        n += 1;
        return { stop_reason: "pause_turn", content: [{ type: "text", text: `chunk ${n}` }] };
      },
    },
  };
  const text = await createAnthropicReasoner(fake)!({ id: "R1" });
  assert.equal(n, 6, "stops at MAX_CONTINUATIONS instead of looping forever");
  // Falls back to whatever text the final (still-paused) turn carried.
  assert.equal(text, "chunk 6");
});

test("reasoner tolerates code-execution result blocks and ignores non-text", async () => {
  const fake: LLMClient = {
    messages: {
      create: async () => ({
        stop_reason: "end_turn",
        content: [
          { type: "server_tool_use", text: undefined },
          { type: "bash_code_execution_tool_result", text: undefined },
          { type: "text", text: "The mean is 5.5." },
        ],
      }),
    },
  };
  const text = await createAnthropicReasoner(fake)!({ id: "R1", prompt: "stats" });
  assert.equal(text, "The mean is 5.5.");
});

test("reasoner tolerates an empty model response", async () => {
  const fake: LLMClient = { messages: { create: async () => ({ content: [] }) } };
  const text = await createAnthropicReasoner(fake)!({ id: "R1" });
  assert.equal(text, "(model returned no text)");
});
