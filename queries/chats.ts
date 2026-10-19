import { auth } from "@clerk/nextjs/server"
import { and, eq } from "drizzle-orm"

import { db } from "@/db"
import { bots, chatMembers, chats } from "@/db/schema"

export type ChatDetail = {
  chatId: string
  chatName: string | null
  kind: "direct" | "group"
  botId: string
  botName: string
  botAvatar: string
  botJob: string
  botInstructions: string | null
}

/**
 * One chat by id, scoped to the signed-in user. Returns null when the chat
 * does not exist or belongs to someone else. Group chats take the first
 * member for now.
 */
export async function getChat(chatId: string): Promise<ChatDetail | null> {
  const { userId } = await auth()
  if (!userId) {
    return null
  }

  const [chat] = await db
    .select({
      chatId: chats.id,
      chatName: chats.name,
      kind: chats.kind,
      botId: bots.id,
      botName: bots.name,
      botAvatar: bots.avatar,
      botJob: bots.job,
      botInstructions: bots.instructions,
    })
    .from(chats)
    .innerJoin(chatMembers, eq(chatMembers.chatId, chats.id))
    .innerJoin(bots, eq(bots.id, chatMembers.botId))
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .limit(1)

  return chat ?? null
}
