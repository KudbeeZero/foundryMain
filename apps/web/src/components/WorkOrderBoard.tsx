import {
  selectWorkOrdersByColumn,
  WORK_ORDER_COLUMN,
  type BeaconState,
  type WorkOrder,
  type WorkOrderColumn,
} from "@foundry/orchestrator";
import { priorityColor } from "../lib/format";
import styles from "./WorkOrderBoard.module.css";

const COLUMN_LABEL: Record<WorkOrderColumn, string> = {
  inbox: "Inbox",
  assigned: "Assigned",
  running: "Running",
  awaiting_approval: "Awaiting Approval",
  awaiting_audit: "Awaiting Audit",
  done: "Done",
  blocked: "Blocked",
};

// Surface E — Work Order Board (kanban across the lifecycle columns).
export function WorkOrderBoard({ state }: { state: BeaconState }) {
  const byColumn = selectWorkOrdersByColumn(state);
  return (
    <section className="panel">
      <div className="panel-head">
        <span className="panel-title">Work Order Board</span>
        <span className="tag">PROBLEM · WHEN · PRIORITY · NOTES</span>
      </div>
      <div className={styles.board}>
        {WORK_ORDER_COLUMN.map((col) => (
          <div key={col} className={styles.column}>
            <div className={styles.colHead}>
              <span>{COLUMN_LABEL[col]}</span>
              <span className={styles.count}>{byColumn[col].length}</span>
            </div>
            <div className={styles.cards}>
              {byColumn[col].map((wo) => (
                <Card key={wo.id} wo={wo} employeeName={nameOf(state, wo.assignedTo)} />
              ))}
              {byColumn[col].length === 0 && <div className={styles.empty}>—</div>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Card({ wo, employeeName }: { wo: WorkOrder; employeeName: string }) {
  return (
    <article className={styles.card}>
      <div className={styles.cardTop}>
        <span className={styles.priority} style={{ color: priorityColor(wo.priority), borderColor: priorityColor(wo.priority) }}>
          {wo.priority}
        </span>
        <span className={styles.woId}>{wo.id}</span>
        {wo.memoryUpdateRequired && <span className={styles.mem} title="Memory update required">mem</span>}
      </div>
      <div className={styles.title}>{wo.title}</div>
      <div className={styles.problem}>{wo.problem}</div>
      <div className={styles.branch + " mono"}>{wo.branch}</div>
      <div className={styles.footer}>
        <span className={styles.assignee}>{wo.assignedTo ? `${wo.assignedTo} · ${employeeName}` : "unassigned"}</span>
        <span className={styles.repo}>{wo.repo}</span>
      </div>
      <div className={styles.subFooter}>
        <span title="Reviewers required">👁 {wo.reviewers.join(", ") || "—"}</span>
        <span title="Audit TODOs">✓ {wo.auditTodoCount}</span>
      </div>
    </article>
  );
}

function nameOf(state: BeaconState, id: string | null): string {
  return id ? state.employees[id]?.name ?? "" : "";
}
