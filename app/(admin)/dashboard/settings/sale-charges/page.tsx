import { redirect } from "next/navigation"
import { getSaleChargeSettings } from "@/app/actions/sale-charge-settings"
import { SaleChargeSettingsForm } from "@/components/settings/sale-charge-settings-form"
import { getAuthSession } from "@/lib/auth"
import { isOwner } from "@/lib/permissions"

export const instant = false

export const metadata = {
  title: "Sale Charges | Ev Sale Pos",
  description: "Configure the RMV charge and third-party insurance added to new sales",
}

export default async function SaleChargesPage() {
  const session = await getAuthSession()
  if (!session?.user?.organizationId) redirect("/login?callbackUrl=/dashboard/settings/sale-charges")
  // Owner / admin only
  if (!isOwner(session.user)) redirect("/dashboard")

  const settings = await getSaleChargeSettings()
  return (
    <div className="mx-auto w-full max-w-3xl">
      <SaleChargeSettingsForm settings={settings} />
    </div>
  )
}
