import { redirect } from "next/navigation"
import { connection } from "next/server"
import { getAuthSession } from "@/lib/auth"
import { isOwner } from "@/lib/permissions"
import { getCommissionReports } from "@/app/actions/finance-reports"
import { getCommissionSettlementLines } from "@/app/actions/commission-settlement"
import { CommissionSettlementPanel } from "@/components/finance/commission-settlement-panel"
import { CommissionReportsView } from "@/components/finance/commission-reports-view"

export const instant = false

export const metadata = {
  title: "Commission Reports | Ev Sale Pos",
  description: "Track finance and insurance commissions earned from vehicle sales",
}

interface PageProps {
  searchParams: Promise<{
    from?: string
    to?: string
    staff?: string
    stype?: string
    sstatus?: string
  }>
}

export default async function CommissionReportsPage({ searchParams }: PageProps) {
  await connection()

  const session = await getAuthSession()
  if (!session?.user?.organizationId) {
    redirect("/login?callbackUrl=/dashboard/finance/commissions")
  }
  // Commissions are visible to the dealership owner only
  if (!isOwner(session.user)) redirect("/dashboard")

  const { from, to, staff, stype, sstatus } = await searchParams

  const [data, settlement] = await Promise.all([
    getCommissionReports(from, to, staff),
    getCommissionSettlementLines({ type: stype, status: sstatus, from, to }),
  ])

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <CommissionReportsView
        initialData={data}
        initialFrom={from}
        initialTo={to}
        initialStaff={staff}
      />
      <CommissionSettlementPanel
        lines={settlement.lines}
        pendingTotal={settlement.pendingTotal}
        settledTotal={settlement.settledTotal}
        initialType={stype ?? ""}
        initialStatus={sstatus ?? ""}
      />
    </div>
  )
}
