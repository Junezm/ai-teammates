"use client"

import { SearchIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"

import { ChatAvatar } from "@/components/chat-avatar"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Kbd } from "@/components/ui/kbd"
import type { ChatListItem } from "@/queries/bots"

function subscribe() {
  return () => {}
}

// Server and first client render show the mac glyph; the store swap keeps
// hydration consistent on other platforms.
function getModifier() {
  return /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl"
}

function getServerModifier() {
  return "⌘"
}

export function ChatSearchDialog({ chats }: { chats: ChatListItem[] }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const modifier = React.useSyncExternalStore(
    subscribe,
    getModifier,
    getServerModifier
  )

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key?.toLowerCase() !== "k" || event.repeat) {
        return
      }
      if (!(event.metaKey || event.ctrlKey)) {
        return
      }
      event.preventDefault()
      setOpen(true)
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [])

  return (
    <>
      {/* Mirrors Input's default classes so it reads as a search field, while
          keeping Button's ghost hover. Collapsed, it becomes a plain icon
          button like the others — no field border or fill. */}
      <Button
        variant="ghost"
        className="h-8 w-full min-w-0 justify-start gap-2 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base font-normal text-muted-foreground group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:px-0 md:text-sm dark:bg-input/30 dark:group-data-[collapsible=icon]:bg-transparent"
        onClick={() => setOpen(true)}
      >
        <SearchIcon />
        <span className="flex-1 text-left group-data-[collapsible=icon]:hidden">
          Search
        </span>
        <Kbd className="group-data-[collapsible=icon]:hidden">{modifier}K</Kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search chats"
        description="Search your chats."
      >
        <Command>
          <CommandInput placeholder="Search chats..." />
          <CommandList>
            <CommandEmpty>No chats found.</CommandEmpty>
            <CommandGroup>
              {chats.map((chat) => (
                <CommandItem
                  key={chat.chatId}
                  value={`${chat.botName} ${chat.chatId}`}
                  onSelect={() => {
                    setOpen(false)
                    router.push(`/chats/${chat.chatId}`)
                  }}
                >
                  <ChatAvatar
                    seed={chat.botAvatar}
                    className="shrink-0 rounded-full"
                  />
                  <span className="truncate">{chat.botName}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
