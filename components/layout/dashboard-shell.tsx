"use client"

import * as React from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"

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

  return (
    <div className="flex h-screen overflow-hidden bg-background print:h-auto print:overflow-visible print:bg-white print:block">
      {/* Responsive Sidebar - Hidden completely during print */}
      <div className="print:hidden">
        <Sidebar
          organizationName={user.organizationName || "Dealership ERP"}
          userRole={user.role || "OrgAdmin"}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-y-auto print:overflow-visible print:w-full print:block">
        {/* Header - Hidden completely during print */}
        <div className="print:hidden">
          <Header
            userName={user.name || "Dealership Admin"}
            userEmail={user.email || ""}
            userRole={user.role || "Staff"}
            organizationName={user.organizationName || "EV Dealership"}
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
