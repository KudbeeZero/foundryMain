import { test } from "node:test";
import assert from "node:assert/strict";
import type { BeaconEvent } from "@foundry/shared";
import { runOnce, type RunnerDeps } from "./runner.js";

const FIXED = "2026-06-20T00:00:00.000Z";

test("runOnce: a queued run emits run.started→run.completed and is marked succeeded", async () => {
  const emitted: BeaconEvent[] = [];
  const statuses: [string, string][] = [];
  const deps: RunnerDeps = {
    claimQueued: async () => [{ id: "R1", agentId: "A1", taskId: "T1", repoId: "foundryMain" }],
    emit: async (e) => { emitted.push(e); },
    markStatus: async (id, s) => { statuses.push([id, s]); },
    now: () => FIXED,
  };

  const { processed } = await runOnce(deps);

  assert.equal(processed, 1);
  assert.deepEqual(emitted.map((e) => e.type), ["beacon.run.started", "beacon.run.completed"]);
  assert.equal(emitted[0]!.runId, "R1");
  assert.equal(emitted[0]!.agentId, "A1");
  assert.equal(emitted[0]!.source, "worker");
  assert.deepEqual(statuses, [["R1", "succeeded"]]);
});

test("runOnce: an emit failure flips the run to failed (beacon.run.failed + marked failed)", async () => {
  const emitted: BeaconEvent[] = [];
  const statuses: [string, string][] = [];
  let calls = 0;
  const deps: RunnerDeps = {
    claimQueued: async () => [{ id: "R2" }],
    emit: async (e) => {
      calls += 1;
      if (calls === 1) throw new Error("receiver boom");
      emitted.push(e);
    },
    markStatus: async (id, s) => { statuses.push([id, s]); },
    now: () => FIXED,
  };

  await runOnce(deps);

  assert.ok(emitted.some((e) => e.type === "beacon.run.failed"), "emits run.failed after the throw");
  assert.deepEqual(statuses, [["R2", "failed"]]);
});

test("runOnce: empty queue is a no-op", async () => {
  const deps: RunnerDeps = {
    claimQueued: async () => [],
    emit: async () => {},
    markStatus: async () => {},
  };
  assert.deepEqual(await runOnce(deps), { processed: 0 });
});
