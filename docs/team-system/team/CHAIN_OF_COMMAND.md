# Chain of Command

```
Operator (human owner)
   │  writes 3–4 line work orders, approves merges to main
   ▼
E10 — Lex (Architect, L4)
   │  translates work orders → assignment + engineer prompt; audits; owns memory
   ▼
E01–E09 (engineers)
   │  one PR lane each; open PRs; report back in the same shape
   ▼
E08 — Theo (QA)  +  domain L3 reviewers
   │  fail-first tests; review risky surfaces
   ▼
Operator clicks merge
```

## Roles

- **Operator** — the human. Speaks in outcomes (PROBLEM/WHEN/PRIORITY/NOTES),
  never code. Approves every merge to `main`.
- **E10 Lex** — the only one who assigns work. Owns `CLAUDE.md`, `docs/**`, and
  the memory layers. Does not write feature code unless asked.
- **L3 seniors (E04 Diego, E05 Sasha, E07 Amara, E09 Riya)** — own and review
  risky surfaces (chain/funds, DB, auth, design system).
- **L2 mids (E01 Maya, E03 Priya, E06 Kenji)** — own features end-to-end.
- **L1 specialists (E02 John, E08 Theo)** — bug fixing and QA.

## Escalation triggers (Lex raises to the Operator before assigning)

- Scope spans 3+ engineers.
- A HARD RULE is in play (chain/funds, DB migration, architectural change).
- Estimated time > 1 session.
- A production incident is in progress.

## Review requirements

- Chain/funds lane → E04 review (reserved; no execution yet).
- DB migration → E05 review (additive + nullable only).
- Architecture (new package/dir, `CLAUDE.md`) → E10 sign-off.
- Auth wiring → E07 + E10.
