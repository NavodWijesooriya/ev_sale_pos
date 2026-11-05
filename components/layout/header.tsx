"use client"

import * as React from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Building2,
  LogOut,
  User,
  ShieldCheck,
  Menu,
  Bell,
  Search,
  ExternalLink,
} from "lucide-react"
import Link from "next/link"

interface HeaderProps {
  userName?: string
  userEmail?: string
  userRole?: string
  organizationName?: string
  organizationId?: string
  onToggleSidebar?: () => void
}

export function Header({
  userName = "Admin User",
  userEmail = "admin@evdealership.com",
  userRole = "OrgAdmin",
  organizationName = "Apex EV Dealership",
  organizationId,
  onToggleSidebar,
}: HeaderProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
  }

  return (
    <header className="sticky top-0 z-30 flex h-[4.5rem] w-full items-center justify-between border-b border-border/80 bg-background/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8 print:hidden">
      {/* Left side: Hamburger toggle + Dealership info */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="lg:hidden text-muted-foreground hover:text-foreground"
            aria-label="Toggle navigation menu"
          >
            <Menu className="size-5" />
          </Button>
        )}

        {/* Current Dealership Organization Display */}
        <div className="flex items-center gap-2.5 rounded-xl border border-border/80 bg-card px-3.5 py-2 shadow-xs">
          <Building2 className="size-[18px] text-primary shrink-0" />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold tracking-tight text-foreground">
                {organizationName}
              </span>
              <span className="hidden sm:inline-flex rounded-full bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Active Tenant
              </span>
            </div>
            {organizationId && (
              <span className="hidden sm:block text-[10px] text-muted-foreground font-mono truncate max-w-[140px]">
                ID: {organizationId.slice(0, 8)}...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Center/Quick Search */}
      <div className="hidden md:flex items-center max-w-sm w-full mx-4">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-3 size-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search VIN, chassis, customer or order..."
            className="w-full h-10 rounded-xl border border-input bg-card pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/25 transition-colors"
          />
        </div>
      </div>

      {/* Right side: Action items + User Profile Dropdown */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Link to public showroom */}
        <Link href="/" target="_blank">
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex text-xs text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="mr-1.5 size-3.5" />
            Public Showroom
          </Button>
        </Link>

        {/* Notifications Icon Button */}
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground size-9"
          aria-label="Dealership Notifications"
        >
          <Bell className="size-4" />
          <span className="absolute top-2 right-2 size-2 rounded-full bg-blue-600 ring-2 ring-background" />
        </Button>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            data-slot="button"
            className="flex items-center gap-2.5 rounded-full p-1 pl-2 hover:bg-muted/80 transition-colors outline-none cursor-pointer"
          >
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold leading-tight text-foreground">
                {userName}
              </span>
              <span className="text-[10px] text-muted-foreground leading-tight">
                {userRole}
              </span>
            </div>
            <Avatar className="size-8 border ring-1 ring-border">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56 p-1.5">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-xs font-semibold leading-none text-foreground">{userName}</p>
                  <p className="text-[11px] leading-none text-muted-foreground">{userEmail}</p>
                  <div className="pt-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <ShieldCheck className="size-3 text-blue-500" />
                    <span>Role: <strong>{userRole}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Building2 className="size-3 text-indigo-500" />
                    <span className="truncate">Org: {organizationName}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="cursor-pointer text-xs flex items-center gap-2 py-2"
              onClick={() => {}}
            >
              <User className="size-3.5 text-muted-foreground" />
              <span>Dealership Profile</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Logout Action */}
            <DropdownMenuItem
              className="cursor-pointer text-xs text-red-600 dark:text-red-400 flex items-center gap-2 py-2 focus:bg-red-500/10 focus:text-red-600"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="size-3.5" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
