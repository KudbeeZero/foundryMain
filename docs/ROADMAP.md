# ROADMAP — features we can start working on

> Picks up from `docs/memory/NOW.md` + `docs/memory/FUTURE.md`. The Command Deck
> (Stage 2) is live on **mock data**. Everything below turns it into a deck that
> shows **real** AI sessions, with persistence, real approvals, and a way to
> reach a dev box from anywhere.
>
> Format: each epic has a goal, the GAP/horizon it closes, and `Fn` features.
> Each feature: **owner** (roster ID), **lanes** (file paths), **depends on**,
> and **done-when** (acceptance). Pick top-down — epics are ordered by what
> unblocks the most.

## Legend

- Priority: **P0** start now · **P1** next · **P2** later
- Owners: see `docs/team-system/team/ROSTER.md` (E01 Maya … E10 Lex)
- "done-when" is the merge gate; typecheck (`pnpm -r exec tsc --noEmit`) stays green throughout.

---

## Epic 1 · Cloudflare Tunnel + public Beacon receiver  `P0`

**Goal:** expose the local API's `POST /hooks/beacon` receiver over a stable
public URL so a developer's Claude Code session (or a hosted Deck) can publish
events without port-forwarding or deploying. This is the branch's namesake and
the connectivity layer everything "real-session" depends on.
**Closes:** GAP "No real Claude Code hooks" (connectivity half) · unblocks H+1.

| ID | Feature | Owner | Lanes | Depends on | Done-when |
|----|---------|-------|-------|-----------|-----------|
| F1 | `POST /hooks/beacon` receiver endpoint that validates a `BeaconEvent`, runs `sanitizeBeaconEvent()`, and returns 202 | E03 | `apps/api/src/routes/**`, `apps/api/src/index.ts` | — | curl posts a snapshot event and gets 202; secrets in body are redacted server-side |
| F2 | Shared-secret guard for the receiver (`x-beacon-token` header vs `BEACON_HOOK_TOKEN`), fail-closed | E07 | `apps/api/src/middleware/**`, `apps/api/src/env.ts` | F1 | request without/with-wrong token → 401; correct token → passes |
| F3 | `cloudflared` quick-tunnel + named-tunnel runbook + helper script | E06 | `scripts/**`, `docs/CLOUDFLARE_TUNNEL.md`, `.env.example` | F1 | `pnpm tunnel` prints a public URL that reaches `/health` and `/hooks/beacon` |
| F4 | Tunnel config docs: DNS, ingress rules, token storage, "fail open, never block the session" rule | E10 | `docs/CLOUDFLARE_TUNNEL.md` | F3 | a new dev can stand up the tunnel from the doc alone |

---

## Epic 2 · Real Claude Code → Beacon publisher  `P0`  (H+1)

**Goal:** ship the statusLine script + hook scripts so real coding sessions
appear on the Deck. Contracts already exist in `docs/CLAUDE_CODE_INTEGRATION.md`.
**Closes:** GAP "No real Claude Code hooks" (publisher half).

| ID | Feature | Owner | Lanes | Depends on | Done-when |
|----|---------|-------|-------|-----------|-----------|
| F5 | POSIX `bash`+`jq`+`curl` statusLine publisher (companion to the PowerShell sketch) | E06 | `scripts/beacon-statusline.sh` | F1 | configured as Claude Code `statusLine.command`, a session emits `beacon.claude.statusline.snapshot` to the Deck |
| F6 | `scripts/beacon-hook.mjs` mapping `PreToolUse`/`PostToolUse`/`Stop`/`SessionStart` → Beacon events per the integration table | E06 | `scripts/beacon-hook.mjs`, `.claude/settings.json` (example) | F1, F2 | wiring the hook config produces command.started/finished + session.started/stopped on the Deck |
| F7 | Client-side redaction pass before POST (no prompt bodies, no secrets) with a unit test | E08 | `scripts/**`, `**/*.test.ts` | F5, F6 | test proves a planted `sk-…`/Bearer/env pair never leaves the publisher |

---

