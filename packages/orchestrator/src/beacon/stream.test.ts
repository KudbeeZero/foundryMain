import { test } from "node:test";
import assert from "node:assert/strict";
import { nextBackoffMs, selectUnseen } from "./stream.js";
import type { BeaconEvent } from "@foundry/shared";

const ev = (id: string): BeaconEvent => ({
  id,
  type: "beacon.run.started",
  timestamp: "2026-06-20T00:00:00.000Z",
  source: "worker",
  status: "running",
  title: "t",
  message: "m",
  metadata: {},
});

test("selectUnseen filters ids already seen", () => {
  const seen = new Set(["a", "b"]);
  const fresh = selectUnseen(seen, [ev("a"), ev("c"), ev("b"), ev("d")]);
  assert.deepEqual(fresh.map((e) => e.id), ["c", "d"]);
});

test("selectUnseen de-duplicates within the same batch, preserving order", () => {
  const fresh = selectUnseen(new Set(), [ev("x"), ev("y"), ev("x"), ev("z"), ev("y")]);
  assert.deepEqual(fresh.map((e) => e.id), ["x", "y", "z"]);
});

test("selectUnseen returns [] when everything is seen", () => {
  assert.deepEqual(selectUnseen(new Set(["a"]), [ev("a")]), []);
});

test("nextBackoffMs doubles from base and caps at max", () => {
  assert.equal(nextBackoffMs(0, { baseMs: 1000, maxMs: 30000 }), 1000);
  assert.equal(nextBackoffMs(1, { baseMs: 1000, maxMs: 30000 }), 2000);
  assert.equal(nextBackoffMs(2, { baseMs: 1000, maxMs: 30000 }), 4000);
  assert.equal(nextBackoffMs(5, { baseMs: 1000, maxMs: 30000 }), 30000, "capped");
  assert.equal(nextBackoffMs(99, { baseMs: 1000, maxMs: 30000 }), 30000, "stays capped");
});

test("nextBackoffMs floors negative/fractional attempts to base", () => {
  assert.equal(nextBackoffMs(-3, { baseMs: 500 }), 500);
  assert.equal(nextBackoffMs(1.9, { baseMs: 500 }), 1000);
});
