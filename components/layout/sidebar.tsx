"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Coins,
  BarChart3,
  Bike,
  Boxes,
  Building2,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  LayoutDashboard,
  Palette,
  PanelLeft,
  PanelLeftClose,
  ShieldAlert,
  ShoppingCart,
  Settings,
  Users2,
  Wrench,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"

export interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  badge?: string
  description?: string
  roles?: string[]
  children?: Array<{ title: string; href: string }>
}

export const navigationItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Branches", href: "/dashboard/settings/branches", icon: Building2, roles: ["OrgAdmin", "BranchManager", "SuperAdmin"] },
  { title: "EV Inventory", href: "/dashboard/inventory", icon: Bike, badge: "Stock", roles: ["OrgAdmin", "BranchManager", "SalesRep", "SuperAdmin"] },
  { title: "Sales & POS", href: "/dashboard/sales", icon: Coins, roles: ["OrgAdmin", "BranchManager", "SalesRep", "Cashier", "SuperAdmin"] },
  {
    title: "Customers",
    href: "/dashboard/customers",
    icon: Users2,
    roles: ["OrgAdmin", "BranchManager", "SalesRep", "Cashier", "SuperAdmin"],
    children: [
      { title: "CRM Customers", href: "/dashboard/customers/crm" },
      { title: "Sale Customers", href: "/dashboard/customers/sales" },
    ],
  },
  { title: "Services", href: "/dashboard/services", icon: Wrench, roles: ["OrgAdmin", "Technician"] },
  { title: "Spare Parts Inventory", href: "/dashboard/services/spare-parts", icon: Boxes, roles: ["OrgAdmin"] },
  { title: "Reports", href: "/dashboard/reports", icon: BarChart3, roles: ["OrgAdmin", "BranchManager", "SuperAdmin"] },
  { title: "Team & Access", href: "/dashboard/settings/users", icon: Settings, roles: ["OrgAdmin", "SuperAdmin"] },
  { title: "Storefront Branding", href: "/dashboard/settings/appearance", icon: Palette, roles: ["OrgAdmin", "SuperAdmin"] },
  { title: "Help Center", href: "/dashboard/help", icon: HelpCircle },
  { title: "Platform Admin", href: "/super-admin", icon: ShieldAlert, roles: ["SuperAdmin"] },
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
  const [customersExpanded, setCustomersExpanded] = React.useState(
    Boolean(pathname?.startsWith("/dashboard/customers/")),
  )
  const visibleItems = navigationItems.filter((item) => !item.roles || item.roles.includes(userRole))

  return (
    <div className="flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className={cn(
        "flex h-[4.5rem] shrink-0 items-center border-b border-sidebar-border px-4",
        isCollapsed ? "justify-center px-2" : "justify-between"
      )}>
        <Link href="/dashboard" onClick={onNavigate} className="group flex min-w-0 items-center gap-3" title="EV Sale POS">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground transition-transform group-hover:scale-[1.03]">
            <Zap className="size-5" />
          </span>
          {!isCollapsed && (
            <span className="flex min-w-0 flex-col">
              <span className="text-sm font-semibold tracking-tight text-foreground">EV Sale POS</span>
              <span className="max-w-[170px] truncate text-xs text-muted-foreground">{organizationName}</span>
            </span>
          )}
        </Link>
        {onToggleCollapse && !isCollapsed && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="size-8 shrink-0 text-muted-foreground"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="size-4" />
          </Button>
        )}
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {!isCollapsed ? (
          <section aria-label="Quick actions">
            <h2 className="mb-2.5 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Quick actions
            </h2>
            <div className="space-y-1.5">
              <Link
                href="/dashboard/sales"
                onClick={onNavigate}
                className="group flex min-h-11 items-center gap-3 rounded-xl border border-border/70 bg-card px-3 text-sm font-medium transition-colors hover:border-primary/25 hover:bg-primary/5"
              >
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ShoppingCart className="size-3.5" />
                </span>
                <span className="flex-1">New sale</span>
                <ChevronRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/dashboard/inventory"
                onClick={onNavigate}
                className="group flex min-h-11 items-center gap-3 rounded-xl border border-border/70 bg-card px-3 text-sm font-medium transition-colors hover:border-primary/25 hover:bg-primary/5"
              >
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Boxes className="size-3.5" />
                </span>
                <span className="flex-1">Manage inventory</span>
                <ChevronRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </section>
        ) : (
          <div className="flex flex-col items-center gap-2 border-b border-sidebar-border pb-3">
            <Link href="/dashboard/sales" onClick={onNavigate} title="New sale" className="flex size-10 items-center justify-center rounded-xl text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              <ShoppingCart className="size-4" />
            </Link>
            <Link href="/dashboard/inventory" onClick={onNavigate} title="Manage inventory" className="flex size-10 items-center justify-center rounded-xl text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              <Boxes className="size-4" />
            </Link>
          </div>
        )}

        <section aria-label="Workspace navigation">
          {!isCollapsed && (
            <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Workspace
            </h2>
          )}
          <nav className="space-y-1">
            {visibleItems.map((item) => {
              const Icon = item.icon
              const isActive = item.children
                ? Boolean(pathname?.startsWith("/dashboard/customers"))
                : item.href === "/dashboard"
                ? pathname === "/dashboard"
                : item.href === "/dashboard/services"
                  ? Boolean(pathname?.startsWith(item.href) && !pathname.startsWith("/dashboard/services/spare-parts"))
                  : Boolean(pathname?.startsWith(item.href))

              return (
                <div key={item.href}>
                  {item.children ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (isCollapsed) {
                          setCustomersExpanded(true)
                          onToggleCollapse?.()
                        } else {
                          setCustomersExpanded((expanded) => !expanded)
                        }
                      }}
                      title={isCollapsed ? item.title : undefined}
                      aria-expanded={customersExpanded}
                      className={cn(
                        "group relative flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition-colors duration-200",
                        isCollapsed && "mx-auto size-10 justify-center px-0",
                        isActive
                          ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-sidebar-primary"
                          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"
                      )}
                    >
                      <Icon className={cn(
                        "size-[18px] shrink-0 transition-colors",
                        isActive ? "text-sidebar-accent-foreground" : "text-muted-foreground group-hover:text-sidebar-foreground"
                      )} />
                      {!isCollapsed && (
                        <>
                          <span className="flex-1 truncate">{item.title}</span>
                          {customersExpanded
                            ? <ChevronDown className="size-4 text-muted-foreground" />
                            : <ChevronRight className="size-4 text-muted-foreground" />}
                        </>
                      )}
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      title={isCollapsed ? item.title : undefined}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "group relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors duration-200",
                        isCollapsed && "mx-auto size-10 justify-center px-0",
                        isActive
                          ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-sidebar-primary"
                          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"
                      )}
                    >
                      <Icon className={cn(
                        "size-[18px] shrink-0 transition-colors",
                        isActive ? "text-sidebar-accent-foreground" : "text-muted-foreground group-hover:text-sidebar-foreground"
                      )} />
                      {!isCollapsed && (
                        <>
                          <span className="flex-1 truncate">{item.title}</span>
                          {item.badge && (
                            <span className={cn(
                              "rounded-md px-1.5 py-0.5 text-[10px] font-medium tracking-tight",
                              isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground group-hover:bg-background"
                            )}>
                              {item.badge}
                            </span>
                          )}
                          {isActive && <ChevronRight className="size-4 text-sidebar-accent-foreground/70" />}
                        </>
                      )}
                    </Link>
                  )}
                  {!isCollapsed && item.children && customersExpanded && (
                    <div className="ml-5 mt-1 space-y-1 border-l border-sidebar-border pl-3">
                      {item.children.map((child) => {
                        const isChildActive = pathname === child.href

                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={onNavigate}
                            aria-current={isChildActive ? "page" : undefined}
                            className={cn(
                              "block rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                              isChildActive
                                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                : "text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"
                            )}
                          >
                            {child.title}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        </section>

        {!isCollapsed && (
          <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/35 p-3.5 text-xs">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <Building2 className="size-3.5 text-primary" />
              <span>Workspace status</span>
            </div>
            <p className="mt-1 truncate text-[11px] leading-normal text-muted-foreground">{organizationName}</p>
            <div className="mt-2.5 flex items-center justify-between border-t border-sidebar-border pt-2 text-[10px] text-muted-foreground">
              <span>Role: <strong className="text-foreground">{userRole}</strong></span>
              <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Connected
              </span>
            </div>
          </div>
        )}
      </div>

      <div className={cn(
        "flex h-14 shrink-0 items-center border-t border-sidebar-border px-3",
        isCollapsed ? "justify-center" : "justify-between"
      )}>
        {!isCollapsed && <span className="text-[11px] text-muted-foreground">EV Sale POS · v1.0</span>}
        {onToggleCollapse && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="size-8 text-muted-foreground"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
          </Button>
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
        "fixed inset-y-0 left-0 z-30 hidden flex-col transition-[width] duration-300 ease-in-out print:hidden lg:flex",
        isCollapsed ? "w-20" : "w-[17rem]"
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
