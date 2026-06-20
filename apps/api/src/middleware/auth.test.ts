import { test } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { SignJWT } from "jose";
import { authMiddleware, type AuthVariables } from "./auth.js";
import { env } from "../env.js";

// Hermetic end-to-end auth test (ROADMAP Epic 5 · F14). Signs a real Supabase-style
// HS256 JWT with the configured secret and drives it through the middleware on a
// throwaway Hono app — proving /api/* accepts valid tokens and rejects the rest,
// with no network or external provider.

const secret = new TextEncoder().encode(env.SUPABASE_JWT_SECRET);

function app() {
  const a = new Hono<{ Variables: AuthVariables }>();
  a.use("/api/*", authMiddleware);
  a.get("/api/whoami", (c) => c.json({ orgId: c.get("orgId"), userId: c.get("userId") }));
  return a;
}

async function sign(claims: Record<string, unknown>): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(secret);
}

async function call(token?: string) {
  return app().request("/api/whoami", {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

test("401 when no bearer token is presented", async () => {
  const res = await call();
  assert.equal(res.status, 401);
});

test("401 when the token is malformed / not a JWT", async () => {
  assert.equal((await call("not-a-jwt")).status, 401);
});

test("401 when the signature does not verify (wrong secret)", async () => {
  const forged = await new SignJWT({ sub: "u1", org_id: "o1" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("5m")
    .sign(new TextEncoder().encode("a-different-secret"));
  assert.equal((await call(forged)).status, 401);
});

test("401 when the token verifies but is missing org_id", async () => {
  const res = await call(await sign({ sub: "user-123" }));
  assert.equal(res.status, 401);
});

test("401 when an expired token is presented", async () => {
  const expired = await new SignJWT({ sub: "u1", org_id: "o1" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("-1m")
    .sign(secret);
  assert.equal((await call(expired)).status, 401);
});

test("200 and resolves org/user for a valid token", async () => {
  const res = await call(await sign({ sub: "user-123", org_id: "org-abc" }));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { orgId: "org-abc", userId: "user-123" });
});
