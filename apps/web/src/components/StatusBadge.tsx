import type { BeaconStatus } from "@foundry/shared";
import { statusColor, statusLabel } from "../lib/format";
import { StatusPip } from "./StatusPip";
import styles from "./StatusBadge.module.css";

export function StatusBadge({ status }: { status: BeaconStatus }) {
  const color = statusColor(status);
  return (
    <span className={styles.badge} style={{ color, borderColor: color }}>
      <StatusPip status={status} />
      {statusLabel(status)}
    </span>
  );
}
