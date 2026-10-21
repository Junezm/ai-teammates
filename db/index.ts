import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import * as schema from "./schema"

const pool = new Pool({
  // Pooled connection (PgBouncer) for application traffic.
  connectionString: process.env.DATABASE_URL,
  max: 10,
})

// An idle connection can fail asynchronously. Without a handler that is an
// unhandled 'error' event, which crashes the process — the Trigger.dev worker
// this module is also bundled into would die mid-chat.
pool.on("error", (error) => {
  console.error("[db] idle client error:", error.message)
})

export const db = drizzle(pool, { schema })
