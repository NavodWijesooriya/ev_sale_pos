import { redirect } from "next/navigation"
import { getFinanceReceipts, getPendingFinanceReceivables } from "@/app/actions/finance-receivables"
import { FinanceReceivablesView } from "@/components/finance/finance-receivables-view"
import { getAuthSession } from "@/lib/auth"
import { hasPermission, isOwner } from "@/lib/permissions"

export const instant = false

export const metadata = {
  title: "Finance Receivables | Ev Sale Pos",
  description: "What finance companies still owe, and the payments they make",
}

// Next.js passes searchParams as a Promise (see the page.js docs for this version).
export default async function FinanceReceivablesPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; branch?: string; aging?: string }>
}) {
  const session = await getAuthSession()
  if (!session?.user?.organizationId) redirect("/login?callbackUrl=/dashboard/finance/receivables")
  if (!hasPermission(session.user, "MANAGE_FINANCE_RECEIVABLES")) redirect("/dashboard")

  const { company = "", branch = "", aging = "" } = await searchParams
  const [pending, receipts] = await Promise.all([
    getPendingFinanceReceivables({ financeCompanyId: company || undefined, branchId: branch || undefined, aging: aging || undefined }),
    getFinanceReceipts(),
  ])

  return (
    <div className="mx-auto w-full max-w-[1280px]">
      <FinanceReceivablesView
        groups={pending.groups}
        totals={pending.totals}
        companies={pending.companies}
        branches={pending.branches}
        receipts={receipts}
        filters={{ company, branch, aging }}
        canOverride={isOwner(session.user)}
        canRecordDo={hasPermission(session.user, "MANAGE_DOCUMENTS")}
      />
    </div>
  )
}
