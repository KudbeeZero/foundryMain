import { test } from "node:test";
import assert from "node:assert/strict";
import {
  beaconEvent,
  redactBeaconText,
  redactMetadata,
  sanitizeBeaconEvent,
} from "@foundry/shared";

test("redactBeaconText strips bearer tokens and provider keys", () => {
  const out = redactBeaconText("curl -H 'Authorization: Bearer abc.def.ghi' sk-ABCDEFGH1234");
  assert.ok(!out.includes("abc.def.ghi"));
  assert.ok(!out.includes("sk-ABCDEFGH1234"));
});

test("redactBeaconText keeps env key names but drops their values", () => {
  const out = redactBeaconText("DATABASE_PASSWORD=hunter2 npm run dev");
  assert.ok(out.includes("DATABASE_PASSWORD="));
  assert.ok(!out.includes("hunter2"));
});

test("redactMetadata drops values under sensitive keys and recurses", () => {
  const out = redactMetadata({
    tool: "Bash",
    apiKey: "sk-shouldNotSurvive123456",
    nested: { authorization: "Bearer xyz", note: "GITHUB_TOKEN=ghp_0123456789abcdef0123" },
  });
  assert.notEqual(out.apiKey, "sk-shouldNotSurvive123456");
  const nested = out.nested as Record<string, unknown>;
  assert.notEqual(nested.authorization, "Bearer xyz");
  assert.ok(typeof nested.note === "string" && !(nested.note as string).includes("ghp_0123456789abcdef0123"));
});

test("redactMetadata keeps the benign 'tokens' telemetry but still drops real secret keys", () => {
  const out = redactMetadata({
    tokens: 21000,
    contextPct: 47,
    costUsd: 0.27,
    access_token: "sk-shouldNotSurvive123456",
    apiToken: "ghp_0123456789abcdef0123",
  });
  // The Beacon pill needs these verbatim.
  assert.equal(out.tokens, 21000);
  assert.equal(out.contextPct, 47);
  assert.equal(out.costUsd, 0.27);
  // ...but anything that is actually a *_token key is still scrubbed.
  assert.notEqual(out.access_token, "sk-shouldNotSurvive123456");
  assert.notEqual(out.apiToken, "ghp_0123456789abcdef0123");
});

test("sanitizeBeaconEvent validates and scrubs in one pass", () => {
  const e = sanitizeBeaconEvent({
    id: "1",
    type: "beacon.command.started",
    timestamp: new Date().toISOString(),
    source: "claude-code",
    status: "running",
    title: "ran git push with token ghp_0123456789abcdef0123",
    message: "ok",
    metadata: { secret: "topsecret", command: "echo sk-LEAK1234567890" },
  });
  assert.ok(!e.title.includes("ghp_0123456789abcdef0123"));
  assert.notEqual((e.metadata as Record<string, unknown>).secret, "topsecret");
  assert.ok(!String((e.metadata as Record<string, unknown>).command).includes("sk-LEAK1234567890"));
});

test("beaconEvent rejects unknown event types", () => {
  const res = beaconEvent.safeParse({
    id: "1",
    type: "beacon.nope",
    timestamp: "now",
    source: "mock",
    status: "idle",
    title: "t",
    message: "m",
  });
  assert.equal(res.success, false);
});
