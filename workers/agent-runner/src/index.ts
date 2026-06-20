import { eq } from "drizzle-orm";
import { createDb, agentRuns } from "@foundry/db";
import type { QueuedRun } from "@foundry/orchestrator";
import type { BeaconEvent } from "@foundry/shared";
import { runOnce, type RunnerDeps, type TerminalRunStatus } from "./runner.js";

export const PACKAGE = "@foundry/worker-agent-runner" as const;
export * from "./runner.js";

// Real IO adapters wiring the agent-runner core to the database (claim/mark runs)
// and the Beacon receiver (emit events). Everything is guarded + fail-open so the
// worker degrades cleanly when the DB or receiver is unavailable.

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
        .select({ id: agentRuns.id, agentId: agentRuns.agentId, taskId: agentRuns.taskId })
        .from(agentRuns)
        .where(eq(agentRuns.status, "queued"))
        .limit(10);
      // Claim them so a second tick doesn't pick them up again.
      for (const r of rows) {
        await db.update(agentRuns).set({ status: "running", startedAt: new Date() }).where(eq(agentRuns.id, r.id));
      }
      return rows.map((r) => ({ id: r.id, agentId: r.agentId ?? undefined, taskId: r.taskId ?? undefined }));
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
