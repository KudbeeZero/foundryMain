import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { authMiddleware, type AuthVariables } from "./middleware/auth.js";
import { messagesRoute } from "./routes/messages.js";
import { env } from "./env.js";

export const app = new Hono<{ Variables: AuthVariables }>();

app.get("/health", (c) => c.json({ ok: true }));

// Everything under /api requires authentication.
app.use("/api/*", authMiddleware);
app.route("/api", messagesRoute);

// Boot the server unless imported under test.
if (process.env.NODE_ENV !== "test") {
  serve({ fetch: app.fetch, port: env.API_PORT }, (info) => {
    console.log(`@foundry/api listening on :${info.port}`);
  });
}
