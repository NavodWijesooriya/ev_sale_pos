import { redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth"
import { firstSettingsHref } from "@/lib/settings-nav"

export const instant = false

/** /dashboard/settings opens the first settings page the user is allowed to see. */
export default async function SettingsIndexPage() {
  const session = await getAuthSession()
  if (!session?.user) redirect("/login?callbackUrl=/dashboard/settings")
  redirect(firstSettingsHref(session.user) ?? "/dashboard")
}