## Epic 3 · Persist + replay the Beacon stream  `P1`  (H+3)

**Goal:** durable, multi-client Deck that survives refresh/restart by persisting
`BeaconEvent`s and rehydrating through `reduceBeaconEvents`.
**Closes:** GAP "Beacon events are in-memory only."

| ID | Feature | Owner | Lanes | Depends on | Done-when |
|----|---------|-------|-------|-----------|-----------|
| F8 | Additive, nullable-only migration: persist Beacon events (target `audit_log` or a `beacon_events` view) | E05 | `packages/db/src/schema.ts`, `packages/db/migrations/**` | — | `pnpm --filter @foundry/db db:generate` produces a clean additive migration |
| F9 | Receiver writes sanitized events to the store (behind a flag) | E03 | `apps/api/src/routes/**`, `apps/api/src/db.ts` | F1, F8 | a posted event is readable back from the DB |
| F10 | `GET /hooks/beacon/replay` (or extend `/demo/beacon/*`) returns the persisted stream | E03 | `apps/api/src/routes/**` | F9 | endpoint returns events newest-first, redacted |
| F11 | Deck hydrates from the real stream on load, then ticks live | E01 | `apps/web/src/hooks/useBeacon.ts` | F10 | refresh shows real history, not mock |

---

## Epic 4 · Worker run loop emits Beacon  `P1`  (H+2)

**Goal:** a `@agent` mention drives a queued run that lights up the Deck —
the first end-to-end loop.
**Closes:** "Worker emitters not wired."

| ID | Feature | Owner | Lanes | Depends on | Done-when |
|----|---------|-------|-------|-----------|-----------|
| F12 | `workers/agent-runner` consumes queued `agent_runs` from `POST /api/channels/:id/messages` | E03 | `workers/agent-runner/src/**`, `packages/orchestrator/src/**` | F8 | enqueuing a run transitions it through the state machine |
| F13 | Runner emits `beacon.run.started/completed/failed` through the shared reducer to the receiver | E06 | `workers/agent-runner/src/**` | F1, F12 | a mention produces run events visible on the Deck |

---

## Epic 5 · Real approvals + auth  `P1`

**Goal:** turn UI-only gates into real gates and wire the documented auth lane.
**Closes:** GAPs "Approve/Reject is UI-only" and "Auth documented but not wired."

| ID | Feature | Owner | Lanes | Depends on | Done-when |
|----|---------|-------|-------|-----------|-----------|
| F14 | Wire Supabase JWT auth provider per `docs/team-system/AUTH_INTEGRATION.md` | E07 | `apps/api/src/middleware/auth.ts` | — | `/api/*` rejects missing/invalid tokens with a real provider |
| F15 | Real approval gate: `approval_requests` write + decision persists and unblocks/cancels the run | E03 | `apps/api/src/routes/**`, `packages/db/**` | F8, F14 | approve/reject on the Deck causes a real DB write + run-state change |
| F16 | Deck Approval Queue calls the real endpoint instead of emitting a local event | E01 | `apps/web/src/components/ApprovalQueue.tsx` | F15 | a decision round-trips through the API and reflects back |

---

## Epic 6 · Command Deck UX polish  `P2`

**Goal:** make the deck feel like a real operating surface once real data flows.

| ID | Feature | Owner | Lanes | Depends on | Done-when |
|----|---------|-------|-------|-----------|-----------|
| F17 | Live context/token/cost/elapsed in the Beacon pill from real `statusline.snapshot` metadata | E01 | `apps/web/src/components/BeaconPill.tsx` | F5 | pill shows real numbers, not placeholders |
| F18 | Connection state + "live vs mock" indicator in the Command Bar | E01 | `apps/web/src/components/CommandBar.tsx` | F11 | operator can tell at a glance whether the deck is on real data |
| F19 | Reconnect/backoff + dedupe by event `id` in `useBeacon` | E02 | `apps/web/src/hooks/useBeacon.ts` | F11 | dropping/restoring the API never duplicates or freezes the stream |
| F23 | Robust gradient color system (status + 10 employee ramps + brand) | E09 | `apps/web/src/styles/tokens.css`, `apps/web/src/lib/format.ts` | — | every status/employee resolves to a token ramp; no inline hex |
| F24 | Forge Sigil (hexagon) + StatusPip replace all avatar/status circles | E09 | `apps/web/src/components/{Sigil,StatusPip}.*` | F23 | no `border-radius:50%` entity marks remain on the Deck |
| F25 | Team Dashboard — gradient panels, "who's on what" | E01 | `apps/web/src/components/TeamDashboard.*`, `App.tsx` | F23, F24 | hero surface shows each employee's live status + current job from selectors |

