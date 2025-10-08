import { User } from "lucide-react"
import { SidebarMenu, SidebarMenuItem } from "~/components/ui/sidebar"

export function NavHeader() {
  return (
    <SidebarMenu>
      <SidebarMenuItem className="flex justify-start items-center gap-4 p-2 bg-muted rounded-lg">
        <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
          <User className="size-4" />
        </div>
        <div className="grid flex-1 text-left text-sm leading-tight">
          <span className="truncate font-medium">Root User</span>
          <span className="truncate text-xs">Free Plan</span>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
