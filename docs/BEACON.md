# Foundry Beacon

Beacon is Foundry's **live status / event layer**. It is the stream that powers the
Command Deck: which AI employees are working, on what, in which session, with which
tool, and whether anything is waiting on a human.

Where `AgentEvent` (`@foundry/shared/events`) is the strict orchestration
state-machine contract, **Beacon is the broader presentation stream**. It is a
flat, generic envelope so any plane — mock, API, worker, or the future Claude Code
bridge — can emit it, and a single pure reducer can fold it.

## Contract

Defined in `packages/shared/src/beacon.ts` (`@foundry/shared/beacon`).

```ts
interface BeaconEvent {
  id: string;
  type: BeaconEventType;     // 23 categories, see below
  timestamp: string;          // ISO-8601
  source: "mock" | "api" | "worker" | "claude-code" | "system";
  status: BeaconStatus;       // idle | thinking | editing | running | awaiting_approval | blocked | completed | failed
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  // optional scope refs (omitted freely in mock mode)
  orgId?, teamId?, agentId?, runId?, taskId?, workOrderId?, repoId?, sessionId?;
}
```

### Event categories (`BEACON_EVENT_TYPE`)

| Group | Types |
|---|---|
| Session | `beacon.session.started`, `beacon.session.status`, `beacon.session.stopped` |
| Claude Code | `beacon.claude.statusline.snapshot`, `beacon.claude.hook.received` |
| Command | `beacon.command.started`, `beacon.command.finished`, `beacon.command.failed` |
| Agent | `beacon.agent.assigned`, `beacon.agent.idle`, `beacon.subagent.started`, `beacon.subagent.finished` |
| Work order | `beacon.work_order.created`, `beacon.work_order.assigned` |
| Run | `beacon.run.started`, `beacon.run.waiting_approval`, `beacon.run.completed`, `beacon.run.failed` |
| Approval | `beacon.approval.required`, `beacon.approval.decided` |
| Memory | `beacon.memory.updated` |
| Blocker | `beacon.blocker.created`, `beacon.blocker.resolved` |

## Reducer & selectors

Pure, IO-free, in `packages/orchestrator/src/beacon/`:

- `createInitialBeaconState(seed)` — seed roster + teams + work orders.
- `beaconReducer(state, event)` — fold one event (deterministic; event timestamps
  drive all time, no `Date.now()` inside).
- `reduceBeaconEvents(state, events)` — fold a stream.
- `selectors.ts` — `selectCounts`, `selectBeaconPill`, `selectActiveRuns`,
  `selectPendingApprovals`, `selectOpenBlockers`, `selectWorkOrdersByColumn`,
  `selectRosterStatus`, etc.

The same reducer runs in the browser (`apps/web`) today and will run in the
workers later — one source of truth for "what the deck shows".

## Privacy / redaction

Beacon **never stores raw prompts, API keys, or env secrets**. Every ingestion
boundary calls `sanitizeBeaconEvent()` (which runs `redactBeaconText` over
`title`/`message` and `redactMetadata` over `metadata`):

- Bearer tokens, `sk-…`, `gh[pousr]_…`, `xox…`, AWS keys, and JWTs are masked.
- `KEY=`/`SECRET=`/`TOKEN=`/`PASSWORD=` env pairs keep the key, drop the value.
- Any metadata under a sensitive key name (`*key*`, `*secret*`, `*token*`,
  `*password*`, `authorization`, `cookie`, `credential`, `prompt`) is dropped.

Redaction is best-effort defense-in-depth — the primary rule is **don't collect
secrets into Beacon in the first place**.

## Sources of events today

- **Mock** — `@foundry/orchestrator` `generateMockHistory()` +
  `createLiveEventGenerator()` power the local demo deck.
- **API** — `GET /demo/beacon/events` and `GET /demo/beacon/state` serve the same
  mock data (dev-safe, no DB, outside the authed `/api` boundary).
- **Worker / claude-code** — not wired yet. See
  [`CLAUDE_CODE_INTEGRATION.md`](./CLAUDE_CODE_INTEGRATION.md).

## Not yet (deferred)

- Persisting Beacon events (intended target: `audit_log`) — currently in-memory.
- Real worker emitters.
- Real Claude Code statusLine/hook ingestion.
