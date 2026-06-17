import type { Team } from "../beacon/model.js";

// Foundry departments/squads. Each employee belongs to exactly one team; the
// Command Deck Teams panel renders membership from these.
export const mockTeams: Team[] = [
  { id: "T-FE", name: "Frontend", memberIds: ["E01", "E02"] },
  { id: "T-BE", name: "Backend", memberIds: ["E03"] },
  { id: "T-CHAIN", name: "Chain / Funds", memberIds: ["E04"] },
  { id: "T-DB", name: "Database", memberIds: ["E05"] },
  { id: "T-DEVOPS", name: "DevOps", memberIds: ["E06"] },
  { id: "T-AUTH", name: "Auth", memberIds: ["E07"] },
  { id: "T-QA", name: "QA", memberIds: ["E08"] },
  { id: "T-DESIGN", name: "Design", memberIds: ["E09"] },
  { id: "T-ARCH", name: "Architecture", memberIds: ["E10"] },
];
