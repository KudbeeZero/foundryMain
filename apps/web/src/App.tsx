import { useBeacon } from "./hooks/useBeacon";
import { CommandBar } from "./components/CommandBar";
import { BeaconPill } from "./components/BeaconPill";
import { TeamDashboard } from "./components/TeamDashboard";
import { RosterBoard } from "./components/RosterBoard";
import { TeamsPanel } from "./components/TeamsPanel";
import { WorkOrderBoard } from "./components/WorkOrderBoard";
import { RunsPanel } from "./components/RunsPanel";
import { ApprovalQueue } from "./components/ApprovalQueue";
import { MemoryLayers } from "./components/MemoryLayers";
import styles from "./App.module.css";

export function App() {
  const { state, connection, decideApproval } = useBeacon();

  return (
    <div className={styles.shell}>
      <CommandBar state={state} connection={connection} />
      <BeaconPill state={state} />
      <TeamDashboard state={state} />

      <main className={styles.grid}>
        <section className={styles.colWide}>
          <RosterBoard state={state} />
          <WorkOrderBoard state={state} />
        </section>

        <aside className={styles.colNarrow}>
          <RunsPanel state={state} />
          <ApprovalQueue state={state} onDecide={decideApproval} />
          <TeamsPanel state={state} />
          <MemoryLayers />
        </aside>
      </main>

      <footer className={styles.footer}>
        Foundry Command Deck · local/demo mode · mock data · no cloud dependency
      </footer>
    </div>
  );
}
