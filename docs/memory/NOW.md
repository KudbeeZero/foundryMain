# NOW — what's open right now

> Read this first, every session. The team trusts the files, not anyone's memory.

## In flight

- **Epic 5 — Real approvals + auth** — new PR off `main`
  - Started: 2026-06-20 · Branch: `claude/epic5-auth-approvals`
  - Owners: E07 Amara (auth), E03 Priya (approval gate), E01 Maya (Deck)
  - Lanes: `apps/api/src/middleware/auth.ts`, `apps/api/src/routes/approvals.ts`,
    `apps/web/src/hooks/useBeacon.ts`, `packages/db/migrations/**`, docs
  - Status: `IN_FLIGHT` → `AWAITING_AUDIT` on merge
  - What: F14 auth was already wired — hardened + a hermetic `jose` test. F15 real
    `/api/approvals` + decision endpoint (org-scoped DB write + run transition;
    approve→running, reject→cancelled). F16 Deck calls the real endpoint (demo
    fallback). Bonus: `beacon_events` RLS migration. 46 tests green.
  - Decisions for review: reject **cancels** the run; demo falls back to local.
  - Open after this: real *tool execution* after approval (Execution plane).

## Recently merged (this session)

- **PR #6 · Epic 4** — worker run loop, queued run → `beacon.run.*` (F12/F13). ✅
- **PR #5 · Epic 3** — Beacon persistence + replay (F8–F11). ✅ merged.
- **PR #4 · sprint 1** — receiver, tunnel, publishers, CI, design system +
  Team Dashboard (F1/F2/F3/F5/F6/F7/F20/F21/F23/F24/F25). ✅ merged.

## On deck (next 1–2)

1. **Epic 6 (F17–F19)** — deck polish: real metrics in the pill, live-vs-mock
   indicator, reconnect/backoff + dedupe in `useBeacon`.
2. **Execution plane** — real agent reasoning + tool execution after a run starts
   (today `advanceRun` is a placeholder start→complete).

> Full plan: `docs/ROADMAP.md` (see the Shipped log at the bottom).

## 5-line summary (print at chat start)

1. Current PR: Epic 5 auth + real approvals (F14–F16) — authed `/api/approvals` decision → DB + run transition.
2. Merged this session: PR #4 (sprint 1), #5 (Epic 3), #6 (Epic 4). On `main`.
3. Risk: auth boundary is real + tested (hermetic `jose`); approval DB path not run in CI (no Postgres).
4. Green gate: CI runs typecheck + orchestrator + api + publisher + worker tests; 46 green.
5. On deck: Epic 6 deck polish, then the Execution plane (real tool runs).
