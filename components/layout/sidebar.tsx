"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Building2,
  CarFront,
  BadgeDollarSign,
  Users2,
  Wrench,
  BarChart3,
  Zap,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Settings,
} from "lucide-react"

export interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  badge?: string
  description?: string
  roles?: string[]
}

export const navigationItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Branches",
    href: "/dashboard/branches",
    icon: Building2,
    roles: ["OrgAdmin", "BranchManager", "SuperAdmin"],
  },
  {
    title: "Inventory (GRN & Stock)",
    href: "/dashboard/inventory",
    icon: CarFront,
    badge: "Chassis/VIN",
    roles: ["OrgAdmin", "BranchManager", "SalesRep", "SuperAdmin"],
  },
  {
    title: "Sales (Cash & Lease)",
    href: "/dashboard/sales",
    icon: BadgeDollarSign,
    badge: "POS",
    roles: ["OrgAdmin", "BranchManager", "SalesRep", "Cashier", "SuperAdmin"],
  },
  {
    title: "Customers",
    href: "/dashboard/customers",
    icon: Users2,
    roles: ["OrgAdmin", "BranchManager", "SalesRep", "Cashier", "SuperAdmin"],
  },
  {
    title: "Services",
    href: "/dashboard/services",
    icon: Wrench,
    roles: ["OrgAdmin", "BranchManager", "Technician", "SalesRep", "SuperAdmin"],
  },
  {
    title: "Reports",
    href: "/dashboard/reports",
    icon: BarChart3,
    roles: ["OrgAdmin", "BranchManager", "SuperAdmin"],
  },
  {
    title: "Settings (Staff)",
    href: "/dashboard/settings/users",
    icon: Settings,
    badge: "Admin",
    roles: ["OrgAdmin", "SuperAdmin"],
  },
  {
    title: "Super Admin",
    href: "/super-admin",
    icon: ShieldAlert,
    badge: "Platform",
    roles: ["SuperAdmin"],
  },
]

interface SidebarContentProps {
  organizationName?: string
  userRole?: string
  onNavigate?: () => void
}

export function SidebarContent({
  organizationName = "EV Dealership",
  userRole = "OrgAdmin",
  onNavigate,
}: SidebarContentProps) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col bg-card text-card-foreground">
      {/* Dealership / Brand Header */}
      <div className="flex h-16 shrink-0 items-center border-b px-5">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-3 group"
        >
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Zap className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-foreground">
              VoltPOS ERP
            </span>
            <span className="text-[11px] text-muted-foreground font-medium truncate max-w-[130px]">
              {organizationName}
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Core Modules
        </div>

        <nav className="space-y-1">
          {navigationItems
            .filter((item) => !item.roles || item.roles.includes(userRole))
            .map((item) => {
              const Icon = item.icon
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname?.startsWith(item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150",
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0 transition-colors",
                      isActive
                        ? "text-primary-foreground"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  <span className="flex-1 truncate">{item.title}</span>

                  {item.badge && (
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-medium tracking-tight",
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-muted text-muted-foreground group-hover:bg-muted/80"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}

                  {isActive && (
                    <ChevronRight className="size-3.5 text-primary-foreground/70" />
                  )}
                </Link>
              )
            })}
        </nav>

        {/* Multi-Tenant System Badge */}
        <div className="mt-8 rounded-xl border border-border/80 bg-muted/40 p-3.5 text-xs">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <Sparkles className="size-3.5 text-blue-500" />
            <span>Multi-Tenant EV ERP</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground leading-normal">
            Isolated database schema enabled for {organizationName}.
          </p>
          <div className="mt-2.5 flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border/60">
            <span>
              Role: <strong className="text-foreground">{userRole}</strong>
            </span>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Live Cloud
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t p-3 text-[11px] text-muted-foreground text-center">
        Code GN • EV Dealership POS v1.0
      </div>
    </div>
  )
}

interface SidebarProps {
  organizationName?: string
  userRole?: string
}

export function Sidebar({
  organizationName = "EV Dealership",
  userRole = "OrgAdmin",
}: SidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-card text-card-foreground lg:flex print:hidden">
      <SidebarContent organizationName={organizationName} userRole={userRole} />
    </aside>
  )
}
