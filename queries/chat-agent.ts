import { eq } from "drizzle-orm"

import { db } from "@/db"
import { bots, chatMembers } from "@/db/schema"

export type ChatAgentContext = {
  name: string
  job: string
  instructions: string | null
  sandboxId: string | null
}

/**
 * The bot a chat talks to, for the chat agent's base instructions.
 *
 * Unlike the other query helpers this one does not call `auth()`: it runs in
 * the Trigger.dev worker, where there is no Clerk request. The chat id is
 * already authorized when the session is started, and the worker only ever
 * receives ids from sessions the app created.
 */
export async function getChatAgentContext(
  chatId: string
): Promise<ChatAgentContext | null> {
  const [bot] = await db
    .select({
      name: bots.name,
      job: bots.job,
      instructions: bots.instructions,
      sandboxId: bots.sandboxId,
    })
    .from(chatMembers)
    .innerJoin(bots, eq(bots.id, chatMembers.botId))
    .where(eq(chatMembers.chatId, chatId))
    .limit(1)

  return bot ?? null
}
