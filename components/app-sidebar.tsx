"use client"

import { PlusIcon, UsersIcon } from "lucide-react"
import { UserButton } from "@clerk/nextjs"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { useState } from "react"

import { ChatAvatar } from "@/components/chat-avatar"
import { ChatSearchDialog } from "@/components/chat-search-dialog"
import { BotDialog } from "@/components/bot-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import type { ChatListItem } from "@/queries/bots"

// Mirrors SidebarMenuButton (size="lg") so the trigger matches the spacing and
// design of other sidebar menu items. The `!` modifiers are required because
// Clerk's unlayered .cl-* styles would otherwise beat Tailwind's layered
// utilities on sizing.
const userButtonAppearance = {
  elements: {
    rootBox: "w-full!",
    userButtonTrigger:
      "flex h-12 w-full! items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm transition-[width,height,padding] outline-hidden hover:bg-sidebar-accent! hover:text-sidebar-accent-foreground! active:bg-sidebar-accent! active:text-sidebar-accent-foreground! focus-visible:ring-2 focus-visible:ring-sidebar-ring",
    userButtonBox: "flex w-full! min-w-0 items-center gap-2",
    avatarBox: "size-6! shrink-0 rounded-full",
    userButtonOuterIdentifier:
      "w-full! truncate text-sm font-medium text-sidebar-foreground!",
  },
}

export function AppSidebar({ chats }: { chats: ChatListItem[] }) {
  const [botDialogOpen, setBotDialogOpen] = useState(false)

  return (
    <>
      <Sidebar>
        <SidebarHeader>
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 rounded-lg"
                    aria-label="New chat"
                  />
                }
              >
                <PlusIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onSelect={() => setBotDialogOpen(true)}>
                  <PlusIcon />
                  Create new bot
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <UsersIcon />
                  Create group chat
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <ChatSearchDialog chats={chats} />
        </SidebarHeader>
        <SidebarContent>
          {chats.length > 0 ? (
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {chats.map((chat) => (
                    <SidebarMenuItem key={chat.chatId}>
                      <SidebarMenuButton
                        size="lg"
                        render={<Link href={`/chats/${chat.chatId}`} />}
                      >
                        <ChatAvatar
                          seed={chat.botAvatar}
                          className="shrink-0 rounded-full"
                        />
                        <div className="grid flex-1 text-left leading-tight">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate font-medium">
                              {chat.botName}
                            </span>
                            <span className="shrink-0 text-xs text-sidebar-foreground/70">
                              {formatDistanceToNow(chat.lastMessageAt)}
                            </span>
                          </span>
                          {chat.lastMessagePreview ? (
                            <span className="truncate text-xs text-sidebar-foreground/70">
                              {chat.lastMessagePreview}
                            </span>
                          ) : null}
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : null}
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <UserButton showName appearance={userButtonAppearance} />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <BotDialog open={botDialogOpen} onOpenChange={setBotDialogOpen} />
    </>
  )
}
