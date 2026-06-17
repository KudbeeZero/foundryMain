# NOW — what's open right now

> Read this first, every session. The team trusts the files, not anyone's memory.

## In flight

- **Stage 2 · Command Deck + Beacon foundation**
  - Started: 2026-06-17
  - Owner: E10 — Lex (Architect)
  - Lanes: `docs/**`, `apps/web/**`, `packages/shared/**`, `packages/orchestrator/**`, `apps/api/src/routes/demo.ts`
  - Status: `IN_FLIGHT` → `AWAITING_AUDIT` on merge
  - What: first browser Command Deck (Beacon pill, roster, teams, work-order
    board, runs, approvals, memory layers) + shared Beacon event schema/reducer +
    mock data. No DB migration. No cloud dependency. Auth boundary untouched.

## On deck (next 1–2)

1. Real Claude Code statusLine publisher → Beacon (Phase 2).
2. Persist Beacon events to `audit_log` and replay on load.

## 5-line summary (print at chat start)

1. Current PR: Stage 2 Command Deck + Beacon foundation.
2. Owner: E10 Lex. Lanes: docs, apps/web, packages/shared, orchestrator, demo route.
3. Risk: low — additive only, no migration, mock data, auth intact.
4. Reviewers: E03 (API), E07 (auth boundary), E08 (tests).
5. On deck: real statusLine publisher, then Beacon persistence.
