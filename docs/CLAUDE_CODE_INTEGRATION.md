# Claude Code → Beacon Integration (future)

This document defines the **contracts** for connecting Claude Code to Foundry's
Beacon layer. **Nothing here is wired in this stage** — the Command Deck runs on
mock data only. This is the blueprint for the Phase 2 publisher.

The integration has two independent channels:

1. **statusLine publisher** — a tiny, frequent heartbeat of "what's happening now".
2. **hook receiver** — discrete lifecycle events (tool use, prompts, stop, etc.).

Both arrive as `BeaconEvent`s with `source: "claude-code"`, pass through
`sanitizeBeaconEvent()`, and are folded by `beaconReducer`.

---

## 1. statusLine publisher

Claude Code can run a custom statusLine command that receives session JSON on
stdin and prints a status string. We pigg-back on it: the same script also
POSTs a compact snapshot to Foundry's hook receiver.

Mapping → `beacon.claude.statusline.snapshot`:

| statusLine field | BeaconEvent |
|---|---|
| session id | `sessionId` |
| cwd / repo | `repoId`, `metadata.repo` |
| current model | `metadata.model` |
| context left | `metadata.contextPct` |
| token/cost (if exposed) | `metadata.tokens`, `metadata.costUsd` |
| current tool/activity | `metadata.tool`, `status` |

### Windows PowerShell statusLine script (sketch)

> Sketch only — not installed. Configure under Claude Code settings
> `statusLine.command` once the receiver exists.

```powershell
# foundry-statusline.ps1 — reads Claude Code session JSON on stdin, prints a
# status line, and (best-effort) publishes a redacted snapshot to Beacon.
$ErrorActionPreference = "SilentlyContinue"
$raw = [Console]::In.ReadToEnd()
$session = $raw | ConvertFrom-Json

$repo = Split-Path -Leaf $session.workspace.current_dir
$line = "◆ $repo · $($session.model.display_name)"
Write-Output $line   # what Claude Code shows in the status line

# Publish to Beacon (never blocks the status line; secrets are NOT sent).
$payload = @{
  type      = "beacon.claude.statusline.snapshot"
  sessionId = $session.session_id
  repoId    = $repo
  status    = "thinking"
  title     = "statusline"
  message   = $line
  metadata  = @{ repo = $repo; model = $session.model.display_name }
} | ConvertTo-Json -Compress

try {
  Invoke-RestMethod -Method Post -TimeoutSec 1 `
    -Uri "http://localhost:8787/hooks/beacon" `
    -ContentType "application/json" -Body $payload
} catch { }   # offline / receiver down → ignore, status line still works
```

A POSIX (`bash` + `jq` + `curl`) equivalent will ship alongside.

---

## 2. Hook receiver endpoint

A future authenticated endpoint (proposed `POST /hooks/beacon`) accepts hook
payloads from a Claude Code `settings.json` hook config and converts each to a
`BeaconEvent`. It **must** redact via `sanitizeBeaconEvent` before persisting.

### Hook → Beacon mapping

| Claude Code hook | Beacon event | Notes |
|---|---|---|
| `SessionStart` | `beacon.session.started` | new `sessionId`, repo |
| `UserPromptSubmit` | `beacon.session.status` (`thinking`) | **prompt body is dropped** — only length/hash in metadata |
| `PreToolUse` | `beacon.command.started` / `beacon.approval.required` | guarded tools raise an approval instead |
| `PostToolUse` | `beacon.command.finished` / `beacon.command.failed` | tool name + ok/fail; output **summarized**, not stored raw |
| `Notification` | `beacon.claude.hook.received` | idle/permission notifications |
| `Stop` | `beacon.session.stopped` | session ends |
| `SubagentStart` | `beacon.subagent.started` | |
| `SubagentStop` | `beacon.subagent.finished` | |
| `TaskCreated` | `beacon.work_order.created` | maps to a work order |
| `TaskCompleted` | `beacon.run.completed` / `beacon.work_order.assigned` | |

### Example hook config (sketch, not installed)

```jsonc
// .claude/settings.json (Phase 2)
{
  "hooks": {
    "PreToolUse":  [{ "hooks": [{ "type": "command", "command": "node scripts/beacon-hook.mjs PreToolUse" }] }],
    "PostToolUse": [{ "hooks": [{ "type": "command", "command": "node scripts/beacon-hook.mjs PostToolUse" }] }],
    "Stop":        [{ "hooks": [{ "type": "command", "command": "node scripts/beacon-hook.mjs Stop" }] }]
  }
}
```

---

## 3. Transcript watcher (optional, later)

A watcher tails the Claude Code transcript (JSONL) for a session and derives
Beacon events (tool start/stop, sub-agent spawns) when richer hooks aren't
configured. Same rule: **summaries and counts only; never the raw transcript
content**.

---

## 4. Privacy / redaction (hard rules)

1. **No prompt bodies.** `UserPromptSubmit` contributes a length/hash at most.
2. **No API keys, no env secrets.** Never read `ANTHROPIC_API_KEY`, `.env`, etc.
   into a payload.
3. **Redact commands.** Tool inputs and command strings pass through
   `redactBeaconText` (Bearer/`sk-`/`gh*_`/`xox`/AWS/JWT + `KEY=`/`SECRET=` pairs).
4. **Summarize output.** `PostToolUse` stores a short summary, not raw stdout.
5. **Fail open, quietly.** If the receiver is down, the developer's Claude Code
   session is never blocked.

The receiver re-applies `sanitizeBeaconEvent` regardless of what the publisher
sent — redaction is enforced server-side, not trusted to the client.

---

## Status

| Piece | State |
|---|---|
| Beacon contract + reducer | ✅ shipped (`@foundry/shared`, `@foundry/orchestrator`) |
| Mock event sources | ✅ shipped (`/demo/beacon/*`, web ticker) |
| statusLine publisher | ⛔ documented only |
| Hook receiver endpoint | ⛔ documented only |
| Transcript watcher | ⛔ documented only |

See the Phase 2 prompt at the bottom of the PR description to build the real
statusLine publisher.
