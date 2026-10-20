"use client"

import { useChat } from "@ai-sdk/react"
import type { TriggerChatTransport } from "@trigger.dev/sdk/chat"
import { useLoadTranscript, useTriggerChatTransport } from "@trigger.dev/sdk/chat/react"
import type { UIMessage } from "ai"

import { loadChatTranscript, mintChatAccessToken, startChatSession } from "@/actions/chat"
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input"
import { Spinner } from "@/components/ui/spinner"
import type { chatAgent } from "@/trigger/chat"

export function Chat({ chatId }: { chatId: string }) {
  const transport = useTriggerChatTransport<typeof chatAgent>({
    task: "chat",
    accessToken: ({ chatId }) => mintChatAccessToken(chatId),
    startSession: ({ chatId }) => startChatSession({ chatId }),
  })

  // The transcript lives in Trigger.dev, so it is read back before the chat
  // connects; useChat takes it as its initial messages.
  const { messages, isLoading } = useLoadTranscript(chatId, loadChatTranscript, {
    transport,
  })

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <ChatView chatId={chatId} initialMessages={messages} transport={transport} />
  )
}

function ChatView({
  chatId,
  initialMessages,
  transport,
}: {
  chatId: string
  initialMessages: UIMessage[]
  transport: TriggerChatTransport
}) {
  const {
    messages,
    sendMessage,
    status,
    stop: stopStreaming,
  } = useChat({
    id: chatId,
    messages: initialMessages,
    transport,
    // Reconnect to a turn still streaming when the page was reloaded.
    resume: initialMessages.length > 0,
  })

  const stop = () => {
    stopStreaming()
    void transport.stopGeneration(chatId)
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Conversation>
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              title="Start the conversation"
              description="Say hello to your new teammate."
            />
          ) : (
            messages.map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent>
                  {message.parts.map((part, index) =>
                    part.type === "text" ? (
                      <MessageResponse key={`${message.id}-${index}`}>
                        {part.text}
                      </MessageResponse>
                    ) : null
                  )}
                </MessageContent>
              </Message>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="border-t p-4">
        <PromptInput
          onSubmit={(message) => {
            if (message.text.trim()) {
              sendMessage({ text: message.text })
            }
          }}
        >
          <PromptInputBody>
            <PromptInputTextarea placeholder="Message your teammate..." />
          </PromptInputBody>
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  )
}
