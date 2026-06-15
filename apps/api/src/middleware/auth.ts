import { createMiddleware } from "hono/factory";
import { jwtVerify } from "jose";
import { env } from "../env.js";

// Variables attached to the Hono context once a request is authenticated.
export type AuthVariables = {
  orgId: string;
  userId: string;
};

const secret = new TextEncoder().encode(env.SUPABASE_JWT_SECRET);

// Verifies a Supabase-issued JWT (HS256) and resolves the caller's org + user.
// `org_id` is expected as a custom claim; `sub` is the Supabase user id.
export const authMiddleware = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const header = c.req.header("authorization");
    if (!header?.startsWith("Bearer ")) {
      return c.json({ error: "missing bearer token" }, 401);
    }

    const token = header.slice("Bearer ".length);
    try {
      const { payload } = await jwtVerify(token, secret);
      const userId = typeof payload.sub === "string" ? payload.sub : undefined;
      const orgId =
        typeof payload.org_id === "string" ? payload.org_id : undefined;
      if (!userId || !orgId) {
        return c.json({ error: "token missing sub/org_id" }, 401);
      }
      c.set("userId", userId);
      c.set("orgId", orgId);
    } catch {
      return c.json({ error: "invalid token" }, 401);
    }

    await next();
  },
);
