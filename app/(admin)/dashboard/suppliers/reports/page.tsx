import { redirect } from "next/navigation"
import {
  getSupplierLedger,
  getSupplierOutstandingReport,
  getSupplierPaymentHistory,
} from "@/app/actions/supplier-payments"
import { SupplierLedgerView } from "@/components/suppliers/supplier-ledger-view"
import { getAuthSession } from "@/lib/auth"

export const instant = false

export const metadata = {
  title: "Supplier Ledger & Reports | Ev Sale Pos",
  description: "Supplier outstanding, payment history and ledger accounts",
}

export default async function SupplierReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ supplierId?: string }>
}) {
  const session = await getAuthSession()
  if (!session?.user?.organizationId) redirect("/login?callbackUrl=/dashboard/suppliers/reports")
  if (!["OrgAdmin", "BranchManager", "SuperAdmin"].includes(session.user.role)) redirect("/dashboard")

  const { supplierId = "" } = await searchParams
  const [report, history, ledger] = await Promise.all([
    getSupplierOutstandingReport(),
    getSupplierPaymentHistory(supplierId || undefined),
    supplierId ? getSupplierLedger(supplierId).catch(() => null) : Promise.resolve(null),
  ])

  return (
    <SupplierLedgerView
      report={report}
      history={history}
      ledger={ledger}
      selectedSupplierId={ledger ? supplierId : ""}
    />
  )
}
