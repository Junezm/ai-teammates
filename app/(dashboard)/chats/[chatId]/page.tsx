import { notFound } from "next/navigation"

import { Chat } from "@/components/chat"
import { ChatHeader } from "@/components/chat-header"
import { getChat } from "@/queries/chats"

export default async function ChatPage(props: PageProps<"/chats/[chatId]">) {
  const { chatId } = await props.params
  const chat = await getChat(chatId)

  if (!chat) {
    notFound()
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ChatHeader chat={chat} />
      <Chat chatId={chat.chatId} />
    </div>
  )
}
