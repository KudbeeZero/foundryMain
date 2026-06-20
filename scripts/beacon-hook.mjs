#!/usr/bin/env node
// scripts/beacon-hook.mjs — Claude Code hook → Foundry Beacon publisher (F6).
//
// Wire it from .claude/settings.json (see .claude/settings.beacon.example.json):
//   "command": "node scripts/beacon-hook.mjs PreToolUse"
// Claude Code pipes the hook event JSON on stdin; this maps it to a BeaconEvent
// (docs/CLAUDE_CODE_INTEGRATION.md) and POSTs it to the receiver.
//
// Config (env):
//   FOUNDRY_BEACON_URL  base URL of the receiver, e.g. https://x.trycloudflare.com
//   BEACON_HOOK_TOKEN   shared secret, sent as x-beacon-token
//
// Hard rules: NO prompt bodies (only length + sha8), NO secrets (redacted via the
// shared lib), summaries not raw output. Fail-open: any error → exit 0 so a coding
// session is never blocked, even if the receiver/tunnel is down.

import { createHash, randomUUID } from "node:crypto";
import { redactText, redactMetadata, summarize } from "./lib/beacon-redact.mjs";

const POST_TIMEOUT_MS = 1200;

function nowIso() {
  return new Date().toISOString();
}

function base(hookName, payload, extra) {
  return {
    id: randomUUID(),
    timestamp: nowIso(),
    source: "claude-code",
    metadata: {},
    sessionId: typeof payload.session_id === "string" ? payload.session_id : undefined,
    repoId: repoOf(payload),
    ...extra,
  };
}

function repoOf(payload) {
  const dir = payload.cwd ?? payload.workspace?.current_dir;
  if (typeof dir !== "string" || dir.length === 0) return undefined;
  return dir.split(/[\\/]/).filter(Boolean).pop();
}

// Map one Claude Code hook event to a BeaconEvent (or null to skip). Exported for
// tests — pure, no IO.
export function buildEvent(hookName, payload = {}) {
  const tool = typeof payload.tool_name === "string" ? payload.tool_name : undefined;

  switch (hookName) {
    case "SessionStart":
      return base(hookName, payload, {
        type: "beacon.session.started",
        status: "thinking",
        title: "session started",
        message: redactText(`session on ${repoOf(payload) ?? "repo"}`),
      });

    case "UserPromptSubmit": {
      // Never send the prompt body — only its length + a short hash.
      const prompt = typeof payload.prompt === "string" ? payload.prompt : "";
      const sha8 = createHash("sha256").update(prompt).digest("hex").slice(0, 8);
      return base(hookName, payload, {
        type: "beacon.session.status",
        status: "thinking",
        title: "prompt",
        message: `prompt submitted (${prompt.length} chars)`,
        metadata: { promptChars: prompt.length, promptSha8: sha8 },
      });
    }

    case "PreToolUse":
      return base(hookName, payload, {
        type: "beacon.command.started",
        status: "running",
        title: tool ?? "tool",
        message: summarize(payload.tool_input),
        metadata: redactMetadata({ tool }),
      });

    case "PostToolUse": {
      const failed =
        payload.tool_response?.error != null ||
        payload.tool_response?.success === false ||
        payload.error != null;
      return base(hookName, payload, {
        type: failed ? "beacon.command.failed" : "beacon.command.finished",
        status: failed ? "failed" : "running",
        title: tool ?? "tool",
        message: summarize(payload.tool_response ?? payload.tool_input),
        metadata: redactMetadata({ tool, ok: !failed }),
      });
    }

    case "Notification":
      return base(hookName, payload, {
        type: "beacon.claude.hook.received",
        status: "thinking",
        title: "notification",
        message: summarize(payload.message),
      });

    case "SubagentStop":
      return base(hookName, payload, {
        type: "beacon.subagent.finished",
        status: "running",
        title: "subagent finished",
        message: summarize(payload.tool_response),
      });

    case "Stop":
      return base(hookName, payload, {
        type: "beacon.session.stopped",
        status: "completed",
        title: "session stopped",
        message: "session ended",
      });

    default:
      return base(hookName, payload, {
        type: "beacon.claude.hook.received",
        status: "thinking",
        title: String(hookName ?? "hook"),
        message: summarize(payload.message ?? hookName),
      });
  }
}

async function post(event) {
  const url = process.env.FOUNDRY_BEACON_URL;
  const token = process.env.BEACON_HOOK_TOKEN;
  if (!url || !token) return; // not configured → no-op, never block
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), POST_TIMEOUT_MS);
  try {
    await fetch(`${url.replace(/\/$/, "")}/hooks/beacon`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-beacon-token": token },
      body: JSON.stringify(event),
      signal: ctrl.signal,
    });
  } catch {
    // offline / receiver down / timeout → ignore (fail-open)
  } finally {
    clearTimeout(t);
  }
}

function readStdin() {
  return new Promise((resolve) => {
    let raw = "";
    if (process.stdin.isTTY) return resolve("");
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (raw += c));
    process.stdin.on("end", () => resolve(raw));
    process.stdin.on("error", () => resolve(raw));
  });
}

async function main() {
  const hookName = process.argv[2] ?? "Notification";
  let payload = {};
  try {
    const raw = await readStdin();
    if (raw.trim()) payload = JSON.parse(raw);
  } catch {
    payload = {};
  }
  try {
    await post(buildEvent(hookName, payload));
  } catch {
    // never throw — exit 0 below
  }
}

// Only run the IO path when invoked directly (so tests can import buildEvent).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().finally(() => process.exit(0));
}
