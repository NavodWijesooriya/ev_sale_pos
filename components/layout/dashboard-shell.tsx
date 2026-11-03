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

  const orgName = user.organizationName || "Dealership ERP"
  const orgRole = user.role || "OrgAdmin"

  return (
    <div className="min-h-screen bg-background print:bg-white print:block">
      {/* Desktop Fixed Sidebar */}
      <Sidebar
        organizationName={orgName}
        userRole={orgRole}
      />

      {/* Mobile Sidebar Drawer (Sheet) */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-72 bg-card" showCloseButton={true}>
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
            <SheetDescription>Access dealership modules and settings</SheetDescription>
          </SheetHeader>
          <SidebarContent
            organizationName={orgName}
            userRole={orgRole}
            onNavigate={() => setSidebarOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main Content Area offset for desktop sidebar */}
      <div className="flex flex-col min-h-screen lg:pl-64 print:pl-0 print:block">
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

        <main className="flex-1 p-4 sm:p-6 lg:p-8 print:p-0 print:m-0 print:w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
