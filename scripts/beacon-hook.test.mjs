import { test } from "node:test";
import assert from "node:assert/strict";
import { buildEvent } from "./beacon-hook.mjs";
import { redactText, redactMetadata, summarize } from "./lib/beacon-redact.mjs";

// F7 — prove that no prompt body and no secret ever leaves the publisher.

test("UserPromptSubmit never carries the prompt body — only length + hash", () => {
  const secretPrompt = "deploy with sk-ABCDEFGH12345678 and Bearer abc.def.ghi please";
  const ev = buildEvent("UserPromptSubmit", { session_id: "s1", prompt: secretPrompt });
  const blob = JSON.stringify(ev);
  assert.ok(!blob.includes("sk-ABCDEFGH12345678"), "secret must not appear");
  assert.ok(!blob.includes("Bearer abc.def.ghi"), "bearer must not appear");
  assert.ok(!blob.includes("deploy with"), "prompt body must not appear");
  assert.equal(ev.metadata.promptChars, secretPrompt.length);
  assert.match(ev.metadata.promptSha8, /^[0-9a-f]{8}$/);
});

test("PreToolUse redacts secrets inside a Bash command", () => {
  const ev = buildEvent("PreToolUse", {
    session_id: "s1",
    tool_name: "Bash",
    tool_input: { command: "curl -H 'Authorization: Bearer eyJhbGciOiJIUzI1Ni19.payload.sig' https://x" },
  });
  const blob = JSON.stringify(ev);
  assert.ok(!blob.includes("eyJhbGciOiJIUzI1Ni19.payload.sig"), "JWT must be redacted");
  assert.ok(blob.includes("«redacted»"), "redaction marker present");
  assert.equal(ev.type, "beacon.command.started");
});

test("PostToolUse summarizes and redacts; failure flips the type", () => {
  const ok = buildEvent("PostToolUse", { tool_name: "Read", tool_response: { ok: true, text: "x".repeat(5000) } });
  assert.equal(ok.type, "beacon.command.finished");
  assert.ok(ok.message.length <= 141, "output is summarized, not raw");

  const bad = buildEvent("PostToolUse", { tool_name: "Bash", tool_response: { error: "boom" } });
  assert.equal(bad.type, "beacon.command.failed");
  assert.equal(bad.status, "failed");
});

test("metadata keyed as a secret is dropped wholesale", () => {
  const out = redactMetadata({ tool: "Bash", ANTHROPIC_API_KEY: "sk-supersecretvalue123", tokens: 1234 });
  assert.notEqual(out.ANTHROPIC_API_KEY, "sk-supersecretvalue123");
  assert.equal(out.tool, "Bash");
  assert.equal(out.tokens, 1234, "benign telemetry key survives");
});

test("env KEY=VALUE pairs keep the key, drop the value", () => {
  assert.match(redactText("ran with ANTHROPIC_API_KEY=sk-abcdefgh12345678 set"), /ANTHROPIC_API_KEY=«redacted»/);
});

test("summarize collapses whitespace and caps length", () => {
  const s = summarize("a\n   b\t c ".repeat(50), 40);
  assert.ok(s.length <= 40);
  assert.ok(!s.includes("\n"));
});

test("every built event carries the required BeaconEvent fields", () => {
  for (const hook of ["SessionStart", "PreToolUse", "PostToolUse", "Stop", "Notification", "Whatever"]) {
    const ev = buildEvent(hook, { session_id: "s1", cwd: "/home/dev/foundryMain", tool_name: "Bash" });
    for (const k of ["id", "type", "timestamp", "source", "status", "title", "message", "metadata"]) {
      assert.ok(ev[k] !== undefined, `${hook} missing ${k}`);
    }
    assert.equal(ev.source, "claude-code");
    assert.equal(ev.repoId, "foundryMain");
  }
});
