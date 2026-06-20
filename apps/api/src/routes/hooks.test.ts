import { test } from "node:test";
import assert from "node:assert/strict";
import { handleBeaconHook } from "./hooks.js";

const validEvent = {
  id: "evt_1",
  type: "beacon.claude.statusline.snapshot",
  timestamp: "2026-06-20T00:00:00.000Z",
  source: "claude-code",
  status: "thinking",
  title: "statusline",
  message: "◆ foundryMain",
  metadata: { repo: "foundryMain" },
};

test("503 when no token is configured (fail-closed)", () => {
  const res = handleBeaconHook("", "anything", validEvent);
  assert.equal(res.status, 503);
});

test("401 when the token is missing", () => {
  const res = handleBeaconHook("topsecret", undefined, validEvent);
  assert.equal(res.status, 401);
});

test("401 when the token is wrong (incl. different length)", () => {
  assert.equal(handleBeaconHook("topsecret", "nope", validEvent).status, 401);
  assert.equal(handleBeaconHook("topsecret", "topsecreX", validEvent).status, 401);
});

test("400 when the body is not a valid BeaconEvent", () => {
  assert.equal(handleBeaconHook("topsecret", "topsecret", { nope: true }).status, 400);
  assert.equal(handleBeaconHook("topsecret", "topsecret", undefined).status, 400);
});

test("202 and redacts secrets server-side when the token matches", () => {
  const secretEvent = {
    ...validEvent,
    message: "auth Bearer abc.def.ghi and key sk-ABCDEFGH12345678",
    metadata: { repo: "foundryMain", ANTHROPIC_API_KEY: "sk-supersecretvalue123" },
  };
  const res = handleBeaconHook("topsecret", "topsecret", secretEvent);
  assert.equal(res.status, 202);
  assert.equal(res.body.accepted, true);

  const event = res.body.event as { message: string; metadata: Record<string, unknown> };
  // Token shapes are scrubbed from the message.
  assert.ok(!event.message.includes("sk-ABCDEFGH12345678"));
  assert.ok(!event.message.includes("Bearer abc.def.ghi"));
  // A sensitive metadata key never survives; a benign one does.
  assert.notEqual(event.metadata.ANTHROPIC_API_KEY, "sk-supersecretvalue123");
  assert.equal(event.metadata.repo, "foundryMain");
});
