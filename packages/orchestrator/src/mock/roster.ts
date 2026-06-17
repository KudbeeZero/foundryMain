import type { Employee, SeniorityLevel } from "../beacon/model.js";

// The 10 Foundry AI employees. Lanes, levels and escalation paths are Foundry's
// own — remapped onto this repo's real paths. (Any prior project's file lanes,
// chain/globe specifics, or third-party product names have been stripped.)
// `id` doubles as the Beacon event `agentId`.

interface RosterDef {
  id: string;
  name: string;
  role: string;
  level: SeniorityLevel;
  teamId: string;
  lane: string;
  escalation: string[];
  personality: string;
}

const ROSTER_DEFS: RosterDef[] = [
  {
    id: "E01",
    name: "Maya",
    role: "Frontend Engineer (Features)",
    level: "L2",
    teamId: "T-FE",
    lane: "apps/web/src/components/**, apps/web/src/pages/**, apps/web/src/ui/**",
    escalation: ["E09", "E10"],
    personality: "Pragmatic; ships UI fast; asks for design tokens up front.",
  },
  {
    id: "E02",
    name: "John",
    role: "Frontend Bug Fixer",
    level: "L1",
    teamId: "T-FE",
    lane: "Whatever is broken on the web client today — bug-only branches.",
    escalation: ["E01", "E08"],
    personality: "Short reports: here's the repro, here's the fix, here's the test.",
  },
  {
    id: "E03",
    name: "Priya",
    role: "Backend Engineer",
    level: "L2",
    teamId: "T-BE",
    lane: "apps/api/src/routes/**, apps/api/src/**, new endpoints",
    escalation: ["E04", "E10"],
    personality: "Careful about contracts; refuses to break API shapes.",
  },
  {
    id: "E04",
    name: "Diego",
    role: "Chain / Funds Engineer",
    level: "L3",
    teamId: "T-CHAIN",
    lane: "Reserved chain/funds lane — no execution wired in Foundry yet.",
    escalation: ["E10"],
    personality: "Paranoid about funds; demands idempotency on every money path.",
  },
  {
    id: "E05",
    name: "Sasha",
    role: "Database / Drizzle",
    level: "L3",
    teamId: "T-DB",
    lane: "packages/db/src/schema.ts, packages/db/migrations/**",
    escalation: ["E10"],
    personality: "Additive-only migrations; never drops or renames.",
  },
  {
    id: "E06",
    name: "Kenji",
    role: "DevOps / Infra / CI",
    level: "L2",
    teamId: "T-DEVOPS",
    lane: ".github/workflows/**, turbo.json, scripts/**, root build config",
    escalation: ["E10"],
    personality: "Caches everything; insists on green CI before merge.",
  },
  {
    id: "E07",
    name: "Amara",
    role: "Auth Integration",
    level: "L3",
    teamId: "T-AUTH",
    lane: "apps/api/src/middleware/auth.ts, future auth wiring (deferred)",
    escalation: ["E10"],
    personality: "Reads the auth skill docs first; explains auth in three lines.",
  },
  {
    id: "E08",
    name: "Theo",
    role: "Testing / QA",
    level: "L1",
    teamId: "T-QA",
    lane: "**/*.test.ts, test suites across the workspace",
    escalation: ["code-owner", "E10"],
    personality: "Fail-first tests; no fix without a failing test.",
  },
  {
    id: "E09",
    name: "Riya",
    role: "Design System / Frontend Visual",
    level: "L3",
    teamId: "T-DESIGN",
    lane: "apps/web/src/styles/**, design tokens, theme",
    escalation: ["E10"],
    personality: "Guards the design system; refuses ad-hoc one-off styles.",
  },
  {
    id: "E10",
    name: "Lex",
    role: "Tech Lead / Architect",
    level: "L4",
    teamId: "T-ARCH",
    lane: "CLAUDE.md, docs/**, repo-wide refactors, architecture gates",
    escalation: ["operator"],
    personality: "Assigns work; never writes feature code unless asked; gatekeeper.",
  },
];

export const mockRoster: Employee[] = ROSTER_DEFS.map((d) => ({
  ...d,
  status: "idle",
  currentAssignment: null,
  currentSessionId: null,
  currentRepo: null,
  currentTool: null,
  lastEventTitle: null,
  lastEventAt: null,
}));
