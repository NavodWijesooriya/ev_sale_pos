"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Building2,
  Bike,
  BadgeDollarSign,
  Users2,
  Wrench,
  BarChart3,
  Zap,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Settings,
  ShoppingCart,
  Boxes,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"

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
    href: "/dashboard/settings/branches",
    icon: Building2,
    roles: ["OrgAdmin", "BranchManager", "SuperAdmin"],
  },
  {
    title: "EV Bikes (GRN & Stock)",
    href: "/dashboard/inventory",
    icon: Bike,
    badge: "Chassis/Bike",
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
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  onNavigate?: () => void
}

export function SidebarContent({
  organizationName = "EV Dealership",
  userRole = "OrgAdmin",
  isCollapsed = false,
  onToggleCollapse,
  onNavigate,
}: SidebarContentProps) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800 select-none">
      {/* Dealership / Brand Header */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-slate-200/80 dark:border-slate-800 px-4 transition-all duration-300",
          isCollapsed ? "justify-center px-2" : "justify-between"
        )}
      >
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-3 group overflow-hidden"
          title="Ev Sale Pos"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Zap className="size-5" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col truncate">
              <span className="text-sm font-extrabold tracking-tight text-foreground">
                Ev Sale Pos
              </span>
              <span className="text-[11px] text-muted-foreground font-medium truncate max-w-[130px]">
                {organizationName}
              </span>
            </div>
          )}
        </Link>

        {onToggleCollapse && !isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="size-8 text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            title="Collapse Sidebar"
          >
            <PanelLeftClose className="size-4" />
          </Button>
        )}
      </div>

      {/* Main Sidebar Scroll Area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {/* 1. Quick Access Section (2x2 Grid of Small Cards) */}
        {!isCollapsed ? (
          <div>
            <div className="px-1 mb-2.5 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Quick Access
              </span>
              <span className="text-[10px] text-muted-foreground/70 font-semibold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                Live
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Card 1: Orders / POS */}
              <Link
                href="/dashboard/sales"
                onClick={onNavigate}
                className="group flex flex-col p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 hover:bg-blue-50/80 dark:bg-slate-800/40 dark:hover:bg-slate-800 transition-all hover:border-blue-400/50 hover:shadow-xs"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="size-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <ShoppingCart className="size-3.5" />
                  </div>
                  <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1 rounded">
                    POS
                  </span>
                </div>
                <span className="text-xs font-bold text-foreground mt-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  Orders
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  POS Checkout
                </span>
              </Link>

              {/* Card 2: EV Bikes / Catalog */}
              <Link
                href="/dashboard/inventory"
                onClick={onNavigate}
                className="group flex flex-col p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 hover:bg-emerald-50/80 dark:bg-slate-800/40 dark:hover:bg-slate-800 transition-all hover:border-emerald-400/50 hover:shadow-xs"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Bike className="size-3.5" />
                  </div>
                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 rounded">
                    Bikes
                  </span>
                </div>
                <span className="text-xs font-bold text-foreground mt-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                  EV Bikes
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  Bike Catalog
                </span>
              </Link>

              {/* Card 3: Inventory / Stock */}
              <Link
                href="/dashboard/inventory"
                onClick={onNavigate}
                className="group flex flex-col p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 hover:bg-purple-50/80 dark:bg-slate-800/40 dark:hover:bg-slate-800 transition-all hover:border-purple-400/50 hover:shadow-xs"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="size-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Boxes className="size-3.5" />
                  </div>
                  <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1 rounded">
                    GRN
                  </span>
                </div>
                <span className="text-xs font-bold text-foreground mt-2 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                  Inventory
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  Live Stock
                </span>
              </Link>

              {/* Card 4: Dashboard / KPIs */}
              <Link
                href="/dashboard"
                onClick={onNavigate}
                className="group flex flex-col p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 hover:bg-amber-50/80 dark:bg-slate-800/40 dark:hover:bg-slate-800 transition-all hover:border-amber-400/50 hover:shadow-xs"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="size-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <LayoutDashboard className="size-3.5" />
                  </div>
                  <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 rounded">
                    KPI
                  </span>
                </div>
                <span className="text-xs font-bold text-foreground mt-2 group-hover:text-amber-600 dark:group-hover:text-amber-400">
                  Dashboard
                </span>
                <span className="text-[10px] text-muted-foreground truncate">
                  Performance
                </span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
            <Link
              href="/dashboard/sales"
              onClick={onNavigate}
              className="size-9 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors"
              title="Orders & POS"
            >
              <ShoppingCart className="size-4" />
            </Link>
            <Link
              href="/dashboard/inventory"
              onClick={onNavigate}
              className="size-9 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              title="Products & Inventory"
            >
              <Boxes className="size-4" />
            </Link>
          </div>
        )}

        {/* 2. Standard Vertical Menu with Icons */}
        <div>
          {!isCollapsed && (
            <div className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Main Menu
            </div>
          )}

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
                    title={isCollapsed ? item.title : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-150",
                      isCollapsed && "justify-center px-0 size-10 mx-auto",
                      isActive
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800/60"
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

                    {!isCollapsed && (
                      <>
                        <span className="flex-1 truncate">{item.title}</span>

                        {item.badge && (
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[10px] font-medium tracking-tight",
                              isActive
                                ? "bg-white/20 text-white"
                                : "bg-slate-100 text-muted-foreground group-hover:bg-slate-200 dark:bg-slate-800 dark:group-hover:bg-slate-700"
                            )}
                          >
                            {item.badge}
                          </span>
                        )}

                        {isActive && (
                          <ChevronRight className="size-3.5 text-primary-foreground/70" />
                        )}
                      </>
                    )}
                  </Link>
                )
              })}
          </nav>
        </div>

        {/* Multi-Tenant System Badge */}
        {!isCollapsed && (
          <div className="mt-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 p-3.5 text-xs">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <Sparkles className="size-3.5 text-blue-500" />
              <span>Multi-Tenant ERP</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground leading-normal">
              Isolated cloud schema active for {organizationName}.
            </p>
            <div className="mt-2.5 flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-slate-200/80 dark:border-slate-700">
              <span>
                Role: <strong className="text-foreground">{userRole}</strong>
              </span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Live Cloud
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer / Expand-Collapse Toggle */}
      <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 p-3 flex items-center justify-between">
        {!isCollapsed ? (
          <>
            <span className="text-[11px] text-muted-foreground">
              Ev Sale Pos • v1.0
            </span>
            {onToggleCollapse && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleCollapse}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                title="Collapse Sidebar"
              >
                <PanelLeftClose className="size-3.5" />
                <span className="text-[10px]">Collapse</span>
              </Button>
            )}
          </>
        ) : (
          onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="size-8 mx-auto text-muted-foreground hover:text-foreground"
              title="Expand Sidebar"
            >
              <PanelLeft className="size-4" />
            </Button>
          )
        )}
      </div>
    </div>
  )
}

interface SidebarProps {
  organizationName?: string
  userRole?: string
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export function Sidebar({
  organizationName = "EV Dealership",
  userRole = "OrgAdmin",
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden flex-col transition-all duration-300 ease-in-out lg:flex print:hidden",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      <SidebarContent
        organizationName={organizationName}
        userRole={userRole}
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
      />
    </aside>
  )
}
