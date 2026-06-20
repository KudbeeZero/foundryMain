import type { CSSProperties } from "react";
import type { BeaconStatus } from "@foundry/shared";
import { isLiveStatus, statusGradient } from "../lib/format";
import styles from "./StatusPip.module.css";

// A small gradient hexagon that replaces the old round status dot. Pulses while
// the status is live (running / thinking / editing).
export function StatusPip({
  status,
  size = 8,
}: {
  status: BeaconStatus;
  size?: number;
}) {
  const style = {
    background: statusGradient(status),
    width: size,
    height: size,
  } as CSSProperties;

  return (
    <span
      className={`${styles.pip} ${isLiveStatus(status) ? styles.pulse : ""}`}
      style={style}
      aria-hidden="true"
    />
  );
}
