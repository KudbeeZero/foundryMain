# GAPS — orphans, deferred risks, "we'll come back to this"

> Top-of-file is the most important. Each item: severity (`P0` block-release /
> `P1` block-next-horizon / `P2` nice-to-have), `Seen:`, `Revisit-by:`.

- **RESOLVED 2026-06-20 · Beacon events are in-memory only.** Epic 3 added the
  `beacon_events` table, opt-in persistence on the receiver (`BEACON_PERSIST`), and
  `GET /hooks/beacon/replay` that the Deck hydrates from. Off by default; live DB
  integration not yet exercised in CI (no Postgres there). Seen: 2026-06-17.

- **RESOLVED 2026-06-20 · Auth wired (F14).** `/api/*` verifies a Supabase HS256
  JWT (`middleware/auth.ts`) and rejects missing/malformed/expired/org-less tokens —
  proven by a hermetic `jose`-signed test in CI. Seen: 2026-06-17.

- **RESOLVED 2026-06-20 · Approve/Reject is real (F15/F16).** `POST
  /api/approvals/:id/decision` persists to `approval_requests` and transitions the
  run (approve→running, reject→cancelled); the Deck calls it. Note: real *tool
  execution* after approval is still the Execution-plane gap below. Seen: 2026-06-17.

- **RESOLVED 2026-06-20 · `beacon_events` RLS.** `0002_beacon_events_rls.sql` enables
  RLS (NULL-org admitted; service role bypasses). The replay endpoint itself is still
  unauthenticated (see remaining gap). Seen: 2026-06-20.

- **P2 · `/hooks/beacon/replay` is unauthenticated.** Gated by `BEACON_PERSIST` and
  returns redacted events only, but it's outside the JWT boundary. Add auth before a
  production deploy. Seen: 2026-06-20 · Revisit-by: before production.

- **P1 · No real tool *execution* yet (reasoning is real).** Execution plane
  increment 1 landed: a queued run now makes a real `claude-opus-4-8` call and posts
  the result (flag-gated on `ANTHROPIC_API_KEY`). Still deferred: the agent cannot
  run bash / edit files / execute code — increment 2 adds sandboxed tools behind the
  Epic 5 approval gate. The live model call is also not exercised in CI (no key).
  Seen: 2026-06-20 · Revisit-by: Execution-plane increment 2.

- **RESOLVED 2026-06-20 · Real Claude Code hooks.** Receiver (F1/F2), tunnel (F3),
  and publishers (F5/F6/F7) all landed on PR #4; end-to-end publisher→receiver
  verified with server- and client-side redaction. Remaining: events are still
  in-memory (see the persistence gap below) and real Cloudflare provisioning needs
  the Operator's account. Seen: 2026-06-17 · Resolved: 2026-06-20.

- **P2 · `/demo/*` routes are unauthenticated.** Safe (read-only, mock, no DB),
  gated by `ENABLE_DEMO_ROUTES`. Must stay off in production.
  - Seen: 2026-06-17 · Revisit-by: before any production deploy
