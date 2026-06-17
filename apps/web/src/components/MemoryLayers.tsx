import { useState } from "react";
import styles from "./MemoryLayers.module.css";

// Surface H — Memory Layers panel (3 + 1: PAST / NOW / FUTURE / GAPS). Mock
// content for this stage; mirrors docs/memory/*.md. Editing is deferred.
type Layer = "NOW" | "PAST" | "FUTURE" | "GAPS";
const LAYERS: Layer[] = ["NOW", "PAST", "FUTURE", "GAPS"];

const CONTENT: Record<Layer, { caption: string; lines: string[] }> = {
  NOW: {
    caption: "What matters right now",
    lines: [
      "● IN FLIGHT — Command Deck + Beacon foundation (this PR)",
      "   owner: E10 Lex · lane: docs/** + apps/web + packages/*",
      "   started: stage-2 · status: AWAITING_AUDIT soon",
      "○ ON DECK — real Claude Code statusLine publisher",
      "○ ON DECK — persist Beacon events to audit_log",
    ],
  },
  PAST: {
    caption: "Closed / decided (newest first)",
    lines: [
      "stage-1 · E10 · Scaffold landed: api, db (13 tables), shared, workers",
      "stage-1 · E05 · Drizzle schema + RLS migration (additive)",
      "stage-1 · E03 · POST /api/channels/:id/messages enqueues agent_runs",
    ],
  },
  FUTURE: {
    caption: "Horizons (each back-tagged to PAST)",
    lines: [
      "H+1 · Claude Code statusLine → Beacon bridge",
      "      Back-tag: stage-2 deck · Forward-tag: live real sessions",
      "H+2 · Worker consumes queued agent_runs, emits Beacon events",
      "      Back-tag: stage-1 messages · Forward-tag: end-to-end loop",
      "H+3 · Persist + replay Beacon stream from audit_log",
      "      Back-tag: stage-2 reducer · Forward-tag: durable deck",
    ],
  },
  GAPS: {
    caption: "Deferred / cross-cutting (top = most important)",
    lines: [
      "P1 · Beacon events are in-memory only (no persistence yet)",
      "P1 · Auth integration documented but not wired (E07 lane)",
      "P2 · Approve/Reject is UI-only — no real gate side effects",
      "P2 · No real Claude Code hooks wired (contracts only)",
    ],
  },
};

export function MemoryLayers() {
  const [active, setActive] = useState<Layer>("NOW");
  const layer = CONTENT[active];
  return (
    <section className="panel">
      <div className="panel-head">
        <span className="panel-title">Memory Layers · 3 + 1</span>
        <div className={styles.tabs}>
          {LAYERS.map((l) => (
            <button
              key={l}
              className={`${styles.tab} ${active === l ? styles.tabActive : ""}`}
              onClick={() => setActive(l)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.body}>
        <div className={styles.caption}>{layer.caption}</div>
        <pre className={styles.pre}>{layer.lines.join("\n")}</pre>
      </div>
    </section>
  );
}
