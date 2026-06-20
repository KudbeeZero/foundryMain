import { test } from "node:test";
import assert from "node:assert/strict";
import type { AgentEvent } from "@foundry/shared";
import { advanceRun, agentEventToBeacon } from "./agentEventToBeacon.js";

const ctx = { agentId: "E03", repoId: "foundryMain", workOrderId: "WO-1", now: "2026-06-20T00:00:00.000Z" };

test("run.started → beacon.run.started with scope + deterministic id", () => {
  const be = agentEventToBeacon({ type: "run.started", runId: "R1", at: "2026-06-20T01:00:00.000Z" }, ctx)!;
  assert.equal(be.type, "beacon.run.started");
  assert.equal(be.status, "running");
  assert.equal(be.runId, "R1");
  assert.equal(be.agentId, "E03");
  assert.equal(be.id, "run:R1:started");
  assert.equal(be.timestamp, "2026-06-20T01:00:00.000Z", "uses the event's own `at`");
});

test("run.failed carries the error and redacts secrets in it", () => {
  const be = agentEventToBeacon({ type: "run.failed", runId: "R1", error: "died: sk-ABCDEFGH12345678", at: ctx.now }, ctx)!;
  assert.equal(be.type, "beacon.run.failed");
  assert.equal(be.status, "failed");
  assert.ok(!be.message.includes("sk-ABCDEFGH12345678"));
  assert.ok(be.message.includes("«redacted»"));
});

test("tool.requested → command.started, input summarized + redacted", () => {
  const ev: AgentEvent = { type: "tool.requested", runId: "R1", toolCallId: "tc1", toolName: "Bash", input: { command: "echo Bearer abc.def.ghijkl" } };
  const be = agentEventToBeacon(ev, ctx)!;
  assert.equal(be.type, "beacon.command.started");
  assert.equal(be.title, "Bash");
  assert.ok(!be.message.includes("Bearer abc.def.ghijkl"));
});

test("tool.executed ok/!ok flips finished/failed", () => {
  assert.equal(agentEventToBeacon({ type: "tool.executed", runId: "R1", toolCallId: "t", ok: true, output: {} }, ctx)!.type, "beacon.command.finished");
  assert.equal(agentEventToBeacon({ type: "tool.executed", runId: "R1", toolCallId: "t", ok: false, output: {} }, ctx)!.type, "beacon.command.failed");
});

test("approval.requested/decided map to approval beacons", () => {
  assert.equal(agentEventToBeacon({ type: "approval.requested", runId: "R1", approvalId: "a1", toolCallId: "t" }, ctx)!.type, "beacon.approval.required");
  const dec = agentEventToBeacon({ type: "approval.decided", runId: "R1", approvalId: "a1", decision: "rejected" }, ctx)!;
  assert.equal(dec.type, "beacon.approval.decided");
  assert.equal(dec.status, "blocked");
});

test("events with no Deck surface map to null", () => {
  assert.equal(agentEventToBeacon({ type: "run.queued", runId: "R1", agentId: "E03", at: ctx.now }, ctx), null);
  assert.equal(agentEventToBeacon({ type: "message.posted", runId: "R1", channelId: "c", messageId: "m" }, ctx), null);
});

test("advanceRun is a deterministic start→complete lifecycle", () => {
  const evs = advanceRun({ id: "R9" }, ctx.now);
  assert.deepEqual(evs.map((e) => e.type), ["run.started", "run.completed"]);
  assert.equal(evs[0]!.runId, "R9");
});
