// @foundry/orchestrator — pure, IO-free state logic for the Orchestration plane.
// Stage 2 lands the Beacon reducer/selectors and the Command Deck mock data; these
// are consumed by apps/web today and by the real workers in a later stage.
export const PACKAGE = "@foundry/orchestrator" as const;

export * from "./beacon/index.js";
export * from "./runloop/index.js";

// Mock/demo data — explicitly namespaced so it is obvious at call sites that this
// is local demo content, not production data.
export { mockSeed, generateMockHistory, createLiveEventGenerator } from "./mock/events.js";
export { mockRoster } from "./mock/roster.js";
export { mockTeams } from "./mock/teams.js";
export { mockWorkOrders } from "./mock/workOrders.js";
