import type { Sandbox } from "@daytona/sdk"
import { tool } from "ai"
import { z } from "zod"

import { getBotSandbox } from "@/lib/daytona"

/**
 * The chat agent's computer-use tools, bound to one bot's Daytona sandbox.
 *
 * Everything the agent can do on its computer goes through here: shell and
 * file access through the sandbox's process/filesystem APIs, and desktop
 * control (mouse, keyboard, screenshots) through computer use. All outputs
 * are plain JSON so they persist in the chat transcript and stream to the
 * frontend as typed `tool-*` parts.
 */

// The Xvfb display Daytona boots is 1024x768 by default; mouse coordinates
// and screenshots share this pixel space.
const SCREEN_WIDTH = 1024
const SCREEN_HEIGHT = 768

// Keep tool results from flooding the transcript and the model's context.
const MAX_TEXT_CHARS = 50_000
const MAX_LIST_ENTRIES = 500

function clampText(text: string): { text: string; truncated: boolean } {
  if (text.length <= MAX_TEXT_CHARS) {
    return { text, truncated: false }
  }
  return { text: text.slice(0, MAX_TEXT_CHARS), truncated: true }
}

function screenshotModelOutput(screenshot: string, mediaType: string) {
  return {
    type: "content" as const,
    value: [
      {
        type: "file" as const,
        data: { type: "data" as const, data: screenshot },
        mediaType,
      },
    ],
  }
}

