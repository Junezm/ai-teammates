import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

import { listUserChats } from "@/queries/bots"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const chats = await listUserChats()

  return (
    <SidebarProvider>
      <AppSidebar chats={chats} />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  )
}
