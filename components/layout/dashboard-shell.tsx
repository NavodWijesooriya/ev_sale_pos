"use client"

import * as React from "react"
import { Sidebar, SidebarContent } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

interface DashboardShellProps {
  children: React.ReactNode
  user: {
    id?: string
    name?: string | null
    email?: string | null
    role?: string
    organizationId?: string
    organizationName?: string
  }
}

export function DashboardShell({ children, user }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const [isCollapsed, setIsCollapsed] = React.useState(false)

  const orgName = user.organizationName || "Dealership ERP"
  const orgRole = user.role || "OrgAdmin"

  return (
    <div className="min-h-screen bg-background text-foreground print:bg-white print:block">
      {/* Desktop Fixed Collapsible Sidebar */}
      <Sidebar
        organizationName={orgName}
        userRole={orgRole}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
      />

      {/* Mobile Sidebar Drawer (Sheet) */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-[17rem] border-r border-sidebar-border bg-sidebar p-0 text-sidebar-foreground" showCloseButton={true}>
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
            <SheetDescription>Access dealership modules and settings</SheetDescription>
          </SheetHeader>
          <SidebarContent
            organizationName={orgName}
            userRole={orgRole}
            isCollapsed={false}
            onNavigate={() => setSidebarOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main Content Area offset dynamically for desktop sidebar */}
      <div
        className={cn(
          "flex flex-col min-h-screen transition-all duration-300 ease-in-out print:pl-0 print:block",
          isCollapsed ? "lg:pl-20" : "lg:pl-[17rem]"
        )}
      >
        {/* Header - Hidden completely during print */}
        <div className="print:hidden">
          <Header
            userName={user.name || "Dealership Admin"}
            userEmail={user.email || ""}
            userRole={orgRole}
            organizationName={orgName}
            organizationId={user.organizationId}
            onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          />
        </div>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-9 lg:py-8 print:p-0 print:m-0 print:w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
