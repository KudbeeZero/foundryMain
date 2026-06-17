import { selectPendingApprovals, type BeaconState } from "@foundry/orchestrator";
import styles from "./ApprovalQueue.module.css";

// Surface G — Approval Queue. Approve/reject are UI-only in this stage: they emit
// a Beacon event into the local stream, with no real side effects.
export function ApprovalQueue({
  state,
  onDecide,
}: {
  state: BeaconState;
  onDecide: (approvalId: string, decision: "approved" | "rejected") => void;
}) {
  const approvals = selectPendingApprovals(state);
  return (
    <section className="panel">
      <div className="panel-head">
        <span className="panel-title">Approval Queue</span>
        <span className="tag">{approvals.length} pending</span>
      </div>
      <div className={styles.list}>
        {approvals.map((a) => {
          const emp = a.employeeId ? state.employees[a.employeeId] : null;
          return (
            <div key={a.id} className={styles.row}>
              <div className={styles.head}>
                <span className={styles.action}>{a.action}</span>
                <span className={`${styles.risk} ${styles[a.risk]}`}>{a.risk} risk</span>
              </div>
              <div className={styles.meta}>
                <span>{emp ? `${emp.id} · ${emp.name}` : "—"}</span>
                <span className="mono">{a.id}</span>
              </div>
              <div className={styles.reason}>{a.reason}</div>
              <div className={styles.actions}>
                <button className={styles.approve} onClick={() => onDecide(a.id, "approved")}>
                  Approve
                </button>
                <button className={styles.reject} onClick={() => onDecide(a.id, "rejected")}>
                  Reject
                </button>
              </div>
            </div>
          );
        })}
        {approvals.length === 0 && <div className={styles.empty}>No pending approvals.</div>}
      </div>
    </section>
  );
}