---

## Epic 7 · CI / DevOps hardening  `P2`

**Goal:** keep the green/red gate trustworthy as the surface area grows.

| ID | Feature | Owner | Lanes | Depends on | Done-when |
|----|---------|-------|-------|-----------|-----------|
| F20 | CI workflow: install → typecheck → test → build on PRs | E06 | `.github/workflows/**`, `turbo.json` | — | PRs show a required green check |
| F21 | Run the existing Beacon reducer/redaction tests in CI + coverage floor | E08 | `**/*.test.ts`, `.github/workflows/**` | F20 | `redaction.test.ts` + `reducer.test.ts` gate merges |
| F22 | Secret-handling lint: forbid reading `.env`/`ANTHROPIC_API_KEY` into any Beacon payload | E08 | `scripts/**`, CI | F7 | CI fails if a publisher script references a secret source |

---

## Suggested first sprint (start here)

The shortest path to "watch a **real** session on the Deck":

1. **F1** receiver endpoint  → 2. **F2** shared-secret guard  → 3. **F3** `cloudflared` tunnel
4. **F5** statusLine publisher  → 5. **F6** hook scripts  → 6. **F7** redaction test

That sequence closes the "no real hooks" gap end-to-end and gives the first true
"watch the AI team work" moment promised in `FUTURE.md` H+1 — before we invest in
persistence (Epic 3) and the worker loop (Epic 4).

> When an epic lands, move its line to `docs/memory/PAST.md`, update
> `docs/memory/NOW.md`, and retire the matching `docs/memory/GAPS.md` entry.

---

## Shipped log

> Newest first. Marks features that have landed on a branch / PR.

- **2026-06-20 · Epic 6 · Command Deck UX polish**
  - ✅ **F17** — statusline publisher (`scripts/beacon-statusline.sh`) forwards real session metrics (`costUsd`, `elapsedMs`, lines changed) from Claude Code's `.cost` via jq; the reducer + Beacon pill already consume them, so the pill shows real numbers. Fail-open (no-jq fallback = repo+model). Verified locally.
  - ✅ **F18** — connection indicator in the Command Bar: **live** (real persisted stream) / **demo** (API up, mock) / **local** (offline) with a colored dot, threaded from `useBeacon`.
  - ✅ **F19** — `useBeacon` reconnect/backoff loop polling `/hooks/beacon/replay` with exponential backoff, and **dedupe by event id** (pure `selectUnseen` + `nextBackoffMs` in `@foundry/orchestrator`, 5 tests). Dropping/restoring the API never duplicates or freezes the stream; the mock ticker pauses once real data flows.
  - Tests: stream helpers 5 (orchestrator → 24 total). 51 tests green overall.
  - This completes the roadmap's deck + loop epics (F1–F25 less the Execution plane).

