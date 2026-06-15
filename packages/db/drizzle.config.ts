import { defineConfig } from "drizzle-kit";

// Kept at the package root (outside `src/`) so the typecheck gate does not require
// drizzle-kit's types; `drizzle-kit generate` reads it directly via tsx.
export default defineConfig({
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
