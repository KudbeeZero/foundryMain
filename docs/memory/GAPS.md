# GAPS — orphans, deferred risks, "we'll come back to this"

> Top-of-file is the most important. Each item: severity (`P0` block-release /
> `P1` block-next-horizon / `P2` nice-to-have), `Seen:`, `Revisit-by:`.

- **RESOLVED 2026-06-20 · Beacon events are in-memory only.** Epic 3 added the
  `beacon_events` table, opt-in persistence on the receiver (`BEACON_PERSIST`), and
  `GET /hooks/beacon/replay` that the Deck hydrates from. Off by default; live DB
  integration not yet exercised in CI (no Postgres there). Seen: 2026-06-17.

- **P2 · `beacon_events` + replay have no RLS/auth.** The replay endpoint is
  unauthenticated and the table has no row-level security; the read path is the API
  service role only and events are redacted, so it's dev-safe — but must be gated
  before any production deploy. Closes with Epic 5 (auth). Seen: 2026-06-20.

- **P1 · Auth integration documented but not wired.** Foundry's auth lane (E07)
  is specified in `docs/team-system/AUTH_INTEGRATION.md` but no provider is
  installed. Deferred deliberately — see that doc.
  - Seen: 2026-06-17 · Revisit-by: 2026-07-31

- **P2 · Approve/Reject is UI-only.** Emits a local Beacon event; no real gate,
  no DB write, no tool execution. Intentional for this stage.
  - Seen: 2026-06-17 · Revisit-by: when H+2 lands a real run loop

- **RESOLVED 2026-06-20 · Real Claude Code hooks.** Receiver (F1/F2), tunnel (F3),
  and publishers (F5/F6/F7) all landed on PR #4; end-to-end publisher→receiver
  verified with server- and client-side redaction. Remaining: events are still
  in-memory (see the persistence gap below) and real Cloudflare provisioning needs
  the Operator's account. Seen: 2026-06-17 · Resolved: 2026-06-20.

- **P2 · `/demo/*` routes are unauthenticated.** Safe (read-only, mock, no DB),
  gated by `ENABLE_DEMO_ROUTES`. Must stay off in production.
  - Seen: 2026-06-17 · Revisit-by: before any production deploy
