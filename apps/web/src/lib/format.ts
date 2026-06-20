import type { BeaconStatus } from "@foundry/shared";

export function fmtDuration(ms: number | null): string {
  if (ms == null) return "—";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export function fmtTokens(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function fmtCost(n: number | null): string {
  if (n == null) return "—";
  return `$${n.toFixed(2)}`;
}

export function fmtPct(n: number | null): string {
  return n == null ? "—" : `${Math.round(n)}%`;
}

export function fmtClock(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const STATUS_LABEL: Record<BeaconStatus, string> = {
  idle: "Idle",
  thinking: "Thinking",
  editing: "Editing",
  running: "Running",
  awaiting_approval: "Awaiting approval",
  blocked: "Blocked",
  completed: "Completed",
  failed: "Failed",
};

const STATUS_VAR: Record<BeaconStatus, string> = {
  idle: "var(--st-idle)",
  thinking: "var(--st-thinking)",
  editing: "var(--st-editing)",
  running: "var(--st-running)",
  awaiting_approval: "var(--st-approval)",
  blocked: "var(--st-blocked)",
  completed: "var(--st-completed)",
  failed: "var(--st-failed)",
};

export function statusLabel(status: BeaconStatus): string {
  return STATUS_LABEL[status] ?? status;
}

export function statusColor(status: BeaconStatus): string {
  return STATUS_VAR[status] ?? "var(--st-idle)";
}

const STATUS_GRAD: Record<BeaconStatus, string> = {
  idle: "var(--grad-st-idle)",
  thinking: "var(--grad-st-thinking)",
  editing: "var(--grad-st-editing)",
  running: "var(--grad-st-running)",
  awaiting_approval: "var(--grad-st-approval)",
  blocked: "var(--grad-st-blocked)",
  completed: "var(--grad-st-completed)",
  failed: "var(--grad-st-failed)",
};

// Gradient ramp for a status — drives the Forge Sigil ring, StatusPip, and panels.
export function statusGradient(status: BeaconStatus): string {
  return STATUS_GRAD[status] ?? "var(--grad-st-idle)";
}

// A status counts as "live" (animated) while the employee is actively working.
export function isLiveStatus(status: BeaconStatus): boolean {
  return status === "running" || status === "thinking" || status === "editing";
}

// Per-employee accent gradient / solid, keyed off the agent id (E01…E10). Falls
// back to the brand ramp / cyan for any id outside the known roster.
export function employeeGradient(id: string): string {
  return `var(--grad-${id.toLowerCase()}, var(--grad-brand))`;
}
export function employeeAccent(id: string): string {
  return `var(--${id.toLowerCase()}, var(--accent))`;
}

// Two-letter monogram for a Sigil, e.g. "Maya" → "MA", "Lex" → "LE".
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}

export function priorityColor(p: "P0" | "P1" | "P2"): string {
  return p === "P0" ? "var(--p0)" : p === "P1" ? "var(--p1)" : "var(--p2)";
}
