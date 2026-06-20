import { selectCounts, type BeaconState } from "@foundry/orchestrator";
import type { ConnectionState } from "../hooks/useBeacon";
import styles from "./CommandBar.module.css";

// "live vs mock" indicator (F18): dot color + label so the operator can tell at a
// glance whether the deck is on real persisted data, demo mock, or pure local mock.
const CONN: Record<ConnectionState["mode"], { label: string; color: string }> = {
  live: { label: "LIVE", color: "var(--status-running, #34d399)" },
  demo: { label: "demo · mock", color: "var(--status-thinking, #fbbf24)" },
  local: { label: "local · offline", color: "var(--text-muted, #6b7280)" },
};

// Surface A — Top Command Bar.
export function CommandBar({
  state,
  connection,
}: {
  state: BeaconState;
  connection?: ConnectionState;
}) {
  const counts = selectCounts(state);
  const conn = CONN[connection?.mode ?? "local"];
  return (
    <header className={styles.bar}>
      <div className={styles.brand}>
        <span className={styles.mark}>◆</span>
        <span className={styles.name}>FOUNDRY</span>
        <span className={styles.sub}>Command Deck</span>
      </div>

      <div className={styles.meta}>
        <span className={styles.org}>Acme AI Dev-Org</span>
        <span className={styles.env} title="Deck data source" style={{ color: conn.color }}>
          <span
            aria-hidden
            style={{
              display: "inline-block",
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: conn.color,
              marginRight: 6,
              boxShadow: `0 0 8px ${conn.color}`,
            }}
          />
          {conn.label}
        </span>
      </div>

      <div className={styles.counts}>
        <Stat label="Sessions" value={counts.activeSessions} tone="accent" />
        <Stat label="Runs" value={counts.activeRuns} tone="violet" />
        <Stat label="Approvals" value={counts.pendingApprovals} tone="warn" />
        <Stat label="Blockers" value={counts.openBlockers} tone="danger" />
      </div>
    </header>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "accent" | "violet" | "warn" | "danger";
}) {
  return (
    <div className={`${styles.stat} ${styles[tone]}`} data-active={value > 0}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}
