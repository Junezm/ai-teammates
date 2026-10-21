import { createInsertSchema } from "drizzle-zod"
import { z } from "zod"

import { bots } from "@/db/schema"

/**
 * Full insert schema for the bots table. Server-side: the session supplies
 * `userId`; `id` and `createdAt` are database/app defaults.
 */
export const botInsertSchema = createInsertSchema(bots, {
  name: (schema) => schema.min(1).max(100),
  job: (schema) => schema.min(1).max(200),
  instructions: (schema) => schema.max(2000),
})

/**
 * Client form schema — identity, ownership, timestamp and sandbox fields are
 * owned by the server, never accepted from the client.
 */
export const botFormSchema = botInsertSchema.omit({
  id: true,
  userId: true,
  createdAt: true,
  sandboxId: true,
})

export type BotFormValues = z.infer<typeof botFormSchema>

/**
 * Update input — the same editable fields plus the id of the bot to change.
 */
export const botUpdateSchema = botFormSchema.extend({
  id: z.string().min(1),
})

export type BotUpdateValues = z.infer<typeof botUpdateSchema>
