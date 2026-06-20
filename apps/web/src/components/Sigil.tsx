import type { CSSProperties } from "react";
import type { BeaconStatus } from "@foundry/shared";
import { employeeGradient, initials, statusColor } from "../lib/format";
import styles from "./Sigil.module.css";

// The Forge Sigil — Foundry's signature employee token. A beveled hexagon (not a
// circle) filled with the employee's accent gradient, wrapped in a status-colored
// ring that glows while they're live. Replaces avatar circles across the Deck.
export function Sigil({
  id,
  name,
  status,
  size = 44,
}: {
  id: string;
  name: string;
  status: BeaconStatus;
  size?: number;
}) {
  const style = {
    "--g": employeeGradient(id),
    "--ringc": statusColor(status),
    width: size,
    height: size,
    fontSize: Math.round(size * 0.3),
  } as CSSProperties;

  return (
    <span className={styles.sigil} style={style} title={`${id} · ${name}`} aria-label={`${id} ${name}`}>
      <span className={styles.inner}>{initials(name)}</span>
    </span>
  );
}
