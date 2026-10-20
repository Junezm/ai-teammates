"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"

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

export function Chat({ chatId }: { chatId: string }) {
  const { messages, sendMessage, status, stop } = useChat({
    id: chatId,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  })

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
