// Edge/API plane configuration. Defaults keep local dev/boot working without a
// full secret set; production supplies real values via Doppler/Infisical.
export const env = {
  API_PORT: Number(process.env.API_PORT ?? 8787),
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET ?? "dev-insecure-secret",
} as const;
