import { redirect } from "next/navigation"
import { getCommissionSettings } from "@/app/actions/commission-settings"
import { CommissionSettingsForm } from "@/components/settings/commission-settings-form"
import { getAuthSession } from "@/lib/auth"
import { isOwner } from "@/lib/permissions"

export const instant = false

export const metadata = {
  title: "Commission Settings | Ev Sale Pos",
  description: "Configure finance and insurance commission rules",
}

export default async function CommissionSettingsPage() {
  const session = await getAuthSession()
  if (!session?.user?.organizationId) redirect("/login?callbackUrl=/dashboard/settings/commissions")
  // Owner / admin only
  if (!isOwner(session.user)) redirect("/dashboard")

  const settings = await getCommissionSettings()
  return (
    <div className="mx-auto w-full max-w-3xl">
      <CommissionSettingsForm settings={settings} />
    </div>
  )
}
