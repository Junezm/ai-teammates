"use client"

import { useChat } from "@ai-sdk/react"
import type { TriggerChatTransport } from "@trigger.dev/sdk/chat"
import {
  useLoadTranscript,
  useTriggerChatTransport,
} from "@trigger.dev/sdk/chat/react"
import {
  EyeIcon,
  KeyboardIcon,
  MonitorIcon,
  MouseIcon,
  MousePointer2Icon,
  MousePointerClickIcon,
  WrenchIcon,
} from "lucide-react"
import type { ComponentType } from "react"

import {
  loadChatTranscript,
  mintChatAccessToken,
  startChatSession,
} from "@/actions/chat"
import { CodeBlock } from "@/components/ai-elements/code-block"
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
import { Tool, ToolContent, ToolHeader } from "@/components/ai-elements/tool"
import { Spinner } from "@/components/ui/spinner"
import type { ChatUIMessage, chatAgent } from "@/trigger/chat"

export function Chat({ chatId }: { chatId: string }) {
  const transport = useTriggerChatTransport<typeof chatAgent>({
    task: "chat",
    accessToken: ({ chatId }) => mintChatAccessToken(chatId),
    startSession: ({ chatId }) => startChatSession({ chatId }),
  })

  // The transcript lives in Trigger.dev, so it is read back before the chat
  // connects; useChat takes it as its initial messages.
  const { messages, isLoading } = useLoadTranscript(
    chatId,
    loadChatTranscript,
    {
      transport,
    }
  )

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <ChatView
      chatId={chatId}
      initialMessages={messages}
      transport={transport}
    />
  )
}

