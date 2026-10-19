"use server"

import { auth } from "@clerk/nextjs/server"
import { refresh, revalidatePath } from "next/cache"

import { db } from "@/db"
import { bots, chatMembers, chats } from "@/db/schema"
import { botFormSchema } from "@/db/validation"

export type CreateBotResult =
  | { success: true; botId: string; chatId: string }
  | { success: false; error: string }

export async function createBot(input: unknown): Promise<CreateBotResult> {
  let userId: string | null | undefined
  try {
    const session = await auth()
    userId = session.userId
  } catch (e) {
    console.error("[createBot] auth() failed:", (e as Error).message)
    return { success: false, error: "Sign-in check failed. Try again." }
  }

  if (!userId) {
    console.error("[createBot] no session userId")
    return { success: false, error: "You must be signed in." }
  }

  const parsed = botFormSchema.safeParse(input)
  if (!parsed.success) {
    console.error(
      "[createBot] validation failed:",
      JSON.stringify(parsed.error.issues)
    )
    return { success: false, error: "Invalid bot details." }
  }

  try {
    const { botId, chatId } = await db.transaction(async (tx) => {
      const [bot] = await tx
        .insert(bots)
        .values({
          ...parsed.data,
          userId,
        })
        .returning({ id: bots.id })

      const [chat] = await tx
        .insert(chats)
        // Direct chats are unnamed; the UI shows the bot's name.
        .values({ userId, kind: "direct" })
        .returning({ id: chats.id })

      await tx.insert(chatMembers).values({
        chatId: chat.id,
        botId: bot.id,
      })

      return { botId: bot.id, chatId: chat.id }
    })

    // Mark the layout stale for other routes, then refetch the current route
    // so the sidebar (which calls listUserChats() in the layout) shows the new
    // bot in the same roundtrip.
    revalidatePath("/", "layout")
    refresh()
    return { success: true, botId, chatId }
  } catch (e) {
    const err = e as Error & { cause?: Error }
    console.error(
      "[createBot] transaction failed:",
      err.message,
      "| cause:",
      err.cause?.message
    )
    return { success: false, error: err.cause?.message ?? err.message }
  }
}
