import { redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth"
import { visibleSettingsSections } from "@/lib/settings-nav"

/**
 * Shared layout for every settings page. The settings pages are listed under "Settings" in the main sidebar, and each
 * page uses the full dashboard content width (the dashboard shell already supplies the padding).
 * Each page and server action still enforces its own permission check.
 */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthSession()
  if (!session?.user) redirect("/login")

  // Nothing in Settings is open to this user (every page would send them back to the dashboard anyway).
  if (visibleSettingsSections(session.user).length === 0) redirect("/dashboard")

  return <div className="w-full min-w-0 space-y-6">{children}</div>
}