export function createComputerUseTools(sandboxId: string | null) {
  async function getSandbox(): Promise<Sandbox> {
    if (!sandboxId) {
      throw new Error("This teammate has no sandbox.")
    }
    return getBotSandbox(sandboxId)
  }

  // computerUse.start() boots Xvfb, xfce4, x11vnc and novnc. It is safe to
  // call on an already-running desktop, but slow, so each worker process only
  // pays for it once per sandbox.
  const desktopReady = new Set<string>()

  async function getDesktop(): Promise<Sandbox> {
    const sandbox = await getSandbox()
    if (!desktopReady.has(sandbox.id)) {
      await sandbox.computerUse.start()
      desktopReady.add(sandbox.id)
    }
    return sandbox
  }

  async function takeScreenshot(sandbox: Sandbox, quality: number) {
    const shot = await sandbox.computerUse.screenshot.takeCompressed({
      format: "jpeg",
      quality,
      showCursor: true,
    })
    if (!shot.screenshot) {
      throw new Error("The screenshot came back empty.")
    }
    return {
      screenshot: shot.screenshot,
      mediaType: "image/jpeg",
      sizeBytes: shot.sizeBytes ?? null,
    }
  }

  return {
    bash: tool({
      description:
        "Run a shell command on your computer and get its output. Only stdout is returned — append `2>&1` when stderr matters, and background long-running processes with `&` after redirecting their output.",
      inputSchema: z.object({
        command: z.string().describe("The shell command to run"),
        cwd: z
          .string()
          .optional()
          .describe(
            "Working directory for the command (defaults to your home directory)"
          ),
        timeout: z
          .number()
          .int()
          .min(1)
          .max(600)
          .optional()
          .describe(
            "Seconds to wait before the command is killed (default 120)"
          ),
      }),
      execute: async ({ command, cwd, timeout }) => {
        const sandbox = await getSandbox()
        const response = await sandbox.process.executeCommand(
          command,
          cwd,
          undefined,
          timeout ?? 120
        )
        const { text, truncated } = clampText(response.result)
        return { exitCode: response.exitCode, output: text, truncated }
      },
    }),

    readFile: tool({
      description: "Read a text file from your computer.",
      inputSchema: z.object({
        path: z.string().describe("Absolute or home-relative path of the file"),
      }),
      execute: async ({ path }) => {
        const sandbox = await getSandbox()
        const buffer = await sandbox.fs.downloadFile(path)
        const content = buffer.toString("utf8")
        if (content.includes("\0")) {
          return {
            path,
            error: "This file is binary, so it cannot be read as text.",
          }
        }
        const { text, truncated } = clampText(content)
        return { path, content: text, truncated }
      },
    }),

    writeFile: tool({
      description:
        "Create or overwrite a text file on your computer. The parent directory must already exist — create it with bash first.",
      inputSchema: z.object({
        path: z.string().describe("Absolute or home-relative path of the file"),
        content: z.string().describe("The full file content to write"),
      }),
      execute: async ({ path, content }) => {
        const sandbox = await getSandbox()
        await sandbox.fs.uploadFile(Buffer.from(content, "utf8"), path)
        return { path, bytes: Buffer.byteLength(content, "utf8") }
      },
    }),

    listFiles: tool({
      description: "List the entries of a directory on your computer.",
      inputSchema: z.object({
        path: z
          .string()
          .optional()
          .describe("Directory to list (defaults to your home directory)"),
      }),
      execute: async ({ path }) => {
        const dir = path ?? "."
        const sandbox = await getSandbox()
        const files = await sandbox.fs.listFiles(dir)
        const entries = files.slice(0, MAX_LIST_ENTRIES).map((file) => ({
          name: file.name,
          isDir: file.isDir,
          size: file.size,
        }))
        return {
          path: dir,
          entries,
          truncated: files.length > MAX_LIST_ENTRIES,
        }
      },
    }),

    mouseClick: tool({
      description: `Click the mouse on the desktop at pixel coordinates (x, y). The screen is ${SCREEN_WIDTH}x${SCREEN_HEIGHT} and (0, 0) is its top-left corner.`,
      inputSchema: z.object({
        x: z
          .number()
          .int()
          .min(0)
          .max(SCREEN_WIDTH - 1)
          .describe("X coordinate in pixels"),
        y: z
          .number()
          .int()
          .min(0)
          .max(SCREEN_HEIGHT - 1)
          .describe("Y coordinate in pixels"),
        button: z
          .enum(["left", "right", "middle"])
          .optional()
          .describe("Mouse button (default left)"),
        double: z
          .boolean()
          .optional()
          .describe("Double-click instead of a single click"),
      }),
      execute: async ({ x, y, button, double }) => {
        const sandbox = await getDesktop()
        const result = await sandbox.computerUse.mouse.click(
          x,
          y,
          button ?? "left",
          double ?? false
        )
        return { x: result.x ?? x, y: result.y ?? y }
      },
    }),

    mouseMove: tool({
      description: `Move the mouse cursor to pixel coordinates (x, y) without clicking. The screen is ${SCREEN_WIDTH}x${SCREEN_HEIGHT} and (0, 0) is its top-left corner.`,
      inputSchema: z.object({
        x: z
          .number()
          .int()
          .min(0)
          .max(SCREEN_WIDTH - 1)
          .describe("X coordinate in pixels"),
        y: z
          .number()
          .int()
          .min(0)
          .max(SCREEN_HEIGHT - 1)
          .describe("Y coordinate in pixels"),
      }),
      execute: async ({ x, y }) => {
        const sandbox = await getDesktop()
        const result = await sandbox.computerUse.mouse.move(x, y)
        return { x: result.x ?? x, y: result.y ?? y }
      },
    }),

    mouseScroll: tool({
      description:
        "Scroll the mouse wheel at pixel coordinates (x, y). One amount unit is roughly one notch of a physical mouse wheel.",
      inputSchema: z.object({
        x: z
          .number()
          .int()
          .min(0)
          .max(SCREEN_WIDTH - 1)
          .describe("X coordinate in pixels"),
        y: z
          .number()
          .int()
          .min(0)
          .max(SCREEN_HEIGHT - 1)
          .describe("Y coordinate in pixels"),
        direction: z.enum(["up", "down"]).describe("Direction to scroll"),
        amount: z
          .number()
          .int()
          .min(1)
          .max(20)
          .optional()
          .describe("Notches to scroll (default 1)"),
      }),
      execute: async ({ x, y, direction, amount }) => {
        const sandbox = await getDesktop()
        const success = await sandbox.computerUse.mouse.scroll(
          x,
          y,
          direction,
          amount ?? 1
        )
        return { success }
      },
    }),

    keyboardType: tool({
      description:
        "Type a string of text on the keyboard, as if typed key by key. Newlines press Enter.",
      inputSchema: z.object({
        text: z.string().describe("The text to type"),
      }),
      execute: async ({ text }) => {
        const sandbox = await getDesktop()
        await sandbox.computerUse.keyboard.type(text)
        return { success: true }
      },
    }),

    keyboardPress: tool({
      description:
        "Press a single key, optionally with modifiers held (e.g. press 'c' with ['ctrl'] to copy). Named keys include enter, escape, tab, backspace, delete, space, arrow keys (up/down/left/right) and f1-f24.",
      inputSchema: z.object({
        key: z.string().describe("The key to press, e.g. 'enter' or 'c'"),
        modifiers: z
          .array(z.enum(["ctrl", "alt", "shift", "cmd"]))
          .optional()
          .describe("Modifier keys held while pressing"),
      }),
      execute: async ({ key, modifiers }) => {
        const sandbox = await getDesktop()
        await sandbox.computerUse.keyboard.press(key, modifiers ?? [])
        return { success: true }
      },
    }),

    viewScreen: tool({
      description:
        "Take a screenshot of the desktop and look at it to decide what to do next. The image is only shown to you, never to the user. Use it to find elements and coordinates before clicking or typing, and again afterwards to check what changed.",
      inputSchema: z.object({}),
      execute: async () => {
        const sandbox = await getDesktop()
        return takeScreenshot(sandbox, 70)
      },
      // The model sees the screenshot as an image part; on later turns the
      // transform is re-applied so it keeps the visual memory of the screen.
      toModelOutput: ({ output }) =>
        screenshotModelOutput(output.screenshot, output.mediaType),
    }),

    showScreen: tool({
      description:
        "Take a screenshot of the desktop and show it to the user in the chat. Use this when the user asks what is on your screen, or to share a result that is visual.",
      inputSchema: z.object({}),
      execute: async () => {
        const sandbox = await getDesktop()
        return takeScreenshot(sandbox, 85)
      },
      toModelOutput: ({ output }) =>
        screenshotModelOutput(output.screenshot, output.mediaType),
    }),
  }
}

export type ComputerUseTools = ReturnType<typeof createComputerUseTools>
