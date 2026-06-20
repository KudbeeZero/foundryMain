import { eq } from "drizzle-orm";
import { createDb, agentRuns, messages } from "@foundry/db";
import type { QueuedRun } from "@foundry/orchestrator";
import type { BeaconEvent } from "@foundry/shared";
import { runOnce, type RunnerDeps, type TerminalRunStatus } from "./runner.js";
import { createAnthropicReasoner } from "./llm.js";

export const PACKAGE = "@foundry/worker-agent-runner" as const;
export * from "./runner.js";
export * from "./llm.js";

// Real IO adapters wiring the agent-runner core to the database (claim/mark runs,
// fetch the triggering prompt, post the result) and the Beacon receiver. Everything
// is guarded + fail-open so the worker degrades cleanly when the DB or receiver is
// unavailable.

const TERMINAL: Record<TerminalRunStatus, "succeeded" | "failed"> = {
  succeeded: "succeeded",
  failed: "failed",
};

function buildDeps(): RunnerDeps | null {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null; // nothing to poll without a database
  const db = createDb(databaseUrl);

  const beaconUrl = process.env.FOUNDRY_BEACON_URL;
  const beaconToken = process.env.BEACON_HOOK_TOKEN;

  return {
    claimQueued: async (): Promise<QueuedRun[]> => {
      const rows = await db
        .select({
          id: agentRuns.id,
          agentId: agentRuns.agentId,
          taskId: agentRuns.taskId,
          orgId: agentRuns.orgId,
          channelId: agentRuns.channelId,
          triggeringMessageId: agentRuns.triggeringMessageId,
        })
        .from(agentRuns)
        .where(eq(agentRuns.status, "queued"))
        .limit(10);

      const claimed: QueuedRun[] = [];
      for (const r of rows) {
        // Claim it so a second tick doesn't pick it up again.
        await db.update(agentRuns).set({ status: "running", startedAt: new Date() }).where(eq(agentRuns.id, r.id));
        let prompt: string | undefined;
        if (r.triggeringMessageId) {
          const [m] = await db
            .select({ body: messages.body })
            .from(messages)
            .where(eq(messages.id, r.triggeringMessageId))
            .limit(1);
          prompt = m?.body ?? undefined;
        }
        claimed.push({
          id: r.id,
          agentId: r.agentId ?? undefined,
          taskId: r.taskId ?? undefined,
          orgId: r.orgId ?? undefined,
          channelId: r.channelId ?? undefined,
          prompt,
        });
      }
      return claimed;
    },

    emit: async (event: BeaconEvent): Promise<void> => {
      if (!beaconUrl || !beaconToken) return; // not configured → no-op
      try {
        await fetch(`${beaconUrl.replace(/\/$/, "")}/hooks/beacon`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-beacon-token": beaconToken },
          body: JSON.stringify(event),
        });
      } catch {
        /* receiver down → fail-open */
      }
    },

    markStatus: async (runId, status): Promise<void> => {
      await db.update(agentRuns).set({ status: TERMINAL[status], finishedAt: new Date() }).where(eq(agentRuns.id, runId));
    },

    // Real Claude reasoning when ANTHROPIC_API_KEY is set; otherwise undefined →
    // the worker falls back to the placeholder lifecycle.
    reason: createAnthropicReasoner() ?? undefined,

    // Post the model's result back to the run's channel as an agent-authored message.
    postResult: async (run, text): Promise<void> => {
      if (!run.orgId || !run.channelId) return;
      await db.insert(messages).values({
        orgId: run.orgId,
        channelId: run.channelId,
        authorAgentId: run.agentId ?? null,
        body: text,
      });
    },
  };
}

export async function main(): Promise<void> {
  const deps = buildDeps();
  if (!deps) {
    console.log(`${PACKAGE}: no DATABASE_URL — idle (nothing to poll).`);
    return;
  }
  const { processed } = await runOnce(deps);
  console.log(`${PACKAGE}: processed ${processed} queued run(s).`);
}

// Run when invoked directly (not when imported by tests).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(`${PACKAGE}: fatal`, err);
    process.exit(1);
  });
}
