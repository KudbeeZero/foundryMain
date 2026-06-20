# NOW — what's open right now

> Read this first, every session. The team trusts the files, not anyone's memory.

## In flight

- **Epic 4 — Worker run loop** — new PR off `main`
  - Started: 2026-06-20 · Branch: `claude/epic4-worker-run-loop`
  - Owners: E03 Priya (worker), E10 Lex (orchestration bridge)
  - Lanes: `packages/orchestrator/src/runloop/**`, `workers/agent-runner/src/**`,
    `.github/workflows/ci.yml`, docs
  - Status: `IN_FLIGHT` → `AWAITING_AUDIT` on merge
  - What: agent-runner claims queued `agent_runs` and advances them (F12); pure
    `agentEventToBeacon` bridge maps `AgentEvent` → `beacon.run.*` and the worker
    POSTs to the receiver (F13). IO injected → bridge+runner unit-tested with no
    DB/Redis. Real agent reasoning/tools still deferred (Execution plane).
  - Note: PR #4 (sprint 1) and PR #5 (Epic 3 persistence) both merged to `main`.

## Recently merged (this session)

- **PR #5 · Epic 3** — Beacon persistence + replay (F8–F11). ✅ merged.
- **PR #4 · sprint 1** — receiver, tunnel, publishers, CI, design system +
  Team Dashboard (F1/F2/F3/F5/F6/F7/F20/F21/F23/F24/F25). ✅ merged.

## On deck (next 1–2)

1. **Epic 5 (F14–F16)** — wire Supabase auth + turn the UI-only approval gate into
   a real one (also closes the `beacon_events`/replay RLS GAP).
2. **Epic 6 (F17–F19)** — deck polish: real metrics in the pill, live-vs-mock
   indicator, reconnect/backoff + dedupe in `useBeacon`.

> Full plan: `docs/ROADMAP.md` (see the Shipped log at the bottom).

## 5-line summary (print at chat start)

1. Current PR: Epic 4 worker run loop (F12/F13) — queued run → `beacon.run.*` → Deck.
2. Merged this session: PR #4 (sprint 1), PR #5 (Epic 3 persistence). On `main`.
3. Risk: low — additive; bridge+runner pure/injected; worker DB/HTTP guarded + fail-open.
4. Green gate: CI runs typecheck + orchestrator + api + publisher + worker tests; all green.
5. On deck: Epic 5 auth + real approvals, then Epic 6 deck polish.
