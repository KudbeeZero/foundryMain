# FUTURE — horizons H+1, H+2, H+3

> Each horizon carries a **Back-tag** (the PAST entry it grew out of) and a
> **Forward-tag** (the value it unlocks). Future always bends back to the middle —
> never plan into the void.

## H+1 — Real Claude Code statusLine publisher → Beacon

- What: ship the statusLine script + `POST /hooks/beacon` receiver so real coding
  sessions appear on the Deck. Contracts already defined in
  `docs/CLAUDE_CODE_INTEGRATION.md`.
- Back-tag: 2026-06-17 · Command Deck + Beacon foundation.
- Forward-tag: the Deck shows real sessions, not just mock — the first true
  "watch the AI team work" moment.

## H+2 — Worker emits Beacon events for queued runs

- What: `workers/agent-runner` consumes queued `agent_runs` (from the existing
  messages endpoint) and emits `beacon.run.*` events through the shared reducer.
- Back-tag: Stage 1 · `POST /api/channels/:id/messages` enqueues agent_runs.
- Forward-tag: end-to-end loop — a mention drives a run that lights up the Deck.

## H+3 — Persist + replay the Beacon stream

- What: persist `BeaconEvent`s to `audit_log` and rehydrate Deck state on load
  (replay through `reduceBeaconEvents`).
- Back-tag: 2026-06-17 · Beacon reducer (pure, replayable by design).
- Forward-tag: durable, multi-client Deck that survives refresh and restart.
