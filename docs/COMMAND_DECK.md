# Foundry Command Deck

The Command Deck is Foundry's browser-based operating surface — a premium dark
command-center where the operator watches the AI dev-org work: employees, teams,
work orders, runs, approvals, and the live Beacon.

It is **Foundry's own** product surface. (Inspiration was drawn from tiny
live-session status pills, but the Deck is larger and proprietary.)

## Run it

```bash
pnpm install
pnpm --filter @foundry/web dev      # → http://localhost:5173
```

The Deck runs **entirely on local mock data** — no Supabase, Redis, or Claude Code
required. Optionally, with the API running (`pnpm --filter @foundry/api dev`) it
will also hydrate from `/demo/beacon/events`.

```bash
pnpm --filter @foundry/web build    # production build
```

## App location

`apps/web` — Vite + React 19 + TypeScript. Styling is a hand-rolled dark design
system (CSS variables in `src/styles/tokens.css`, owned by E09/Riya) plus CSS
modules. No Tailwind, no UI framework dependency.

State comes from `useBeacon()` (`src/hooks/useBeacon.ts`), which folds the mock
history through `beaconReducer` and ticks live mock events on an interval.

## Surfaces

| # | Surface | Component | Shows |
|---|---|---|---|
| A | Top Command Bar | `CommandBar` | logo, org, env, live counts (sessions/runs/approvals/blockers) |
| B | Beacon Live Pill | `BeaconPill` | current session, employee, repo, tool, status + context/token/cost/elapsed placeholders |
| C | Employee Roster Board | `RosterBoard` | the 10 employees as live cards (id, name, role, level, lane, status, assignment, escalation, last event) |
| D | Teams / Departments | `TeamsPanel` | 9 departments + membership |
| E | Work Order Board | `WorkOrderBoard` | kanban: Inbox → Assigned → Running → Awaiting Approval → Awaiting Audit → Done → Blocked |
| F | Active Runs Panel | `RunsPanel` | run id, employee, work order, repo, status, tool, latest output, approval flag |
| G | Approval Queue | `ApprovalQueue` | pending approvals with risk + **UI-only** approve/reject |
| H | Memory Layers | `MemoryLayers` | PAST / NOW / FUTURE / GAPS (mock content) |

## The 10 employees

See [`team-system/team/ROSTER.md`](./team-system/team/ROSTER.md). Seeded in
`@foundry/orchestrator` `mockRoster` (E01 Maya … E10 Lex), mapped onto Foundry's
real repo path lanes.

## Work orders

Authored in the operator's plain-English format — PROBLEM / WHEN / PRIORITY /
NOTES — and translated into assignments by E10 (Lex). See
[`team-system/work-orders/WORK_ORDER_FORMAT.md`](./team-system/work-orders/WORK_ORDER_FORMAT.md).
Demo work orders live in `@foundry/orchestrator` `mockWorkOrders`.

## Conceptual mapping to the database

The Deck's model maps onto existing `@foundry/db` tables but is **not persisted in
this stage** (mock/local only):

| Deck concept | Table |
|---|---|
| Employee | `agents` |
| Team | `teams` |
| Work order | `tasks` |
| Run | `agent_runs` |
| Approval | `approval_requests` |
| Event trail | `audit_log` |
| Memory | `agent_memory` |

No migrations were introduced for the Command Deck.

## Approvals are UI-only

Approve/Reject in the Approval Queue emit a `beacon.approval.decided` event into
the **local** stream so the Deck reflects the decision. There are **no real side
effects** — no DB writes, no tool execution, no external calls.
