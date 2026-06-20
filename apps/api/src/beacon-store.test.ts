import { test } from "node:test";
import assert from "node:assert/strict";
import { eventToRow, rowToEvent } from "./beacon-store.js";

const event = {
  id: "evt_1",
  type: "beacon.command.started" as const,
  timestamp: "2026-06-20T00:00:00.000Z",
  source: "claude-code" as const,
  status: "running" as const,
  title: "Bash",
  message: "echo hi",
  metadata: { tool: "Bash", repo: "foundryMain" },
  sessionId: "S-1",
  repoId: "foundryMain",
};

test("eventToRow maps the envelope and parses the timestamp", () => {
  const row = eventToRow(event);
  assert.equal(row.eventId, "evt_1");
  assert.equal(row.type, "beacon.command.started");
  assert.ok(row.eventTimestamp instanceof Date);
  assert.equal(row.eventTimestamp.toISOString(), event.timestamp);
  assert.equal(row.sessionId, "S-1");
  assert.equal(row.orgId, null, "absent scope refs become null, not undefined");
});

test("rowToEvent round-trips and re-sanitizes on the way out", () => {
  const row = eventToRow(event);
  const back = rowToEvent({ ...row, metadata: row.metadata ?? {} });
  assert.equal(back.id, event.id);
  assert.equal(back.type, event.type);
  assert.equal(back.timestamp, event.timestamp);
  assert.equal(back.sessionId, "S-1");
  assert.equal(back.metadata.tool, "Bash");
});

test("rowToEvent scrubs any secret that slipped into storage", () => {
  const row = eventToRow({ ...event, message: "ran sk-ABCDEFGH12345678 ok" });
  const back = rowToEvent({ ...row, metadata: row.metadata ?? {} });
  assert.ok(!back.message.includes("sk-ABCDEFGH12345678"));
  assert.ok(back.message.includes("«redacted»"));
});
