import {
  advanceRun,
  agentEventToBeacon,
  type QueuedRun,
} from "@foundry/orchestrator";
import type { AgentEvent, BeaconEvent } from "@foundry/shared";

// Agent-runner core (ROADMAP Epic 4 · F12/F13). Pure-ish orchestration with all IO
// injected so it is unit-testable with no DB / Redis / network: the worker entry
// (index.ts) supplies real adapters; tests supply in-memory ones.

export type TerminalRunStatus = "succeeded" | "failed";

export interface RunnerDeps {
  // Claim the next batch of queued runs (and mark them running) — returns what to process.
  claimQueued: () => Promise<QueuedRun[]>;
  // Publish one Beacon event (worker → receiver).
  emit: (event: BeaconEvent) => Promise<void>;
  // Persist the run's terminal status.
  markStatus: (runId: string, status: TerminalRunStatus) => Promise<void>;
  // Execution plane: produce a real model result for the run. When absent (no
  // ANTHROPIC_API_KEY), the run uses the placeholder start→complete lifecycle.
  reason?: (run: QueuedRun) => Promise<string>;
  // Persist the model's result back to the run's channel (best-effort).
  postResult?: (run: QueuedRun, text: string) => Promise<void>;
  // Clock (injectable for deterministic tests).
  now?: () => string;
}

// Drive one run through its lifecycle, emitting a Beacon event per transition. A
// failure anywhere flips the run to failed and emits beacon.run.failed. Emit/mark
// errors in the failure path are swallowed so one bad run can't crash the loop.
export async function processRun(run: QueuedRun, deps: RunnerDeps): Promise<TerminalRunStatus> {
  const now = deps.now ?? (() => new Date().toISOString());
  const ctx = { agentId: run.agentId, repoId: run.repoId, workOrderId: run.taskId, now: now() };
  const push = async (ae: AgentEvent) => {
    const be = agentEventToBeacon(ae, ctx);
    if (be) await deps.emit(be);
  };
  try {
    if (deps.reason) {
      // Real model run (Execution plane). Modeled as a "respond" tool call so the
      // existing bridge surfaces the result text on the Deck (command.finished).
      await push({ type: "run.started", runId: run.id, at: ctx.now });
      await push({ type: "tool.requested", runId: run.id, toolCallId: "respond", toolName: "respond", input: {} });
      const text = await deps.reason(run);
      await push({ type: "tool.executed", runId: run.id, toolCallId: "respond", ok: true, output: text });
      if (deps.postResult) {
        try {
          await deps.postResult(run, text);
        } catch {
          /* posting the result is best-effort */
        }
      }
      await push({ type: "run.completed", runId: run.id, at: ctx.now });
    } else {
      // No reasoner configured → placeholder start→complete lifecycle (Epic 4).
      for (const ae of advanceRun(run, ctx.now)) await push(ae);
    }
    await deps.markStatus(run.id, "succeeded");
    return "succeeded";
  } catch (err) {
    const failed = agentEventToBeacon(
      { type: "run.failed", runId: run.id, error: String(err instanceof Error ? err.message : err), at: now() },
      ctx,
    );
    if (failed) {
      try {
        await deps.emit(failed);
      } catch {
        /* receiver down — fail-open */
      }
    }
    try {
      await deps.markStatus(run.id, "failed");
    } catch {
      /* db down — best effort */
    }
    return "failed";
  }
}

// Claim and process one batch of queued runs. Returns how many were processed.
export async function runOnce(deps: RunnerDeps): Promise<{ processed: number }> {
  const runs = await deps.claimQueued();
  let processed = 0;
  for (const run of runs) {
    await processRun(run, deps);
    processed += 1;
  }
  return { processed };
}
