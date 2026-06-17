# Work Order Format

The **Operator** writes work orders in plain English — no code, no jargon. **E10
(Lex)** translates each one into an employee assignment plus an engineer prompt.

## What the Operator gives Lex

Three or four lines:

```
PROBLEM:  <what's broken or what you want>
WHEN:     <when it happens / how to reproduce, if known>
PRIORITY: P0 (breaks the app) · P1 (blocks a feature) · P2 (nice-to-have)
NOTES:    <anything else, optional>
```

## What Lex gives back

A one-page response in this exact shape:

```
WORK ORDER #__                 Date: YYYY-MM-DD   Priority: P?
============================================================
Problem (plain):    one or two lines, no jargon
What we'll do:      one or two lines, no code
Who's on it:        E0X — Name (Role, L?)
PR lane:            <feat|fix|chore|docs>/E0X-<slug>
Risk:               one line — blast radius, funds-touching?, hard-rules?
Reviewers required: E0X (Name) + E0X (Name)
Memory layers:
  - PAST.md   → one-line entry at closeout
  - NOW.md    → how the in-flight / on-deck shifts
  - FUTURE.md → change to horizon, with Back-tag
  - GAPS.md   → new gap id if any
Auditor TODO:
  1. repro / pre-fix evidence
  2. confirm fix
  3. confirm test added
============================================================

CLAUDE CODE PROMPT (paste into a fresh chat at repo root)
------------------------------------------------------------
<the engineer-specific prompt, full text — NO CODE>
------------------------------------------------------------
```

## What the Operator does next

1. Read the top half. If "What we'll do" doesn't match intent, push back; Lex
   rewrites.
2. Copy the prompt block into a fresh Claude Code session and run it.
3. When the session ends, the engineer reports back in the same shape
   (`Summary: … Next: …`). Lex audits in the next session.

## Rule: no code in the work order, no code in Lex's response

The engineer writes code. The Operator and Lex talk in outcomes, lanes, risks,
and prompts. Code appearing in Lex's response is a violation — push back.

## How the Command Deck renders work orders

The Work Order Board (`apps/web` → `WorkOrderBoard`) shows each work order with
its priority (P0/P1/P2), assigned employee, repo, branch/lane, required
reviewers, audit-TODO count, and a memory-update flag — across the columns Inbox →
Assigned → Running → Awaiting Approval → Awaiting Audit → Done → Blocked.
