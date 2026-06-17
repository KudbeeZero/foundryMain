import { selectCounts, type BeaconState } from "@foundry/orchestrator";
import styles from "./CommandBar.module.css";

// Surface A — Top Command Bar.
export function CommandBar({ state }: { state: BeaconState }) {
  const counts = selectCounts(state);
  return (
    <header className={styles.bar}>
      <div className={styles.brand}>
        <span className={styles.mark}>◆</span>
        <span className={styles.name}>FOUNDRY</span>
        <span className={styles.sub}>Command Deck</span>
      </div>

      <div className={styles.meta}>
        <span className={styles.org}>Acme AI Dev-Org</span>
        <span className={styles.env}>local / demo</span>
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
