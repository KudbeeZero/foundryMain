# NOW — what's open right now

> Read this first, every session. The team trusts the files, not anyone's memory.

## In flight

- **Execution plane — increment 1 (real reasoning)** — new PR off `main`
  - Started: 2026-06-20 · Branch: `claude/execution-plane-real-runs`
  - Owners: E03 Priya (worker), E08 Theo (LLM integration)
  - Lanes: `workers/agent-runner/src/{llm,runner,index}.ts`,
    `packages/orchestrator/src/runloop/agentEventToBeacon.ts` (QueuedRun fields)
  - Status: `IN_FLIGHT` → `AWAITING_AUDIT` on merge
  - What: a queued run now makes a real `claude-opus-4-8` call (`@anthropic-ai/sdk`
    pinned `0.105.0`, adaptive thinking + high effort) and posts the result to the
    run's channel; the Deck shows it via `beacon.command.finished`. **Reasoning
    only** — no bash/files/code-exec (operator decision). Flag-gated on
    `ANTHROPIC_API_KEY`; idle without it → dev/CI need no key. Client injected behind
    a seam → unit-tested with a fake. 58 tests green. Live model call not in CI.
  - Next: increment 2 — sandboxed tools (bash/edit) behind the Epic 5 approval gate.

## Recently merged (this session)

- **PR #8 · Epic 6** — deck polish: real pill metrics, live/demo/local, reconnect+dedupe (F17–F19). ✅ merged.
- **PR #7 · Epic 5** — real approvals + auth (F14/F15/F16). ✅ merged.
- **PR #6 · Epic 4** — worker run loop, queued run → `beacon.run.*` (F12/F13). ✅
- **PR #5 · Epic 3** — Beacon persistence + replay (F8–F11). ✅ merged.
- **PR #4 · sprint 1** — receiver, tunnel, publishers, CI, design system +
  Team Dashboard (F1/F2/F3/F5/F6/F7/F20/F21/F23/F24/F25). ✅ merged.

## On deck (next 1–2)

1. **Execution plane increment 2** — sandboxed tools (bash/edit) behind the Epic 5
   approval gate, so an approved run can actually change files/run commands safely.
2. **Hardening** — auth on `/hooks/beacon/replay`; live DB + a real `ANTHROPIC_API_KEY`
   smoke path; Postgres service in CI to exercise persistence + approval + claim writes.

> Full plan: `docs/ROADMAP.md` (see the Shipped log at the bottom).

## 5-line summary (print at chat start)

1. Current PR: Execution plane increment 1 — queued run → real claude-opus-4-8 reasoning → Deck + posted result.
2. Merged this session: PR #4 (sprint 1), #5 (Epic 3), #6 (Epic 4), #7 (Epic 5), #8 (Epic 6). On `main`.
3. Status: F1–F25 shipped; Execution plane started (reasoning real, tool execution still deferred).
4. Green gate: CI runs typecheck + orchestrator + api + publisher + worker tests; 58 green.
5. Risk notes: reasoning is real but flag-gated; live model + DB paths not exercised in CI (no key/Postgres).
