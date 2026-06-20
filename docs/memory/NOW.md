# NOW — what's open right now

> Read this first, every session. The team trusts the files, not anyone's memory.

## In flight

- **ROADMAP sprint 1 — receiver + tunnel + CI** — PR #4
  - Started: 2026-06-20
  - Owners: E03 Priya (receiver), E06 Kenji (tunnel + CI), E10 Lex (`docs/ROADMAP.md`)
  - Lanes: `docs/**`, `apps/api/src/**`, `.github/workflows/ci.yml`,
    `scripts/tunnel.sh`, `infra/cloudflared/**`, `.env.example`, root `package.json`
  - Status: `IN_FLIGHT` → `AWAITING_AUDIT` on merge
  - What landed on the branch:
    - **F1/F2** — `POST /hooks/beacon`: `x-beacon-token`-guarded, fail-closed,
      server-side-redacting receiver. 202 on accept. `/api/*` auth untouched.
    - **F3** — `pnpm tunnel` (quick + named cloudflared), `infra/cloudflared`
      config template, `docs/CLOUDFLARE_TUNNEL.md`. The branch's namesake.
    - **F20/F21** — `.github/workflows/ci.yml`: install → typecheck → tests on
      every PR/push. The green gate is now enforced, not just aspirational.
    - **F23/F24/F25** — Deck visual system: gradient color tokens (status + 10
      employee ramps), the hexagonal **Forge Sigil** + **StatusPip** (circles
      retired), and the **Team Dashboard** hero surface ("who's on what"). See
      `docs/DESIGN_SYSTEM.md`. Typecheck + web build green.
  - No DB migration (persistence is Epic 3). Real Cloudflare provisioning needs
    the Operator's account/token — scaffold is one command from live.

## On deck (next 1–2)

1. **F5/F6** — real Claude Code statusLine + hook publishers POST to the receiver
   (the first true "watch the AI team work" moment; H+1).
2. **Epic 3 (F8–F11)** — persist Beacon events to `audit_log` + replay on load.

> Full plan: `docs/ROADMAP.md` (see the Shipped log at the bottom).

## 5-line summary (print at chat start)

1. Current PR (#4): roadmap + Beacon receiver (F1/F2) + cloudflared tunnel (F3) + CI (F20/F21).
2. Owners: E03 Priya, E06 Kenji, E10 Lex. Lanes: docs, `apps/api`, `.github`, `scripts`, `infra`.
3. Risk: low — additive only, no migration, receiver fail-closed, `/api` auth intact.
4. Green gate: CI runs typecheck + api + orchestrator tests; all green locally.
5. On deck: F5/F6 real publishers, then Epic 3 persistence + replay.
