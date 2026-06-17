# PAST — closed PRs, decisions, what we tried and dropped

> Newest first. Every entry: `YYYY-MM-DD · [branch] · [engineer] · [outcome]`.

## 2026-06

- 2026-06-17 · `claude/foundry-command-deck-beacon` · E10 Lex · Stage 2 Command
  Deck + Beacon foundation landed: `apps/web` (Vite/React deck), Beacon
  schema/reducer/selectors in `@foundry/shared` + `@foundry/orchestrator`, mock
  10-employee roster, dev-safe `/demo/*` API routes. No migration; auth intact.

## Stage 1 (scaffold) — decisions of record

- Monorepo: pnpm workspaces + Turbo, TypeScript ESM (`nodenext`), Node ≥ 22.
- `packages/shared` owns enums, branded IDs, and `AgentEvent` (Zod discriminated
  union). Decision: contracts live here; reducers do not.
- `packages/db` owns the Drizzle schema (orgs, users, teams, agents, channels,
  repos, messages, tasks, agent_runs, tool_calls, approval_requests, audit_log,
  agent_memory) + RLS migration. Decision: additive, nullable-only migrations.
- `apps/api` (Hono + Supabase JWT): `/health` is public; everything under
  `/api/*` requires a bearer token. `POST /api/channels/:id/messages` enqueues
  `agent_runs` for mentioned `@agent` handles.
- `packages/orchestrator` and `workers/*` scaffolded as stubs; implementation
  deferred to later stages.
