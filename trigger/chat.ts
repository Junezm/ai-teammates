import { createAlibaba } from "@ai-sdk/alibaba"
import { chat } from "@trigger.dev/sdk/ai"

// Mainland China endpoint; override with ALIBABA_BASE_URL for the
// international (dashscope-intl) one. The provider has no env fallback for
// baseURL, so it must be passed explicitly.
const alibaba = createAlibaba({
  apiKey: process.env.ALIBABA_API_KEY,
  baseURL: process.env.ALIBABA_BASE_URL,
})

export const chatAgent = chat.agent({
  id: "chat",
  // The transcript is kept by the default storage, keyed by chatId.
  run: async ({ messages, signal, streamText }) =>
    streamText({
      model: alibaba("qwen3.7-flash-2026-07-15"),
      instructions: "You are a helpful assistant.",
      messages,
      abortSignal: signal,
    }),
})
