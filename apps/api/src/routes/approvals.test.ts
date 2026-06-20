import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveApprovalDecision } from "./approvals.js";

test("approved → approval approved + run resumes (running)", () => {
  assert.deepEqual(resolveApprovalDecision("approved"), { approval: "approved", run: "running" });
});

test("rejected → approval rejected + run cancelled", () => {
  assert.deepEqual(resolveApprovalDecision("rejected"), { approval: "rejected", run: "cancelled" });
});

test("any other value is invalid (→ 400 at the route)", () => {
  for (const bad of [undefined, null, "", "maybe", "APPROVED", 1, {}, "pending"]) {
    assert.equal(resolveApprovalDecision(bad), null, `expected null for ${JSON.stringify(bad)}`);
  }
});
