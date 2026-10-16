"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"

import { db } from "@/db"
import { bots } from "@/db/schema"
import { botInsertSchema } from "@/db/validation"

export type CreateBotResult =
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

  const parsed = botInsertSchema.safeParse(input)
  if (!parsed.success) {
    console.error(
      "[createBot] validation failed:",
      JSON.stringify(parsed.error.issues)
    )
    return { success: false, error: "Invalid bot details." }
  }

  try {
    await db.insert(bots).values({
      ...parsed.data,
      userId,
    })
  } catch (e) {
    const err = e as Error & { cause?: Error }
    console.error(
      "[createBot] insert failed:",
      err.message,
      "| cause:",
      err.cause?.message
    )
    return { success: false, error: err.cause?.message ?? err.message }
  }

  revalidatePath("/")
  return { success: true }
}
