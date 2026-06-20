# NOW — what's open right now

> Read this first, every session. The team trusts the files, not anyone's memory.

## In flight

- **Roadmap + Beacon hook receiver (ROADMAP F1/F2)** — PR #4
  - Started: 2026-06-20
  - Owner: E03 — Priya (Backend) · receiver · E10 Lex authored `docs/ROADMAP.md`
  - Lanes: `docs/ROADMAP.md`, `docs/memory/**`, `apps/api/src/routes/hooks.ts`,
    `apps/api/src/{index,env}.ts`, `apps/api/src/routes/index.ts`, `.env.example`
  - Status: `IN_FLIGHT` → `AWAITING_AUDIT` on merge
  - What: the prioritized features backlog (`docs/ROADMAP.md`, 7 epics / F1–F22)
    plus the first feature — `POST /hooks/beacon`, an `x-beacon-token`-guarded,
    fail-closed receiver that sanitizes every event server-side and 202s. No DB
    migration (persistence is Epic 3); `/api/*` auth boundary untouched.
  - Note: Stage 2 Command Deck + Beacon foundation already merged (see PAST).

## On deck (next 1–2) — start of ROADMAP sprint 1

1. **F3** — `cloudflared` tunnel + runbook so a dev box's receiver is publicly
   reachable (the branch's namesake; Epic 1).
2. **F5/F6** — real Claude Code statusLine + hook publishers post to the receiver.
   Then Epic 3 persistence (`audit_log`) and replay.

> Full plan: `docs/ROADMAP.md`.

## 5-line summary (print at chat start)

1. Current PR (#4): `docs/ROADMAP.md` (features backlog) + Beacon hook receiver F1/F2.
2. Owner: E03 Priya (receiver), E10 Lex (roadmap). Lanes: docs, `apps/api` routes/env.
3. Risk: low — additive only, no migration, receiver fail-closed, `/api` auth intact.
4. Reviewers: E03 (API), E07 (token guard), E08 (tests — `hooks.test.ts`, 5 green).
5. On deck: F3 cloudflared tunnel, then F5/F6 publishers, then Epic 3 persistence.
