import { redirect } from "next/navigation"
import { SettingsMenu } from "@/components/settings/settings-menu"
import { getAuthSession } from "@/lib/auth"
import { visibleSettingsSections } from "@/lib/settings-nav"

/**
 * Shared layout for every settings page: a menu of the pages this user may open, and the selected page on the right.
 * Each page and server action still enforces its own permission check; the menu only hides what is not allowed.
 */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthSession()
  if (!session?.user) redirect("/login")

  const sections = visibleSettingsSections(session.user)
  // Nothing in Settings is open to this user (every page would send them back to the dashboard anyway).
  if (sections.length === 0) redirect("/dashboard")

  const menuSections = sections.map((section) => ({
    title: section.title,
    items: section.items.map((item) => ({ key: item.key, title: item.title, href: item.href })),
  }))

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8 lg:flex-row lg:gap-8 lg:px-8">
      <SettingsMenu sections={menuSections} />
      <div className="min-w-0 flex-1 space-y-6">{children}</div>
    </div>
  )
}
