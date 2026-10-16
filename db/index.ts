import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import * as schema from "./schema"

const pool = new Pool({
  // Pooled connection (PgBouncer) for application traffic.
  connectionString: process.env.DATABASE_URL,
  max: 10,
})

export const db = drizzle(pool, { schema })
