import { config } from "dotenv"
import { defineConfig } from "drizzle-kit"

config({ path: ".env.local" })

export default defineConfig({
  schema: "./db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    // Migrations use the direct (non-pooled) connection.
    url: process.env.DATABASE_URL_UNPOOLED!,
  },
})
