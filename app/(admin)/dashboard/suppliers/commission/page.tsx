import { redirect } from "next/navigation"
import { getSupplierCommissionReport } from "@/app/actions/supplier-commission"
import { SupplierCommissionView } from "@/components/suppliers/supplier-commission-view"
import { getAuthSession } from "@/lib/auth"
import { isOwner } from "@/lib/permissions"

export const instant = false

export const metadata = {
  title: "Supplier Commission | Ev Sale Pos",
  description: "Monthly supplier target commission owed to the dealership",
}

export default async function SupplierCommissionPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const session = await getAuthSession()
  if (!session?.user?.organizationId) redirect("/login?callbackUrl=/dashboard/suppliers/commission")
  // Owner only: this is dealership income.
  if (!isOwner(session.user)) redirect("/dashboard")

  const { month } = await searchParams
  const report = await getSupplierCommissionReport(month)
  return <SupplierCommissionView report={report} />
}
