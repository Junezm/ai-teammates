import { Daytona, DaytonaNotFoundError } from "@daytona/sdk"
import type { Sandbox } from "@daytona/sdk"

/**
 * Server-only helpers for a bot's sandbox.
 *
 * The client reads DAYTONA_API_KEY, DAYTONA_API_URL and DAYTONA_TARGET from the
 * environment and throws when the key is missing. Build it lazily: this module
 * is imported while the app is being compiled, where the key need not exist.
 */
let client: Daytona | undefined

function daytona(): Daytona {
  if (!process.env.DAYTONA_API_KEY) {
    throw new Error("DAYTONA_API_KEY is not set")
  }
  // The endpoint is passed explicitly: the SDK never reads it from a dotenv
  // file, and refuses to guess when both .env.local and the process env name
  // one — which is exactly what Next.js produces.
  client ??= new Daytona({ apiUrl: process.env.DAYTONA_API_URL })
  return client
}

/**
 * Provisions a sandbox for a bot and returns its id. Nothing is run inside it;
 * this only creates the environment and records the relationship.
 */
export async function createBotSandbox(): Promise<string> {
  const sandbox = await daytona().create()
  return sandbox.id
}

/**
 * Resolves a bot's sandbox for the chat agent's tools. A sandbox that
 * auto-stopped since the last conversation is started again before anything
 * runs inside it, so tool calls survive idle gaps.
 */
export async function getBotSandbox(sandboxId: string): Promise<Sandbox> {
  const sandbox = await daytona().get(sandboxId)
  if (sandbox.state === "stopped" || sandbox.state === "paused") {
    await sandbox.start()
  }
  return sandbox
}

/**
 * Destroys a bot's sandbox. A sandbox that is already gone counts as deleted,
 * so retrying a bot deletion after a partial failure still succeeds.
 */
export async function deleteBotSandbox(sandboxId: string): Promise<void> {
  try {
    const sandbox = await daytona().get(sandboxId)
    // Without `wait` the call returns while the sandbox is still tearing down,
    // and a get immediately after still finds it. Waiting makes the delete
    // final, so a retry sees a clean 404 rather than a half-deleted sandbox.
    await daytona().delete(sandbox, 60, true)
  } catch (error) {
    if (error instanceof DaytonaNotFoundError) {
      return
    }
    throw error
  }
}
