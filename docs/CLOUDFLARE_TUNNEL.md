# Cloudflare Tunnel — expose the Beacon receiver (ROADMAP F3)

The Command Deck shows **real** Claude Code sessions when those sessions can POST
to the API's receiver, `POST /hooks/beacon` (see
[`CLAUDE_CODE_INTEGRATION.md`](./CLAUDE_CODE_INTEGRATION.md)). On a dev box that
endpoint lives at `http://localhost:8787/hooks/beacon` — unreachable from the
outside. A **Cloudflare Tunnel** gives it a stable public URL without opening a
port, running a reverse proxy, or deploying.

Two modes, one helper script (`scripts/tunnel.sh`, wired as `pnpm tunnel`).

---

## Prerequisites

- `cloudflared` installed:
  - macOS `brew install cloudflared` · Windows `winget install --id Cloudflare.cloudflared`
  - Linux: <https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/>
- The API running locally: `pnpm --filter @foundry/api dev` (listens on `:8787`).
- A receiver token set so it actually accepts events:
  `export BEACON_HOOK_TOKEN=$(openssl rand -hex 32)` (same value the publisher sends).

---

## Mode 1 — Quick tunnel (no account, 30 seconds)

Best for "watch a real session light up the Deck" demos.

```bash
pnpm tunnel            # → cloudflared tunnel --url http://localhost:8787
```

`cloudflared` prints an ephemeral URL like `https://random-words.trycloudflare.com`.
Your receiver is then at `https://random-words.trycloudflare.com/hooks/beacon`.
Point the publisher at it:

```bash
curl -sS -X POST "https://random-words.trycloudflare.com/hooks/beacon" \
  -H "content-type: application/json" \
  -H "x-beacon-token: $BEACON_HOOK_TOKEN" \
  -d '{"id":"evt_demo","type":"beacon.session.started","timestamp":"'"$(date -u +%FT%TZ)"'",
       "source":"claude-code","status":"thinking","title":"demo","message":"hello deck","metadata":{}}'
# → 202 {"accepted":true,...}
```

The URL changes every run — fine for demos, not for a fixed publisher config.

---

## Mode 2 — Named tunnel (persistent, your domain)

One-time setup (requires a Cloudflare account + a zone you control):

```bash
cloudflared login                                  # browser auth, pick your zone
cloudflared tunnel create foundry-beacon           # prints a TUNNEL_ID + creds json
cloudflared tunnel route dns foundry-beacon beacon.example.com
```

Then wire the config:

```bash
cp infra/cloudflared/config.example.yml infra/cloudflared/config.yml
# edit config.yml: set credentials-file to the json path from `create`,
# and replace beacon.example.com with your hostname.
pnpm tunnel named foundry-beacon
```

`infra/cloudflared/config.yml` is git-ignored (it points at local credentials).
The committed template restricts ingress so **only** `/hooks/*` and `/health`
reach the API; everything else returns `404`. The authenticated `/api/*` plane
and the dev-only `/demo/*` routes are never exposed publicly.

---

## Security model

| Concern | How it's handled |
|---|---|
| Anyone can hit the public URL | Receiver is **fail-closed**: no `BEACON_HOOK_TOKEN` → `503`; wrong/missing `x-beacon-token` → `401`. |
| Secrets in published events | Re-redacted **server-side** via `sanitizeBeaconEvent` before anything is accepted. |
| Exposing more than intended | Named-tunnel ingress allow-lists `/hooks/*` + `/health` only; `/api/*` stays JWT-gated and off the public path. |
| Tunnel down | Publisher posts best-effort with a short timeout — a down tunnel never blocks the Claude Code session. |
| Token storage | Keep `BEACON_HOOK_TOKEN` in your secret manager (Doppler/Infisical), never in git. `.env.example` ships it empty. |

---

## Troubleshooting

- **All posts return `503`** → `BEACON_HOOK_TOKEN` isn't set in the API process.
- **All posts return `401`** → publisher's `x-beacon-token` ≠ the API's token.
- **`400 invalid beacon event`** → payload doesn't match the `BeaconEvent` schema
  (`packages/shared/src/beacon.ts`).
- **`cloudflared: command not found`** → install it (see Prerequisites).

---

## Status

| Piece | State |
|---|---|
| Receiver endpoint (`POST /hooks/beacon`) | ✅ shipped (F1/F2) |
| `pnpm tunnel` quick + named helper | ✅ shipped (F3) |
| `infra/cloudflared/config.example.yml` | ✅ shipped (F3) |
| Real statusLine / hook publishers | ⛔ next (F5/F6) |
| Persisted + replayed stream | ⛔ Epic 3 |
