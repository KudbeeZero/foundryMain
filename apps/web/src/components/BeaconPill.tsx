import type { ReactNode } from "react";
import { selectBeaconPill, type BeaconState } from "@foundry/orchestrator";
import { fmtCost, fmtDuration, fmtPct, fmtTokens, statusColor, statusLabel } from "../lib/format";
import { StatusPip } from "./StatusPip";
import styles from "./BeaconPill.module.css";

// Surface B — the Foundry-branded live Beacon pill (Glint-style, but ours).
export function BeaconPill({ state }: { state: BeaconState }) {
  const pill = selectBeaconPill(state);
  const color = statusColor(pill.status);

  return (
    <div className={styles.pill} style={{ borderColor: color, boxShadow: `0 0 32px -12px ${color}` }}>
      <div className={styles.left}>
        <span className={styles.beaconLabel}>BEACON</span>
        <span className={styles.status} style={{ color }}>
          <StatusPip status={pill.status} size={9} />
          {statusLabel(pill.status)}
        </span>
      </div>

      <div className={styles.identity}>
        <Field label="Session">{pill.session?.id ?? "—"}</Field>
        <Field label="Employee">
          {pill.employee ? `${pill.employee.id} · ${pill.employee.name}` : "—"}
        </Field>
        <Field label="Repo">{pill.repo ?? "—"}</Field>
        <Field label="Tool / Command" wide>
          <span className="mono">{pill.tool ?? "idle"}</span>
        </Field>
      </div>

      <div className={styles.metrics}>
        <Metric label="Context" value={fmtPct(pill.contextPct)} />
        <Metric label="Tokens" value={fmtTokens(pill.tokens)} />
        <Metric label="Cost" value={fmtCost(pill.costUsd)} />
        <Metric label="Elapsed" value={fmtDuration(pill.elapsedMs)} />
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  wide,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`${styles.field} ${wide ? styles.wide : ""}`}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValue}>{children}</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.metric}>
      <span className={styles.metricValue}>{value}</span>
      <span className={styles.metricLabel}>{label}</span>
    </div>
  );
}
