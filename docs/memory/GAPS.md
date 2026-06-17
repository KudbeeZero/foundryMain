# GAPS — orphans, deferred risks, "we'll come back to this"

> Top-of-file is the most important. Each item: severity (`P0` block-release /
> `P1` block-next-horizon / `P2` nice-to-have), `Seen:`, `Revisit-by:`.

- **P1 · Beacon events are in-memory only.** No persistence; a refresh replays
  mock history, not real history. Closes in H+3.
  - Seen: 2026-06-17 · Revisit-by: 2026-07-15

- **P1 · Auth integration documented but not wired.** Foundry's auth lane (E07)
  is specified in `docs/team-system/AUTH_INTEGRATION.md` but no provider is
  installed. Deferred deliberately — see that doc.
  - Seen: 2026-06-17 · Revisit-by: 2026-07-31

- **P2 · Approve/Reject is UI-only.** Emits a local Beacon event; no real gate,
  no DB write, no tool execution. Intentional for this stage.
  - Seen: 2026-06-17 · Revisit-by: when H+2 lands a real run loop

- **P2 · No real Claude Code hooks.** Only mock sources + contracts exist.
  - Seen: 2026-06-17 · Revisit-by: H+1

- **P2 · `/demo/*` routes are unauthenticated.** Safe (read-only, mock, no DB),
  gated by `ENABLE_DEMO_ROUTES`. Must stay off in production.
  - Seen: 2026-06-17 · Revisit-by: before any production deploy
