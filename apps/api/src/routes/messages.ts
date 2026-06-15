import { Hono } from "hono";
import { and, eq, inArray } from "drizzle-orm";
import { agentRuns, agents, messages } from "@foundry/db";
import { db } from "../db.js";
import type { AuthVariables } from "../middleware/auth.js";

export const messagesRoute = new Hono<{ Variables: AuthVariables }>();

// POST /api/channels/:channelId/messages
// Persists a channel message and, for every mentioned agent handle that exists in
// the caller's org, enqueues an agent_run (status: queued). The Orchestration plane
// (Stage 3) consumes those queued runs. This is the entry point of the MVP loop:
// a message mentioning @first-agent ultimately drives the agent runner.
messagesRoute.post("/channels/:channelId/messages", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.get("userId");
  const channelId = c.req.param("channelId");

  const payload = await c.req.json<{ body?: unknown }>();
  const body = payload.body;
  if (typeof body !== "string" || body.trim().length === 0) {
    return c.json({ error: "body is required" }, 400);
  }

  const handles = [...body.matchAll(/@([a-z0-9_-]+)/gi)].map((m) =>
    m[1]!.toLowerCase(),
  );

  const [message] = await db
    .insert(messages)
    .values({
      orgId,
      channelId,
      authorUserId: userId,
      body,
      mentions: handles,
    })
    .returning();

  let runs: { id: string; agentId: string }[] = [];
  if (message && handles.length > 0) {
    const mentioned = await db
      .select({ id: agents.id })
      .from(agents)
      .where(and(eq(agents.orgId, orgId), inArray(agents.handle, handles)));

    if (mentioned.length > 0) {
      runs = await db
        .insert(agentRuns)
        .values(
          mentioned.map((a) => ({
            orgId,
            agentId: a.id,
            channelId,
            triggeringMessageId: message.id,
            status: "queued" as const,
          })),
        )
        .returning({ id: agentRuns.id, agentId: agentRuns.agentId });
    }
  }

  return c.json({ message, runs }, 201);
});
