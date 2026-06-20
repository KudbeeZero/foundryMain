// Edge/API plane configuration. Defaults keep local dev/boot working without a
// full secret set; production supplies real values via Doppler/Infisical.
export const env = {
  API_PORT: Number(process.env.API_PORT ?? 8787),
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET ?? "dev-insecure-secret",
  // Command Deck demo routes (/demo/*). On by default for local dev; set to
  // "false"/"0" in production. These routes are unauthenticated but read-only and
  // serve mock data only — they never touch the database.
  ENABLE_DEMO_ROUTES: process.env.ENABLE_DEMO_ROUTES !== "false" && process.env.ENABLE_DEMO_ROUTES !== "0",
  // Shared secret guarding the Beacon hook receiver (POST /hooks/beacon).
  // Publishers send it as the `x-beacon-token` header. Empty by default, which
  // keeps the receiver disabled (fail-closed) until a token is configured.
  BEACON_HOOK_TOKEN: process.env.BEACON_HOOK_TOKEN ?? "",
} as const;
