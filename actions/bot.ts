"use server"

import { auth } from "@clerk/nextjs/server"
import { and, eq } from "drizzle-orm"
import { refresh, revalidatePath } from "next/cache"
import { z } from "zod"

import { db } from "@/db"
import { bots, chatMembers, chats } from "@/db/schema"
import { botFormSchema, botUpdateSchema } from "@/db/validation"

export type CreateBotResult =
  | { success: true; botId: string; chatId: string }
  | { success: false; error: string }

export type UpdateBotResult =
  | { success: true }
  | { success: false; error: string }

export type DeleteBotResult =
  | { success: true }
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

export async function updateBot(input: unknown): Promise<UpdateBotResult> {
  let userId: string | null | undefined
  try {
    const session = await auth()
    userId = session.userId
  } catch (e) {
    console.error("[updateBot] auth() failed:", (e as Error).message)
    return { success: false, error: "Sign-in check failed. Try again." }
  }

  if (!userId) {
    console.error("[updateBot] no session userId")
    return { success: false, error: "You must be signed in." }
  }

  const parsed = botUpdateSchema.safeParse(input)
  if (!parsed.success) {
    console.error(
      "[updateBot] validation failed:",
      JSON.stringify(parsed.error.issues)
    )
    return { success: false, error: "Invalid bot details." }
  }

  const { id, ...values } = parsed.data

  try {
    // The userId predicate scopes the write: another user's bot matches no
    // rows and is reported as missing.
    const updated = await db
      .update(bots)
      .set(values)
      .where(and(eq(bots.id, id), eq(bots.userId, userId)))
      .returning({ id: bots.id })

    if (updated.length === 0) {
      return { success: false, error: "Bot not found." }
    }

    // Sidebar shows the bot's name, and the chat header shows its face.
    revalidatePath("/", "layout")
    refresh()
    return { success: true }
  } catch (e) {
    const err = e as Error & { cause?: Error }
    console.error(
      "[updateBot] update failed:",
      err.message,
      "| cause:",
      err.cause?.message
    )
    return { success: false, error: err.cause?.message ?? err.message }
  }
}

export async function deleteBot(id: unknown): Promise<DeleteBotResult> {
  let userId: string | null | undefined
  try {
    const session = await auth()
    userId = session.userId
  } catch (e) {
    console.error("[deleteBot] auth() failed:", (e as Error).message)
    return { success: false, error: "Sign-in check failed. Try again." }
  }

  if (!userId) {
    console.error("[deleteBot] no session userId")
    return { success: false, error: "You must be signed in." }
  }

  const parsed = z.string().min(1).safeParse(id)
  if (!parsed.success) {
    return { success: false, error: "Invalid bot id." }
  }

  try {
    // Memberships cascade from the bot, leaving the chat row behind — it is
    // user-scoped and harmless.
    const deleted = await db
      .delete(bots)
      .where(and(eq(bots.id, parsed.data), eq(bots.userId, userId)))
      .returning({ id: bots.id })

    if (deleted.length === 0) {
      return { success: false, error: "Bot not found." }
    }

    revalidatePath("/", "layout")
    refresh()
    return { success: true }
  } catch (e) {
    const err = e as Error & { cause?: Error }
    console.error(
      "[deleteBot] delete failed:",
      err.message,
      "| cause:",
      err.cause?.message
    )
    return { success: false, error: err.cause?.message ?? err.message }
  }
}
