import { redirect } from "next/navigation"
import { getSupplierSlabs } from "@/app/actions/supplier-commission"
import { SupplierCommissionSlabs } from "@/components/settings/supplier-commission-slabs"
import { getAuthSession } from "@/lib/auth"
import { isOwner } from "@/lib/permissions"

export const instant = false

export const metadata = {
  title: "Supplier Commission | Ev Sale Pos",
  description: "Commission slabs suppliers pay per unit sold, by monthly target achievement",
}

export default async function SupplierCommissionSettingsPage() {
  const session = await getAuthSession()
  if (!session?.user?.organizationId) redirect("/login?callbackUrl=/dashboard/settings/supplier-commission")
  // Owner only: this is dealership income.
  if (!isOwner(session.user)) redirect("/dashboard")

  const slabs = await getSupplierSlabs()
  return (
    <div className="w-full">
      <SupplierCommissionSlabs slabs={slabs} />
    </div>
  )
}
