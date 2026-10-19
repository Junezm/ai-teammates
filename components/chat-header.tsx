"use client"

import { MonitorIcon } from "lucide-react"

import { BotDialog } from "@/components/bot-dialog"
import { ChatAvatar } from "@/components/chat-avatar"
import { Button } from "@/components/ui/button"
import type { ChatDetail } from "@/queries/chats"

export function ChatHeader({ chat }: { chat: ChatDetail }) {
  // Direct chats are unnamed; the bot's name stands in for the chat.
  const title = chat.chatName ?? chat.botName

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-3">
      <BotDialog
        bot={{
          id: chat.botId,
          avatar: chat.botAvatar,
          name: chat.botName,
          job: chat.botJob,
          instructions: chat.botInstructions,
        }}
      >
        <Button variant="ghost" size="sm" className="-ml-1.5 gap-2 px-1.5">
          <ChatAvatar seed={chat.botAvatar} className="size-6 rounded-full" />
          <span className="truncate font-medium">{title}</span>
        </Button>
      </BotDialog>
      <Button
        variant="outline"
        size="icon-sm"
        className="rounded-md"
        aria-label="Open desktop"
      >
        <MonitorIcon />
      </Button>
    </header>
  )
}
