#!/usr/bin/env bash
# scripts/tunnel.sh — expose the local Foundry API over a Cloudflare Tunnel so a
# developer's Claude Code session can reach the Beacon hook receiver
# (POST /hooks/beacon) from anywhere. ROADMAP F3.
#
# Two modes:
#   • quick   (default) — ephemeral *.trycloudflare.com URL, NO Cloudflare account
#                          needed. Great for a quick "watch a real session" demo.
#   • named  <name>     — a persistent named tunnel on your own domain, driven by
#                          infra/cloudflared/config.yml (see docs/CLOUDFLARE_TUNNEL.md).
#
# Usage:
#   pnpm tunnel                 # quick tunnel to http://localhost:$API_PORT
#   pnpm tunnel quick           # same
#   pnpm tunnel named foundry-beacon
#
# Fail-open philosophy: this only EXPOSES the API; if the tunnel is down the
# developer's Claude Code session is never blocked (the publisher posts best-effort).
set -euo pipefail

API_PORT="${API_PORT:-8787}"
MODE="${1:-quick}"

if ! command -v cloudflared >/dev/null 2>&1; then
  cat >&2 <<'EOF'
✖ cloudflared is not installed.
  macOS:    brew install cloudflared
  Windows:  winget install --id Cloudflare.cloudflared
  Linux:    https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
EOF
  exit 127
fi

# Warn (don't block) if the receiver has no token — it would answer 503 to every
# publisher. Exposing it is still safe, just not yet useful.
if [ -z "${BEACON_HOOK_TOKEN:-}" ]; then
  echo "⚠  BEACON_HOOK_TOKEN is unset — the receiver will return 503 until you set it." >&2
fi

case "$MODE" in
  quick)
    echo "◆ Quick tunnel → http://localhost:${API_PORT}  (Ctrl-C to stop)"
    echo "  Public URL appears below; your receiver is at <url>/hooks/beacon"
    exec cloudflared tunnel --url "http://localhost:${API_PORT}"
    ;;
  named)
    NAME="${2:?usage: pnpm tunnel named <tunnel-name>}"
    CONFIG="$(cd "$(dirname "$0")/.." && pwd)/infra/cloudflared/config.yml"
    if [ ! -f "$CONFIG" ]; then
      echo "✖ No $CONFIG — copy infra/cloudflared/config.example.yml and fill it in." >&2
      echo "  See docs/CLOUDFLARE_TUNNEL.md for the one-time setup (login/create/route)." >&2
      exit 1
    fi
    echo "◆ Named tunnel '${NAME}' via ${CONFIG}  (Ctrl-C to stop)"
    exec cloudflared tunnel --config "$CONFIG" run "$NAME"
    ;;
  *)
    echo "✖ unknown mode '$MODE' (expected: quick | named)" >&2
    exit 2
    ;;
esac
