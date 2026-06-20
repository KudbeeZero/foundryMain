import type { CSSProperties } from "react";
import { selectEmployees, type BeaconState } from "@foundry/orchestrator";
import { employeeGradient, isLiveStatus, statusColor, statusLabel } from "../lib/format";
import { fmtClock } from "../lib/format";
import { Sigil } from "./Sigil";
import { StatusPip } from "./StatusPip";
import styles from "./TeamDashboard.module.css";

// Surface — Team Dashboard. The "log on and see each other's jobs" board: one
// gradient panel per employee showing who they are, whether they're live, and the
// exact job they're on right now. Driven entirely by Beacon selector state.
export function TeamDashboard({ state }: { state: BeaconState }) {
  const employees = selectEmployees(state);
  const active = employees.filter((e) => e.status !== "idle").length;

  return (
    <section className="panel">
      <div className="panel-head">
        <span className="panel-title">Team · who's on what</span>
        <span className="tag">{active}/{employees.length} active</span>
      </div>

      <div className={styles.grid}>
        {employees.map((e) => {
          const job = e.currentAssignment ? state.workOrders[e.currentAssignment] : null;
          const jobText = job
            ? `${job.id} · ${job.title}`
            : e.status === "idle"
              ? "Available"
              : e.lastEventTitle ?? "Working…";

          const cardStyle = {
            "--g": employeeGradient(e.id),
            "--ringc": statusColor(e.status),
          } as CSSProperties;

          return (
            <article key={e.id} className={styles.card} style={cardStyle}>
              <div className={styles.head}>
                <Sigil id={e.id} name={e.name} status={e.status} size={46} />
                <div className={styles.who}>
                  <div className={styles.name}>
                    {e.name} <span className={styles.id}>{e.id}</span>
                  </div>
                  <div className={styles.role}>{e.role}</div>
                </div>
                <span className={styles.level}>{e.level}</span>
              </div>

              <div className={styles.statusRow}>
                <StatusPip status={e.status} />
                <span className={styles.statusLabel} style={{ color: statusColor(e.status) }}>
                  {statusLabel(e.status)}
                </span>
                {isLiveStatus(e.status) && e.currentRepo ? (
                  <span className={`${styles.repo} mono`}>{e.currentRepo}</span>
                ) : null}
              </div>

              <div className={styles.job}>
                <span className={styles.jobK}>Current job</span>
                <span className={styles.jobV} title={jobText}>{jobText}</span>
              </div>

              <div className={styles.foot}>
                <span className={`${styles.tool} mono`}>{e.currentTool ?? "—"}</span>
                <span className={styles.when}>
                  {e.lastEventAt ? fmtClock(e.lastEventAt) : "no activity"}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
