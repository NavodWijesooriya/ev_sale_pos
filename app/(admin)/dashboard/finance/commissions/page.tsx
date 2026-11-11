import { redirect } from "next/navigation"
import { connection } from "next/server"
import { getAuthSession } from "@/lib/auth"
import { getCommissionReports } from "@/app/actions/finance-reports"
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
  }>
}

export default async function CommissionReportsPage({ searchParams }: PageProps) {
  await connection()

  const session = await getAuthSession()
  if (!session?.user?.organizationId) {
    redirect("/login?callbackUrl=/dashboard/finance/commissions")
  }

  const { from, to } = await searchParams

  const data = await getCommissionReports(from, to)

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <CommissionReportsView
        initialData={data}
        initialFrom={from}
        initialTo={to}
      />
    </div>
  )
}
