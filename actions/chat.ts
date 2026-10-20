"use server"

import { auth } from "@trigger.dev/sdk"
import { chat, defaultStorage } from "@trigger.dev/sdk/ai"

import { getChat } from "@/queries/chats"
import type { chatAgent } from "@/trigger/chat"

const startSession = chat.createStartSessionAction<typeof chatAgent>("chat")
const loadTranscript = chat.createLoadTranscriptAction(defaultStorage)

/** The transcript and session are both keyed by chatId, so ownership is the gate. */
async function assertChatOwner(chatId: string) {
  const owned = await getChat(chatId)
  if (!owned) {
    throw new Error("Chat not found")
  }
}

export async function startChatSession({ chatId }: { chatId: string }) {
  await assertChatOwner(chatId)
  return startSession({ chatId })
}

/** The transport calls this on 401/403 to refresh the session token. */
export async function mintChatAccessToken(chatId: string) {
  await assertChatOwner(chatId)
  return auth.createPublicToken({
    scopes: {
      read: { sessions: chatId },
      write: { sessions: chatId },
    },
    expirationTime: "1h",
  })
}

export async function loadChatTranscript(params: { chatId: string; limit?: number }) {
  await assertChatOwner(params.chatId)
  return loadTranscript(params)
}
