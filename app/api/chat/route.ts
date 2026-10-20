import { createAlibaba } from "@ai-sdk/alibaba"
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai"

// Mainland China endpoint; override with ALIBABA_BASE_URL for the
// international (dashscope-intl) one. The provider has no env fallback for
// baseURL, so it must be passed explicitly.
const alibaba = createAlibaba({
  apiKey: process.env.ALIBABA_API_KEY,
  baseURL: process.env.ALIBABA_BASE_URL,
})

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  const result = streamText({
    model: alibaba("qwen3.7-flash-2026-07-15"),
    instructions: "You are a helpful assistant.",
    messages: await convertToModelMessages(messages),
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  })
}
