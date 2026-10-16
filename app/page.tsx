import { PlusIcon } from "lucide-react"
import { UserButton } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"
import { nanoid } from "nanoid"

import { ChatAvatar } from "@/components/chat-avatar"
import { BotDialog } from "@/components/bot-dialog"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export default async function Page() {
  await auth.protect()
  const seed = nanoid()

  return (
    <div className="relative flex min-h-svh flex-col">
      <div className="absolute top-4 right-4">
        <UserButton />
      </div>
      <Empty className="flex-1">
        <EmptyHeader>
          <EmptyMedia>
            <ChatAvatar seed={seed} className="rounded-full" />
          </EmptyMedia>
          <EmptyTitle>Meet your first bot</EmptyTitle>
          <EmptyDescription>
            Every bot gets its own personality, memory, and face. Spin one up
            and start the conversation.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <BotDialog>
            <Button size="sm">
              <PlusIcon data-icon="inline-start" />
              Create a new bot
            </Button>
          </BotDialog>
        </EmptyContent>
      </Empty>
    </div>
  )
}
