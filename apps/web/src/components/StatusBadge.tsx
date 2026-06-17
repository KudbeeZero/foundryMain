import type { BeaconStatus } from "@foundry/shared";
import { statusColor, statusLabel } from "../lib/format";
import styles from "./StatusBadge.module.css";

export function StatusBadge({ status }: { status: BeaconStatus }) {
  const color = statusColor(status);
  const live = status === "running" || status === "thinking" || status === "editing";
  return (
    <span className={styles.badge} style={{ color, borderColor: color }}>
      <span
        className={`${styles.dot} ${live ? styles.pulse : ""}`}
        style={{ background: color }}
      />
      {statusLabel(status)}
    </span>
  );
}
