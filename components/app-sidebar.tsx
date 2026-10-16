import { UserButton } from "@clerk/nextjs"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

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

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarContent />
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <UserButton showName appearance={userButtonAppearance} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
