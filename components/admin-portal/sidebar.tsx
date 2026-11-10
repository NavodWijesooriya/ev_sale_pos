"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Home,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { cn } from "cn"

interface AdminPortalUser {
  name?: string | null
  email?: string | null
}

interface AdminPortalSidebarProps {
  user: AdminPortalUser | null
  collapsed: boolean
  mobileOpen: boolean
  onToggleCollapsed: () => void
  onCloseMobile: () => void
}

const navigationItems = [
  { label: "Global Overview", href: "/admin-portal", hash: "", icon: Home },
  { label: "Tenant Dealerships", href: "/admin-portal#organizations", hash: "#organizations", icon: Building2 },
  { label: "Billing & Plans", href: "/admin-portal#plans", hash: "#plans", icon: CreditCard },
  { label: "Platform Settings", href: "/admin-portal#platform-settings", hash: "#platform-settings", icon: Settings },
] as const

export function AdminPortalSidebar({
  user,
  collapsed,
  mobileOpen,
  onToggleCollapsed,
  onCloseMobile,
}: AdminPortalSidebarProps) {
  const pathname = usePathname()
  const [activeHash, setActiveHash] = React.useState("")
  const [isSigningOut, setIsSigningOut] = React.useState(false)

  React.useEffect(() => {
    const updateHash = () => setActiveHash(window.location.hash)
    updateHash()
    window.addEventListener("hashchange", updateHash)
    return () => window.removeEventListener("hashchange", updateHash)
  }, [pathname])

  async function handleSignOut() {
    if (isSigningOut) return
    setIsSigningOut(true)

    try {
      const { error } = await createClient().auth.signOut()
      if (error) {
        console.error("Failed to sign out:", error)
        toast.error("Unable to sign out. Please try again.")
        return
      }

      window.location.replace("/admin-portal/login")
    } catch (error) {
      console.error("Failed to sign out:", error)
      toast.error("Unable to sign out. Please try again.")
    } finally {
      setIsSigningOut(false)
    }
  }

  const isActive = (hash: string) =>
    pathname === "/admin-portal" && activeHash === hash

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl transition-[width,transform] duration-200 lg:translate-x-0 lg:shadow-none",
          collapsed ? "w-[5rem]" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b border-sidebar-border",
            collapsed ? "justify-center px-3" : "justify-between px-4",
          )}
        >
          <Link
            href="/admin-portal"
            className="flex min-w-0 items-center gap-3"
            onClick={onCloseMobile}
            aria-label="Ev Sale Pos platform overview"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <ShieldCheck className="size-5" />
            </span>
            {!collapsed && (
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold tracking-tight">
                  EV Sale POS
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  Platform Admin
                </span>
              </span>
            )}
          </Link>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn("hidden text-muted-foreground lg:inline-flex", collapsed && "absolute -right-3 top-5 z-10 rounded-full border bg-background shadow-sm")}
            onClick={onToggleCollapsed}
          >
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Close navigation menu"
            className="lg:hidden"
            onClick={onCloseMobile}
          >
            <X />
          </Button>
        </div>

        <nav aria-label="Platform navigation" className="flex-1 space-y-1 px-3 py-5">
          {!collapsed && (
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Workspace
            </p>
          )}
          {navigationItems.map(({ label, href, hash, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              aria-current={isActive(hash) ? "page" : undefined}
              title={collapsed ? label : undefined}
              onClick={onCloseMobile}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                collapsed && "justify-center px-0",
                isActive(hash)
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-[18px] shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          ))}

        </nav>

        <div className={cn("border-t border-sidebar-border p-3", collapsed && "px-2")}>
          <div className={cn("mb-3 flex items-center gap-3 px-1", collapsed && "justify-center")}>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {(user?.name || "SA").trim().slice(0, 2).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">{user?.name || "superadmin"}</p>
                <p className="truncate text-[11px] text-muted-foreground">{user?.email}</p>
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={isSigningOut}
            title={collapsed ? "Sign out" : undefined}
            onClick={handleSignOut}
            className={cn(
              "w-full justify-start gap-2.5 border-sidebar-border bg-transparent text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
              collapsed && "justify-center px-0",
            )}
          >
            <LogOut className="size-4 shrink-0" />
            {!collapsed && <span>{isSigningOut ? "Signing out..." : "Sign Out"}</span>}
          </Button>
        </div>
      </aside>
    </>
  )
}

export function AdminPortalShell({
  children,
  user,
}: {
  children: React.ReactNode
  user: AdminPortalUser | null
}) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)

  if (pathname === "/admin-portal/login") {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminPortalSidebar
        user={user}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapsed={() => setCollapsed((value) => !value)}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className={cn("min-h-screen transition-[margin] duration-200", collapsed ? "lg:ml-20" : "lg:ml-64")}>
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur-md sm:px-6 lg:hidden">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Open navigation menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu />
          </Button>
          <span className="truncate text-sm font-semibold">Super Admin Control Center</span>
        </header>
        {children}
      </div>
    </div>
  )
}
