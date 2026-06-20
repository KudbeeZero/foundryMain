# NOW — what's open right now

> Read this first, every session. The team trusts the files, not anyone's memory.

## In flight

- **Epic 6 — Command Deck UX polish** — new PR off `main`
  - Started: 2026-06-20 · Branch: `claude/epic6-deck-polish`
  - Owners: E01 Maya (pill/bar), E02 Theo (useBeacon stream)
  - Lanes: `scripts/beacon-statusline.sh`, `apps/web/src/{hooks/useBeacon,
    components/CommandBar,components/BeaconPill}`, `packages/orchestrator/src/beacon/stream.ts`
  - Status: `IN_FLIGHT` → `AWAITING_AUDIT` on merge
  - What: F17 statusline publisher forwards real cost/elapsed/lines (pill already
    consumes). F18 live/demo/local connection indicator in the Command Bar. F19
    reconnect/backoff + dedupe-by-id in useBeacon (pure `selectUnseen` /
    `nextBackoffMs`, tested). 51 tests green.
  - This completes the roadmap deck+loop epics. Next real frontier: Execution plane
    (real agent reasoning/tools after a run starts).

## Recently merged (this session)

- **PR #7 · Epic 5** — real approvals + auth (F14/F15/F16). ✅ merged.
- **PR #6 · Epic 4** — worker run loop, queued run → `beacon.run.*` (F12/F13). ✅
- **PR #5 · Epic 3** — Beacon persistence + replay (F8–F11). ✅ merged.
- **PR #4 · sprint 1** — receiver, tunnel, publishers, CI, design system +
  Team Dashboard (F1/F2/F3/F5/F6/F7/F20/F21/F23/F24/F25). ✅ merged.

## On deck (next 1–2)

1. **Execution plane** — real agent reasoning + tool execution after a run starts
   (today `advanceRun` is a placeholder start→complete; an approved run flips to
   `running` but nothing actually runs yet). The next real frontier.
2. **Hardening** — auth on `/hooks/beacon/replay`; live DB integration in CI
   (Postgres service) to exercise persistence + the approval write path.

> Full plan: `docs/ROADMAP.md` (see the Shipped log at the bottom).

## 5-line summary (print at chat start)

1. Current PR: Epic 6 deck polish (F17–F19) — real pill metrics, live/demo/local indicator, reconnect+dedupe.
2. Merged this session: PR #4 (sprint 1), #5 (Epic 3), #6 (Epic 4), #7 (Epic 5 auth+approvals). On `main`.
3. Roadmap status: F1–F25 deck+loop epics shipped. Remaining frontier: the Execution plane (real tool runs).
4. Green gate: CI runs typecheck + orchestrator + api + publisher + worker tests; 51 green.
5. Risk notes: live DB paths (persistence, approval writes) not exercised in CI (no Postgres); pure logic + auth are.
