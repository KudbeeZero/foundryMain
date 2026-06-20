import type { CSSProperties } from "react";
import { selectEmployees, type BeaconState } from "@foundry/orchestrator";
import { employeeGradient, fmtClock, statusColor } from "../lib/format";
import { Sigil } from "./Sigil";
import { StatusBadge } from "./StatusBadge";
import styles from "./RosterBoard.module.css";

// Surface C — Employee Roster Board. The 10 AI employees as live cards.
export function RosterBoard({ state }: { state: BeaconState }) {
  const employees = selectEmployees(state);
  return (
    <section className="panel">
      <div className="panel-head">
        <span className="panel-title">Employee Roster</span>
        <span className="tag">{employees.length} employees</span>
      </div>
      <div className={styles.grid}>
        {employees.map((e) => {
          const assignment = e.currentAssignment
            ? state.workOrders[e.currentAssignment]
            : null;
          const cardStyle = {
            "--g": employeeGradient(e.id),
            "--ringc": statusColor(e.status),
          } as CSSProperties;
          return (
            <article key={e.id} className={styles.card} style={cardStyle}>
              <div className={styles.top}>
                <Sigil id={e.id} name={e.name} status={e.status} size={34} />
                <span className={styles.id}>{e.id}</span>
                <span className={styles.level}>{e.level}</span>
                <StatusBadge status={e.status} />
              </div>
              <div className={styles.name}>{e.name}</div>
              <div className={styles.role}>{e.role}</div>
              <div className={styles.lane} title={e.lane}>
                <span className={styles.k}>lane</span>
                <span className="mono">{e.lane}</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.k}>assignment</span>
                <span className={styles.v}>
                  {assignment ? `${assignment.id} · ${assignment.title}` : "—"}
                </span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.k}>escalates</span>
                <span className={styles.v}>{e.escalation.join(" → ")}</span>
              </div>
              <div className={styles.last}>
                <span className={styles.k}>last</span>
                <span className={styles.v}>
                  {e.lastEventTitle ?? "no activity"}
                  {e.lastEventAt ? ` · ${fmtClock(e.lastEventAt)}` : ""}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
