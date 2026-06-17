# Foundry Auth Integration (deferred)

Auth is **Foundry's own lane**, owned by **E07 (Amara)**. This document describes
how the team treats auth work. **Nothing here is wired in this stage** — the
Command Deck runs in local/demo mode with no production auth, and the existing
`/api` bearer-token boundary is left exactly as it was.

## Current state (Stage 2)

- `apps/api` already verifies a Supabase-issued JWT (HS256) on `/api/*` via
  `apps/api/src/middleware/auth.ts`. **This PR does not touch it.**
- The Command Deck's `/demo/*` routes are intentionally unauthenticated, read-only,
  mock-only, and gated by `ENABLE_DEMO_ROUTES`. They never weaken `/api`.
- No new auth provider is installed.

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
