import { Hono } from "hono";
import {
  createInitialBeaconState,
  generateMockHistory,
  mockSeed,
  reduceBeaconEvents,
  selectCounts,
} from "@foundry/orchestrator";

// Dev-safe demo routes for the Command Deck. Mounted at /demo/* — OUTSIDE the
// authenticated /api/* boundary — so the web app can hydrate from mock data in
// local/demo mode without a token, and WITHOUT weakening real /api auth. These
// routes touch no database and return only synthetic mock data. They are gated by
// env.ENABLE_DEMO_ROUTES (on by default for local dev; turn off in production).
export const demoRoute = new Hono();

demoRoute.get("/command-deck", (c) => {
  return c.json({ mode: "demo", seed: mockSeed });
});

demoRoute.get("/beacon/events", (c) => {
  return c.json({ mode: "demo", events: generateMockHistory() });
});

demoRoute.get("/beacon/state", (c) => {
  const state = reduceBeaconEvents(createInitialBeaconState(mockSeed), generateMockHistory());
  return c.json({ mode: "demo", counts: selectCounts(state), state });
});
