# foundryMain

The Foundry Main Repo v1.0.0

Foundry is an agentic dev-org platform — "forge your own software company" by
creating and managing AI agents like employees, assigned to repos, teams,
channels, tasks, approvals, code runs, and memory.

## Architecture (5 planes)

1. **Client** — Expo mobile app (`apps/mobile`)
2. **Edge/API** — Hono server, auth, routes, GitHub webhooks (`apps/api`)
3. **Core** — Supabase Postgres, Drizzle schema, RLS, audit log, memory (`packages/db`)
4. **Orchestration** — workers, BullMQ queues, agent-run state machine (`packages/orchestrator`, `workers/*`)
5. **Execution** — sandboxed tool calls, GitHub tools, repo ops (`packages/tools`, `packages/vcs`, `packages/sandbox`)

Stack (locked): Expo · Supabase · Drizzle · Hono · Anthropic · BullMQ · E2B/Fly ·
Doppler/Infisical · pnpm + Turbo.

## Monorepo layout

```
apps/        api, mobile
workers/     orchestrator, agent-runner, shift-scheduler
packages/    shared, db, ai, tools, vcs, sandbox, orchestrator
scripts/     pr-sweep.ts (PR hygiene)
```

`@foundry/shared` holds the `AgentEvent` contract and status enums (the single
source of truth used by both the DB enums and the orchestrator). `@foundry/db`
owns the Drizzle schema for the 13-table data model plus SQL + RLS migrations.

## Develop

```bash
pnpm install
pnpm -r exec tsc --noEmit      # blocking green/red gate — must pass before feature work
pnpm --filter @foundry/db db:generate   # regenerate the SQL migration from schema
```

## Status

Stage 1 (scaffold + Core schema) complete: workspace builds, typecheck gate is
green, and the initial migration + RLS policies are generated. Subsequent stages
wire the API, agent runner, and the `@first-agent` → draft-PR MVP loop.
