# Foundry Auth Integration

Auth is **Foundry's own lane**, owned by **E07 (Amara)**. This document describes
how the team treats auth work and the current wiring.

## Current state (Epic 5 — wired)

- `/api/*` verifies a **Supabase-issued JWT (HS256)** via
  `apps/api/src/middleware/auth.ts` using `SUPABASE_JWT_SECRET`. It expects `sub`
  (user id) + a custom `org_id` claim, and rejects missing / malformed / expired /
  signature-invalid / org-less tokens with `401`. This is covered by a hermetic test
  (`middleware/auth.test.ts`) that signs tokens with `jose` — no external provider
  needed to prove the boundary in CI.
- **Real approvals (F15/F16):** `GET /api/approvals` + `POST
  /api/approvals/:id/decision` are authed and org-scoped; a decision persists to
  `approval_requests` and transitions the linked `agent_runs`. The Deck's Approval
  Queue calls the real endpoint (`useBeacon.decideApproval`), falling back to a
  local-only reflection in demo / unauthed mode.
- The Command Deck's `/demo/*` routes remain unauthenticated, read-only, mock-only,
  and gated by `ENABLE_DEMO_ROUTES`. They never weaken `/api`.
- No third-party auth provider/SDK is installed — verification is the Supabase JWT
  secret + `jose`. Richer end-user auth/orgs (provider, sign-in UI, refresh) is
  still future work.

## Who owns auth

- **Primary:** E07 — Amara (Auth, L3).
- **Reviewer for any auth-touching PR:** E07 + E10 (Lex).
- Lex decides whether an auth reference/skill needs to be installed before a unit
  of work begins.
- No other engineer edits auth wiring. If anyone finds an auth bug, they open a
  comment, tag E07, and STOP.

## Candidate provider (reference only — not a commitment)

When Foundry adds richer end-user auth/orgs, a managed provider such as **Clerk**
is one candidate reference implementation. It ships an agent "skills" pack
(framework patterns, backend SDK usage, orgs, webhooks, testing) that E07 can use
as a **read-only reference layer**. Treat it as a reference, not a dependency —
Foundry's auth contract is its own. The product docs always win over any skill.

When a work order touches auth, Lex appends a line like:

> Required reading: Foundry auth skill refs (setup, framework patterns, backend
> API) — whichever apply to this unit.

Amara reads those before writing a line.

## Hard rules for any future auth work

1. **Secrets stay server-side.** Publishable/anon keys may ship to the client;
   secret keys never leave the server. CI greps for leaked secret-key usage in
   client files.
2. **Don't weaken the `/api` boundary.** New public routes go outside `/api`
   (as `/demo/*` does) or behind the same middleware.
3. **No silent SDK version bumps.** Pin versions; E06 (Kenji) backs this with a
   minimum-release-age guard in CI.
4. **Webhooks must verify signatures.** No exceptions.
5. **Session cookies** stay HTTP-only, Secure, SameSite=Lax (or stricter). No
   tokens in `localStorage`.

## Status

| Piece | State |
|---|---|
| `/api/*` JWT boundary | ✅ existing, untouched |
| `/demo/*` unauth read-only routes | ✅ shipped (gated, mock-only) |
| End-user auth provider | ⛔ deferred (see GAPS.md) |
| Orgs / webhooks / billing | ⛔ deferred |
