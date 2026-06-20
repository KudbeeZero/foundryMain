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

test("reasoner sends opus-4-8 + adaptive thinking and returns the joined text", async () => {
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
});

test("reasoner tolerates an empty model response", async () => {
  const fake: LLMClient = { messages: { create: async () => ({ content: [] }) } };
  const text = await createAnthropicReasoner(fake)!({ id: "R1" });
  assert.equal(text, "(model returned no text)");
});
