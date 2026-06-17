import { selectTeamsWithMembers, type BeaconState } from "@foundry/orchestrator";
import { statusColor } from "../lib/format";
import styles from "./TeamsPanel.module.css";

// Surface D — Teams / Departments with membership.
export function TeamsPanel({ state }: { state: BeaconState }) {
  const teams = selectTeamsWithMembers(state);
  return (
    <section className="panel">
      <div className="panel-head">
        <span className="panel-title">Teams / Departments</span>
        <span className="tag">{teams.length}</span>
      </div>
      <div className={styles.list}>
        {teams.map(({ team, members }) => (
          <div key={team.id} className={styles.team}>
            <div className={styles.name}>
              {team.name}
              <span className={styles.size}>{members.length}</span>
            </div>
            <div className={styles.members}>
              {members.map((m) => (
                <span key={m.id} className={styles.member} title={`${m.name} · ${m.status}`}>
                  <span className="dot" style={{ background: statusColor(m.status) }} />
                  {m.id} {m.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