- **2026-06-20 · Epic 5 · Real approvals + auth**
  - ✅ **F14** — Supabase HS256 JWT auth on `/api/*` (was already wired in `middleware/auth.ts`); hardened intent + a **hermetic test** (`jose` signs a token → middleware accepts valid, rejects missing / malformed / wrong-secret / expired / org-less). `/api/*` rejects missing/invalid tokens with a real provider, proven in CI.
  - ✅ **F15** — real approval gate: `GET /api/approvals` + `POST /api/approvals/:id/decision` (authed, org-scoped). A decision writes `approval_requests` (status + decided_by/at) and transitions the linked `agent_runs` — **approve → running, reject → cancelled**. Pure `resolveApprovalDecision` unit-tested; already-decided → 409.
  - ✅ **F16** — Deck Approval Queue calls the real endpoint (`useBeacon.decideApproval`), folding the persisted decision; falls back to a local-only reflection in demo / unauthed mode.
  - ✅ **Bonus** — RLS on `beacon_events` (`0002_beacon_events_rls.sql`, NULL-org admitted, service role bypasses) — closes the Epic 3 GAP.
  - Decisions for review: reject **cancels** the run (per done-when); demo falls back to local when no token. Live DB path (approval writes) not exercised in CI (no Postgres) — pure logic + auth are.
  - Next: **Epic 6** deck polish (F17–F19).

- **2026-06-20 · Epic 4 · Worker run loop**
  - ✅ **F12** — `workers/agent-runner` claims queued `agent_runs`, advances them through a minimal start→complete lifecycle, and marks the terminal status. IO injected (`runOnce`/`processRun`); real DB adapter guarded + fail-open.
  - ✅ **F13** — pure `agentEventToBeacon` bridge (`@foundry/orchestrator`) maps each `AgentEvent` to `beacon.run.*` / `beacon.command.*` / `beacon.approval.*` (re-sanitized, deterministic ids); the worker POSTs them to the receiver. A mention → queued run now lights the Deck.
  - Tests: bridge 7 (orchestrator) + runner 3 (worker, in-memory deps) — green in CI. Real agent reasoning + tool execution (Execution plane) still deferred.
  - Next: **Epic 5** auth + real approvals; **Epic 6** deck polish (F17–F19).

- **2026-06-20 · Epic 3 · Beacon persistence + replay**
  - ✅ **F8** — additive `beacon_events` table + migration `0001_beacon_events.sql` (no FK, no change to existing tables).
  - ✅ **F9** — receiver persists accepted events (idempotent, dynamic-import, fail-open, behind `BEACON_PERSIST`).
  - ✅ **F10** — `GET /hooks/beacon/replay` returns newest-first, re-sanitized stream; degrades cleanly (disabled/error → empty) with no DB.
  - ✅ **F11** — Deck hydrates from replay on load (`useBeacon`), real history over the mock seed.
  - Tests: pure row↔event mapping (`beacon-store.test.ts`, 3) in CI; replay degradation smoked. Live DB integration not run in CI (no Postgres) — persist is off by default, fail-open.
  - Next: **Epic 4** worker run loop (`beacon.run.*`).

- **2026-06-20 · PR #4 · sprint 1 kickoff**
  - ✅ **F1** — `POST /hooks/beacon` receiver (validate → `sanitizeBeaconEvent` → 202).
  - ✅ **F2** — `x-beacon-token` shared-secret guard, fail-closed (503/401), constant-time.
  - ✅ **F3** — `pnpm tunnel` (quick + named cloudflared), `infra/cloudflared` template, `docs/CLOUDFLARE_TUNNEL.md`.
  - ✅ **F20/F21** — `.github/workflows/ci.yml`: install → typecheck → api + orchestrator tests on every PR/push.
  - ✅ **F23** — robust gradient color system (status + 10 employee ramps + brand) in `tokens.css` + `format.ts` helpers.
  - ✅ **F24** — Forge Sigil (hexagon) + StatusPip; round entity/status dots retired.
  - ✅ **F25** — Team Dashboard hero surface (`docs/DESIGN_SYSTEM.md`); "who's on what" from selectors.
  - ✅ **F5** — `scripts/beacon-statusline.sh` POSIX statusLine publisher (repo+model only).
  - ✅ **F6** — `scripts/beacon-hook.mjs` hook publisher + `.claude/settings.beacon.example.json`.
  - ✅ **F7** — `scripts/lib/beacon-redact.mjs` + `beacon-hook.test.mjs` (7 tests): no prompt body, no secret ever leaves the box. Wired into CI. End-to-end publisher→receiver verified (202, redacted).
  - Next: **Epic 3** (persist Beacon to `audit_log` + replay), then **Epic 4** (worker run loop).
