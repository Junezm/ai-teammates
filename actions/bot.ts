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
  const { userId } = await auth()
  if (!userId) {
    return { success: false, error: "You must be signed in." }
  }

  const parsed = botInsertSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: "Invalid bot details." }
  }

  await db.insert(bots).values({
    ...parsed.data,
    userId,
  })

  revalidatePath("/")
  return { success: true }
}
