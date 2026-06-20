#!/usr/bin/env bash
# scripts/beacon-statusline.sh — Claude Code statusLine publisher (ROADMAP F5).
# The POSIX bash+jq+curl companion to the PowerShell sketch in
# docs/CLAUDE_CODE_INTEGRATION.md.
#
# Claude Code pipes session JSON on stdin and shows whatever we print on stdout.
# We print a compact status line AND (best-effort) publish a redacted snapshot to
# the Beacon receiver. Only benign fields leave the box: repo + model. No prompt,
# no tokens-from-env, no secrets — and the receiver re-redacts server-side anyway.
#
# Config (env):
#   FOUNDRY_BEACON_URL  receiver base URL, e.g. https://x.trycloudflare.com
#   BEACON_HOOK_TOKEN   shared secret → x-beacon-token
#
# Fail-open: if jq/curl are missing or the receiver is down, the status line still
# prints and the session is never blocked.
set -u

raw="$(cat)"

repo="?"; model="?"; session=""
if command -v jq >/dev/null 2>&1; then
  repo="$(printf '%s' "$raw" | jq -r '(.workspace.current_dir // .cwd // "") | split("/") | last // "?"' 2>/dev/null)"
  model="$(printf '%s' "$raw" | jq -r '.model.display_name // .model.id // "?"' 2>/dev/null)"
  session="$(printf '%s' "$raw" | jq -r '.session_id // ""' 2>/dev/null)"
fi
[ -z "$repo" ] && repo="?"
[ -z "$model" ] && model="?"

# 1) What Claude Code shows in the status line.
printf '◆ %s · %s\n' "$repo" "$model"

# 2) Best-effort publish (never blocks the status line).
if [ -n "${FOUNDRY_BEACON_URL:-}" ] && [ -n "${BEACON_HOOK_TOKEN:-}" ] && command -v curl >/dev/null 2>&1; then
  ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  id="sl-$(date +%s)-$$"
  payload="$(cat <<JSON
{"id":"$id","type":"beacon.claude.statusline.snapshot","timestamp":"$ts","source":"claude-code","status":"thinking","title":"statusline","message":"◆ $repo · $model","metadata":{"repo":"$repo","model":"$model"},"sessionId":"$session","repoId":"$repo"}
JSON
)"
  curl -sS --max-time 1 -X POST \
    -H "content-type: application/json" \
    -H "x-beacon-token: ${BEACON_HOOK_TOKEN}" \
    -d "$payload" \
    "${FOUNDRY_BEACON_URL%/}/hooks/beacon" >/dev/null 2>&1 || true
fi
