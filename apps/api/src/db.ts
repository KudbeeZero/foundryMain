import { createDb } from "@foundry/db";
import { env } from "./env.js";

// Single Drizzle client for the API process. `postgres()` connects lazily, so this
// is safe to construct at import time.
export const db = createDb(env.DATABASE_URL);
