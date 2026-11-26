import type * as React from "react"
import { ALL_SETTINGS_ITEMS, type SettingsKey } from "@/lib/settings-nav"

/**
 * The title + one-line description every settings page starts with. The text comes from lib/settings-nav.ts so
 * the menu, the header and the page can never disagree. `actions` sits on the right (e.g. an "Add" button).
 */
export function SettingsPageHeader({
  page,
  description,
  actions,
  children,
}: {
  page: SettingsKey
  /** Overrides the default one-line description when a page needs something more specific. */
  description?: React.ReactNode
  actions?: React.ReactNode
  /** Extra content under the description (counters, badges...). */
  children?: React.ReactNode
}) {
  const item = ALL_SETTINGS_ITEMS.find((entry) => entry.key === page)
  if (!item) return null
  const Icon = item.icon

  return (
    <header className="flex flex-col gap-3 border-b pb-5 xl:flex-row xl:items-end xl:justify-between" data-testid="settings-page-header">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="mt-0.5 hidden size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:flex">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{item.title}</h1>
          <p className="text-sm text-muted-foreground">{description ?? item.description}</p>
          {children}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
