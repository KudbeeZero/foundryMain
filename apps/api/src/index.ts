import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { authMiddleware, type AuthVariables } from "./middleware/auth.js";
import { messagesRoute } from "./routes/messages.js";
import { demoRoute } from "./routes/demo.js";
import { hooksRoute } from "./routes/hooks.js";
import { env } from "./env.js";

export const app = new Hono<{ Variables: AuthVariables }>();

app.get("/health", (c) => c.json({ ok: true }));

// Command Deck demo routes (mock data, no DB) — mounted OUTSIDE /api so they are
// not subject to, and do not alter, the authenticated /api boundary below.
if (env.ENABLE_DEMO_ROUTES) {
  app.route("/demo", demoRoute);
}

// Beacon hook receiver for Claude Code statusLine/hook publishers. Mounted
// OUTSIDE /api/* because publishers authenticate with the shared BEACON_HOOK_TOKEN
// (x-beacon-token header), not a Supabase JWT. Fail-closed: until that token is
// configured the receiver rejects every request with 503. (Does not touch /api auth.)
app.route("/hooks", hooksRoute);

// Everything under /api requires authentication. (Unchanged.)
app.use("/api/*", authMiddleware);
app.route("/api", messagesRoute);

// Boot the server unless imported under test.
if (process.env.NODE_ENV !== "test") {
  serve({ fetch: app.fetch, port: env.API_PORT }, (info) => {
    console.log(`@foundry/api listening on :${info.port}`);
  });
}
