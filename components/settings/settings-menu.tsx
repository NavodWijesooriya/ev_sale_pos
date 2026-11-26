"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { ALL_SETTINGS_ITEMS, settingsItemForPath, type SettingsKey } from "@/lib/settings-nav"

export interface SettingsMenuSection {
  title: string
  items: { key: SettingsKey; title: string; href: string }[]
}

/**
 * Left-hand settings menu (desktop) / dropdown (mobile). The server layout has already removed everything the
 * user may not open, so this only renders what it is given.
 */
export function SettingsMenu({ sections }: { sections: SettingsMenuSection[] }) {
  const pathname = usePathname()
  const router = useRouter()
  const active = settingsItemForPath(pathname)
  const iconFor = (key: SettingsKey) => ALL_SETTINGS_ITEMS.find((item) => item.key === key)?.icon

  return (
    <>
      {/* Mobile: a dropdown at the top */}
      <div className="lg:hidden">
        <label htmlFor="settings-select" className="sr-only">
          Settings page
        </label>
        <select
          id="settings-select"
          data-testid="settings-select"
          value={active?.href ?? ""}
          onChange={(event) => event.target.value && router.push(event.target.value)}
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-medium shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {!active && <option value="">Choose a settings page...</option>}
          {sections.map((section) => (
            <optgroup key={section.title} label={section.title}>
              {section.items.map((item) => (
                <option key={item.key} value={item.href}>
                  {item.title}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Desktop: grouped menu */}
      <nav aria-label="Settings" data-testid="settings-menu" className="hidden w-60 shrink-0 space-y-5 lg:block">
        {sections.map((section) => (
          <div key={section.title} className="space-y-1">
            <h2 className="px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{section.title}</h2>
            {section.items.map((item) => {
              const Icon = iconFor(item.key)
              const isActive = active?.key === item.key
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex min-h-9 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 font-semibold text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {Icon && <Icon className="size-4 shrink-0" />}
                  <span className="truncate">{item.title}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
    </>
  )
}
