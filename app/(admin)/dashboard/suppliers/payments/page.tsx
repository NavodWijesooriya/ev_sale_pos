import { redirect } from "next/navigation"
import { getSupplierPaymentsOverview } from "@/app/actions/supplier-payments"
import { SupplierPaymentsView } from "@/components/suppliers/supplier-payments-view"
import { getAuthSession } from "@/lib/auth"
import { hasAnyPermission } from "@/lib/permissions"

export const instant = false

export const metadata = {
  title: "Supplier Payments | Ev Sale Pos",
  description: "Track GRN balances and record supplier payments",
}

export default async function SupplierPaymentsPage() {
  const session = await getAuthSession()
  if (!session?.user?.organizationId) redirect("/login?callbackUrl=/dashboard/suppliers/payments")
  if (!hasAnyPermission(session.user, ["MANAGE_SUPPLIERS", "RECORD_PAYMENTS"])) redirect("/dashboard")

  const overview = await getSupplierPaymentsOverview()
  return <SupplierPaymentsView overview={overview} />
}
