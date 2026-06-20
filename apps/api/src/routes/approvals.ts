import { Hono } from "hono";
import { and, asc, eq } from "drizzle-orm";
import { agentRuns, approvalRequests } from "@foundry/db";
import { db } from "../db.js";
import type { AuthVariables } from "../middleware/auth.js";

export const approvalsRoute = new Hono<{ Variables: AuthVariables }>();

// ---------------------------------------------------------------------------
// Pure decision logic (ROADMAP Epic 5 · F15). Maps an operator decision to the
// resulting approval status + the agent_run transition. IO-free and unit-tested;
// the route below is a thin adapter that applies it inside org-scoped DB writes.
// ---------------------------------------------------------------------------

export type ApprovalDecisionStatus = "approved" | "rejected";
export type RunTransition = "running" | "cancelled";

export interface ResolvedDecision {
  approval: ApprovalDecisionStatus;
  run: RunTransition;
}

// approve → unblock the run (back to running); reject → cancel it. Anything else
// is invalid (caller gets a 400). Keep this total over the input so the route
// never has to guess.
export function resolveApprovalDecision(decision: unknown): ResolvedDecision | null {
  if (decision === "approved") return { approval: "approved", run: "running" };
  if (decision === "rejected") return { approval: "rejected", run: "cancelled" };
  return null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/approvals — pending approvals for the caller's org, oldest first.
approvalsRoute.get("/approvals", async (c) => {
  const orgId = c.get("orgId");
  const rows = await db
    .select()
    .from(approvalRequests)
    .where(and(eq(approvalRequests.orgId, orgId), eq(approvalRequests.status, "pending")))
    .orderBy(asc(approvalRequests.createdAt));
  return c.json({ approvals: rows });
});

// POST /api/approvals/:id/decision — record a real decision and transition the run.
// Org-scoped on every read/write; idempotency-guarded (already-decided → 409).
approvalsRoute.post("/approvals/:id/decision", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const id = c.req.param("id");

  const payload = await c.req
    .json<{ decision?: unknown }>()
    .catch((): { decision?: unknown } => ({}));
  const resolved = resolveApprovalDecision(payload.decision);
  if (!resolved) {
    return c.json({ error: "decision must be 'approved' or 'rejected'" }, 400);
  }
  if (!UUID_RE.test(id)) {
    return c.json({ error: "approval not found" }, 404);
  }

  const [existing] = await db
    .select()
    .from(approvalRequests)
    .where(and(eq(approvalRequests.id, id), eq(approvalRequests.orgId, orgId)));
  if (!existing) {
    return c.json({ error: "approval not found" }, 404);
  }
  if (existing.status !== "pending") {
    return c.json({ error: "approval already decided", status: existing.status }, 409);
  }

  const [approval] = await db
    .update(approvalRequests)
    .set({ status: resolved.approval, decidedByUserId: userId, decidedAt: new Date() })
    .where(and(eq(approvalRequests.id, id), eq(approvalRequests.orgId, orgId)))
    .returning();

  // Transition the gated run. cancelled is terminal, so stamp finishedAt.
  await db
    .update(agentRuns)
    .set({
      status: resolved.run,
      ...(resolved.run === "cancelled" ? { finishedAt: new Date() } : {}),
    })
    .where(and(eq(agentRuns.id, existing.runId), eq(agentRuns.orgId, orgId)));

  return c.json({ approval, runStatus: resolved.run });
});
