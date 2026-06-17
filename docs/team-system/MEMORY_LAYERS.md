# Memory Layers — 3 + 1

Every session starts by reading four files in `docs/memory/`. They are the only
allowed "what's going on" view — nobody trusts their head, everyone trusts the
files. The Command Deck's Memory Layers panel mirrors them.

The design intent:
- **Past** — what was done, decided, closed.
- **Now** — what's open right now.
- **Future** — the next 1–3 horizons, each with a pointer **back toward the
  middle** so future plans never lose their roots.
- **Gaps** — the in-between that doesn't fit cleanly into Past/Now/Future but
  matters. Surfaces the most important items so chronology is never lost.

## The four files

```
docs/memory/
├── PAST.md     ← closed PRs, decisions, what we tried and dropped
├── NOW.md      ← the one PR in flight + the next 1–2 queued
├── FUTURE.md   ← horizons H+1, H+2, H+3 (back-tagged to PAST)
└── GAPS.md     ← orphans, deferred risks, "we'll come back to this"
```

## Read order (every session)

1. `NOW.md` — what's the current PR? who owns it? what lane?
2. `GAPS.md` — anything that affects what I'm about to do?
3. `PAST.md` — what was decided about this area before? (grep it)
4. `FUTURE.md` — does my work serve the next horizon? am I about to step on
   something queued?

## Write order (every closeout)

1. `NOW.md` — flip the in-flight slot to `AWAITING_AUDIT`; promote the next queued.
2. `PAST.md` — append `YYYY-MM-DD · branch · engineer · one-line outcome`.
3. `FUTURE.md` — if this PR reshaped the next horizon, edit H+1. Every horizon
   keeps a **Back-tag** (the PAST entry it grew from) and a **Forward-tag** (the
   value it unlocks).
4. `GAPS.md` — if you punted something, add it with severity `P0`/`P1`/`P2`,
   `Seen:`, and `Revisit-by:`.

## The "future bends back to the middle" rule

`FUTURE.md` entries are never free-floating. Each carries a **Back-tag** to the
`PAST.md` entry that justifies it and a **Forward-tag** for the value it unlocks.
You never plan into the void, and you never forget what made the plan necessary.

## The Gap-Filler rule

`GAPS.md` is the most important file once the team has been running for weeks. It
captures: things deferred (with reason + revisit date), cross-cutting risks no
single lane owns, "we noticed X but it's not blocking", and conflicts between PAST
decisions and FUTURE plans. Top-of-file is always the most important item.

## How chronology stays intact

- Every `PAST.md` entry has an ISO date prefix.
- Every `NOW.md` slot has a `Started:` timestamp.
- Every `FUTURE.md` horizon has both `Back-tag:` and `Forward-tag:`.
- Every `GAPS.md` item has `Seen:` and `Revisit-by:`.

Nothing is "today, recently, soon." Everything has a date or a tag pointing to one.
