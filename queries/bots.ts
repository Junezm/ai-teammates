import { auth } from "@clerk/nextjs/server"
import { and, desc, eq } from "drizzle-orm"

import { db } from "@/db"
import { bots, chatMembers, chats } from "@/db/schema"

export type ChatListItem = {
  chatId: string
  botId: string
  botName: string
  botAvatar: string
  lastMessagePreview: string | null
  lastMessageAt: Date
}

/**
 * All direct chats for the signed-in user (Clerk-scoped), newest activity
 * first, joined with their bot. Group chats are ignored for now; each direct
 * chat has exactly one bot member.
 */
export async function listUserChats(): Promise<ChatListItem[]> {
  const { userId } = await auth()
  if (!userId) {
    return []
  }

  return db
    .select({
      chatId: chats.id,
      botId: bots.id,
      botName: bots.name,
      botAvatar: bots.avatar,
      lastMessagePreview: chats.lastMessagePreview,
      lastMessageAt: chats.lastMessageAt,
    })
    .from(chats)
    .innerJoin(chatMembers, eq(chatMembers.chatId, chats.id))
    .innerJoin(bots, eq(bots.id, chatMembers.botId))
    .where(and(eq(chats.userId, userId), eq(chats.kind, "direct")))
    .orderBy(desc(chats.lastMessageAt))
}
