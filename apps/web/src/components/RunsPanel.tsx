import { selectAllRuns, type BeaconState } from "@foundry/orchestrator";
import { fmtClock } from "../lib/format";
import { StatusBadge } from "./StatusBadge";
import styles from "./RunsPanel.module.css";

// Surface F — Active Runs Panel.
export function RunsPanel({ state }: { state: BeaconState }) {
  const runs = selectAllRuns(state);
  return (
    <section className="panel">
      <div className="panel-head">
        <span className="panel-title">Active Runs</span>
        <span className="tag">{runs.length}</span>
      </div>
      <div className={styles.list}>
        {runs.map((run) => {
          const emp = run.employeeId ? state.employees[run.employeeId] : null;
          const wo = run.workOrderId ? state.workOrders[run.workOrderId] : null;
          return (
            <div key={run.id} className={styles.row}>
              <div className={styles.head}>
                <span className={styles.runId + " mono"}>{run.id}</span>
                <StatusBadge status={run.status} />
              </div>
              <div className={styles.line}>
                <span className={styles.who}>{emp ? `${emp.id} · ${emp.name}` : "—"}</span>
                <span className={styles.started}>{fmtClock(run.startedAt)}</span>
              </div>
              <div className={styles.wo}>{wo ? `${wo.id} · ${wo.title}` : "no work order"}</div>
              {run.currentTool && <div className={styles.tool + " mono"}>{run.currentTool}</div>}
              {run.latestOutput && <div className={styles.out}>{run.latestOutput}</div>}
              {run.approvalId && <div className={styles.approval}>⚠ awaiting approval · {run.approvalId}</div>}
            </div>
          );
        })}
        {runs.length === 0 && <div className={styles.empty}>No runs.</div>}
      </div>
    </section>
  );
}