function ChatView({
  chatId,
  initialMessages,
  transport,
}: {
  chatId: string
  initialMessages: ChatUIMessage[]
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
              description="Say hello — or ask your teammate to run a command, work a file, or show you its screen."
            />
          ) : (
            messages.map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent>
                  {message.parts.map((part, index) => {
                    if (part.type === "text") {
                      return (
                        <MessageResponse key={`${message.id}-${index}`}>
                          {part.text}
                        </MessageResponse>
                      )
                    }
                    if (isToolPart(part)) {
                      return (
                        <ToolCall key={`${message.id}-${index}`} part={part} />
                      )
                    }
                    return null
                  })}
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

/**
 * Tool call rendering
 *
 * The agent's tool parts arrive typed (`tool-bash` carries the bash input and
 * output), so each renderer below narrows to its own part and reads input and
 * output without casts. Desktop actions render as slim one-line rows so a long
 * look-act-look sequence stays readable; bash and the file tools render as
 * collapsible cards with their details.
 */

type ChatPart = ChatUIMessage["parts"][number]
type ToolPart = Extract<ChatPart, { type: `tool-${string}` }>
type TypedToolPart<TName extends ToolPart["type"]> = Extract<
  ToolPart,
  { type: TName }
>

function isToolPart(part: ChatPart): part is ToolPart {
  return part.type.startsWith("tool-")
}

function isRunning(state: ToolPart["state"]): boolean {
  return state === "input-streaming" || state === "input-available"
}

function ToolCall({ part }: { part: ToolPart }) {
  switch (part.type) {
    case "tool-bash":
      return <BashCall part={part} />
    case "tool-readFile":
      return <ReadFileCall part={part} />
    case "tool-writeFile":
      return <WriteFileCall part={part} />
    case "tool-listFiles":
      return <ListFilesCall part={part} />
    case "tool-mouseClick":
      return <MouseClickCall part={part} />
    case "tool-mouseMove":
      return <MouseMoveCall part={part} />
    case "tool-mouseScroll":
      return <MouseScrollCall part={part} />
    case "tool-keyboardType":
      return <KeyboardTypeCall part={part} />
    case "tool-keyboardPress":
      return <KeyboardPressCall part={part} />
    case "tool-viewScreen":
      return <ViewScreenCall part={part} />
    case "tool-showScreen":
      return <ShowScreenCall part={part} />
    default: {
      // Exhaustive today; an older transcript could still carry a retired
      // tool name, so fall back to a generic row instead of dropping it.
      const fallback = part as ToolPart
      return (
        <ActionRow icon={WrenchIcon} label={fallback.type} part={fallback} />
      )
    }
  }
}

/** A quiet one-line row for an action whose details live in its summary. */
function ActionRow({
  icon: Icon,
  label,
  part,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  part: ToolPart
}) {
  return (
    <div className="flex items-center gap-2 py-0.5 text-xs text-muted-foreground">
      <Icon className="size-3.5 shrink-0" />
      <span className="truncate">{label}</span>
      {isRunning(part.state) && <Spinner className="size-3" />}
      {part.state === "output-error" && (
        <span className="truncate text-destructive">{part.errorText}</span>
      )}
    </div>
  )
}

function ErrorText({ children }: { children: string }) {
  return (
    <div className="rounded-md bg-destructive/10 p-3 font-mono text-xs whitespace-pre-wrap text-destructive">
      {children}
    </div>
  )
}

function BashCall({ part }: { part: TypedToolPart<"tool-bash"> }) {
  const input = part.state === "input-streaming" ? undefined : part.input
  const output = part.state === "output-available" ? part.output : undefined
  const command = input?.command ?? "…"
  const summary = firstLine(command).slice(0, 60)

  return (
    <Tool className="mb-1">
      <ToolHeader
        title={`bash — ${summary}`}
        type={part.type}
        state={part.state}
      />
      <ToolContent>
        <CodeBlock code={command} language="bash" />
        {part.state === "output-error" ? (
          <ErrorText>{part.errorText}</ErrorText>
        ) : (
          output && (
            <div className="rounded-md bg-muted/50">
              <div className="flex items-center justify-between border-b px-3 py-1.5 text-xs text-muted-foreground">
                <span>exit code {output.exitCode}</span>
                {output.truncated && <span>output truncated</span>}
              </div>
              <pre className="max-h-64 overflow-auto p-3 font-mono text-xs whitespace-pre-wrap">
                {output.output || "No output"}
              </pre>
            </div>
          )
        )}
      </ToolContent>
    </Tool>
  )
}

function ReadFileCall({ part }: { part: TypedToolPart<"tool-readFile"> }) {
  const input = part.state === "input-streaming" ? undefined : part.input
  const output = part.state === "output-available" ? part.output : undefined
  const path = input?.path ?? "…"

  return (
    <Tool className="mb-1">
      <ToolHeader
        title={`read — ${path}`}
        type={part.type}
        state={part.state}
      />
      <ToolContent>
        {part.state === "output-error" ? (
          <ErrorText>{part.errorText}</ErrorText>
        ) : output ? (
          output.error ? (
            <ErrorText>{output.error}</ErrorText>
          ) : (
            <pre className="max-h-72 overflow-auto rounded-md bg-muted/50 p-3 font-mono text-xs whitespace-pre-wrap">
              {output.content ?? ""}
              {output.truncated && "\n… (truncated)"}
            </pre>
          )
        ) : null}
      </ToolContent>
    </Tool>
  )
}

function WriteFileCall({ part }: { part: TypedToolPart<"tool-writeFile"> }) {
  const input = part.state === "input-streaming" ? undefined : part.input
  const output = part.state === "output-available" ? part.output : undefined
  const path = input?.path ?? "…"

  return (
    <Tool className="mb-1">
      <ToolHeader
        title={`write — ${path}`}
        type={part.type}
        state={part.state}
      />
      <ToolContent>
        {part.state === "output-error" ? (
          <ErrorText>{part.errorText}</ErrorText>
        ) : (
          input && (
            <div className="flex flex-col gap-1.5">
              {output && (
                <div className="text-xs text-muted-foreground">
                  Wrote {formatBytes(output.bytes)}
                </div>
              )}
              <pre className="max-h-72 overflow-auto rounded-md bg-muted/50 p-3 font-mono text-xs whitespace-pre-wrap">
                {input.content}
              </pre>
            </div>
          )
        )}
      </ToolContent>
    </Tool>
  )
}

function ListFilesCall({ part }: { part: TypedToolPart<"tool-listFiles"> }) {
  const input = part.state === "input-streaming" ? undefined : part.input
  const output = part.state === "output-available" ? part.output : undefined
  const path = input?.path ?? "…"

  return (
    <Tool className="mb-1">
      <ToolHeader title={`ls — ${path}`} type={part.type} state={part.state} />
      <ToolContent>
        {part.state === "output-error" ? (
          <ErrorText>{part.errorText}</ErrorText>
        ) : (
          output && (
            <div className="max-h-64 overflow-auto rounded-md bg-muted/50 p-3 font-mono text-xs">
              {output.entries.map((entry) => (
                <div
                  key={entry.name}
                  className="flex items-baseline justify-between gap-4"
                >
                  <span className={entry.isDir ? "font-medium" : undefined}>
                    {entry.name}
                    {entry.isDir ? "/" : ""}
                  </span>
                  <span className="text-muted-foreground">
                    {entry.isDir ? "" : formatBytes(entry.size)}
                  </span>
                </div>
              ))}
              {output.truncated && (
                <div className="text-muted-foreground">… (list truncated)</div>
              )}
            </div>
          )
        )}
      </ToolContent>
    </Tool>
  )
}

function MouseClickCall({ part }: { part: TypedToolPart<"tool-mouseClick"> }) {
  const input = part.state === "input-streaming" ? undefined : part.input
  const verb = input?.double
    ? "Double-click"
    : input?.button === "right"
      ? "Right-click"
      : input?.button === "middle"
        ? "Middle-click"
        : "Click"
  const at =
    input && input.x !== undefined && input.y !== undefined
      ? ` at (${input.x}, ${input.y})`
      : ""

  return (
    <ActionRow
      icon={MousePointerClickIcon}
      label={`${verb}${at}`}
      part={part}
    />
  )
}

function MouseMoveCall({ part }: { part: TypedToolPart<"tool-mouseMove"> }) {
  const input = part.state === "input-streaming" ? undefined : part.input
  const at =
    input && input.x !== undefined && input.y !== undefined
      ? ` to (${input.x}, ${input.y})`
      : ""

  return (
    <ActionRow icon={MousePointer2Icon} label={`Move mouse${at}`} part={part} />
  )
}

function MouseScrollCall({
  part,
}: {
  part: TypedToolPart<"tool-mouseScroll">
}) {
  const input = part.state === "input-streaming" ? undefined : part.input
  const label = input
    ? `Scroll ${input.direction}${input.amount && input.amount > 1 ? ` ×${input.amount}` : ""} at (${input.x}, ${input.y})`
    : "Scroll"

  return <ActionRow icon={MouseIcon} label={label} part={part} />
}

function KeyboardTypeCall({
  part,
}: {
  part: TypedToolPart<"tool-keyboardType">
}) {
  const input = part.state === "input-streaming" ? undefined : part.input
  const text = input?.text ?? ""
  const preview = text.length > 40 ? `${text.slice(0, 40)}…` : text

  return (
    <ActionRow
      icon={KeyboardIcon}
      label={`Type “${preview.replace(/\n/g, " ⏎ ")}”`}
      part={part}
    />
  )
}

function KeyboardPressCall({
  part,
}: {
  part: TypedToolPart<"tool-keyboardPress">
}) {
  const input = part.state === "input-streaming" ? undefined : part.input
  const keys = input ? [...(input.modifiers ?? []), input.key].join("+") : ""

  return <ActionRow icon={KeyboardIcon} label={`Press ${keys}`} part={part} />
}

/**
 * The agent looking at its own screen. The screenshot itself is never
 * rendered in the chat — only this quiet row says it happened.
 */
function ViewScreenCall({ part }: { part: TypedToolPart<"tool-viewScreen"> }) {
  return <ActionRow icon={EyeIcon} label="Viewed the screen" part={part} />
}

/**
 * The agent sharing its screen with the user — the one screenshot that is
 * rendered in the chat.
 */
function ShowScreenCall({ part }: { part: TypedToolPart<"tool-showScreen"> }) {
  const output = part.state === "output-available" ? part.output : undefined

  return (
    <div className="flex flex-col gap-1.5">
      <ActionRow icon={MonitorIcon} label="Screen" part={part} />
      {part.state !== "output-error" && output?.screenshot && (
        <div className="w-fit max-w-full overflow-hidden rounded-md border">
          {/* The screenshot is a base64 JPEG from the sandbox, not a Next asset. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="The teammate's screen"
            className="h-auto w-full"
            src={`data:${output.mediaType};base64,${output.screenshot}`}
          />
        </div>
      )}
    </div>
  )
}

function firstLine(text: string): string {
  return text.split("\n")[0] ?? ""
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
