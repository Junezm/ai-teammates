import { createAlibaba } from "@ai-sdk/alibaba"
import { chat, type InferChatUIMessageFromTools } from "@trigger.dev/sdk/ai"
import { stepCountIs } from "ai"

import {
  createComputerUseTools,
  type ComputerUseTools,
} from "@/lib/computer-use"
import { getChatAgentContext } from "@/queries/chat-agent"

// Mainland China endpoint; override with ALIBABA_BASE_URL for the
// international (dashscope-intl) one. The provider has no env fallback for
// baseURL, so it must be passed explicitly.
const alibaba = createAlibaba({
  apiKey: process.env.ALIBABA_API_KEY,
  baseURL: process.env.ALIBABA_BASE_URL,
})

/** The chat's UIMessage, with typed `tool-*` parts for every tool below. */
export type ChatUIMessage = InferChatUIMessageFromTools<ComputerUseTools>

/**
 * The agent's base instructions: who the bot is, what it is for, the
 * environment it lives in, and what it can do there.
 */
function baseInstructions(bot: {
  name: string
  job: string
  instructions: string | null
  sandboxId: string | null
}): string {
  const lines = [
    `Your name is ${bot.name}. You are an AI teammate.`,
    "",
    `Your job: ${bot.job}`,
  ]

  if (bot.instructions) {
    lines.push(
      "",
      "Your purpose, and how you should go about your job:",
      bot.instructions
    )
  }

  lines.push(
    "",
    "Your environment:",
    "You live in a Daytona sandbox — an isolated Linux computer dedicated to you, with its own filesystem, network, compute and a desktop you can see and control. It belongs to you alone and persists between conversations, so whatever is already there is yours."
  )

  if (bot.sandboxId) {
    lines.push(`Your sandbox is identified as ${bot.sandboxId}.`)
  }

  lines.push(
    "",
    "Your tools — you operate your computer directly:",
    "- bash runs a shell command. Only stdout comes back: add `2>&1` to capture stderr, and background long-running processes with `&`.",
    "- readFile, writeFile and listFiles work with files. writeFile cannot create parent directories — use bash for that.",
    "- mouseClick, mouseMove and mouseScroll, keyboardType and keyboardPress drive the desktop's mouse and keyboard.",
    "- viewScreen takes a screenshot for you to look at. The user does not see it. Use it to find elements and coordinates, and to verify the result of an action.",
    "- showScreen takes a screenshot that is shown to the user in the chat. Use it when they ask what is on your screen, or to share something visual.",
    "",
    "The desktop is 1024x768 pixels and (0, 0) is its top-left corner. When driving the GUI, look before you act: viewScreen, act with specific pixel coordinates, then viewScreen again to check what changed.",
    "",
    "Speak as yourself, in the first person, and stay in character as this teammate."
  )

  return lines.join("\n")
}

export const chatAgent = chat
  // Pin the typed message shape so tool parts (`tool-bash`, `tool-viewScreen`,
  // …) carry their input/output types end to end, into useChat on the client.
  .withUIMessage<ChatUIMessage>()
  .agent({
    id: "chat",
    // The transcript is kept by the default storage, keyed by chatId.
    //
    // Tools are declared on the agent — not just streamText — so each tool's
    // toModelOutput survives the history re-conversion on later turns, and
    // they are resolved per turn, bound to the chat's bot sandbox.
    tools: async ({ chatId }) => {
      const bot = await getChatAgentContext(chatId)
      return createComputerUseTools(bot?.sandboxId ?? null)
    },
    run: async ({ chatId, messages, tools, signal, streamText }) => {
      // Set the prompt here rather than in onChatStart: that hook fires only on
      // a chat's first turn, so a continuation run would otherwise start without
      // it. `chat.prompt.set()` is the one place the system prompt is set — the
      // managed streamText throws if the call site also passes one.
      const bot = await getChatAgentContext(chatId)
      chat.prompt.set(
        bot
          ? baseInstructions(bot)
          : "You are an AI teammate. Reply as yourself, in the first person."
      )

      return streamText({
        model: alibaba("qwen3.7-flash-2026-07-15"),
        messages,
        tools,
        abortSignal: signal,
        // Working a computer takes many small steps — look, act, look again —
        // so a turn is allowed a long chain of tool calls.
        stopWhen: stepCountIs(40),
      })
    },
  })
