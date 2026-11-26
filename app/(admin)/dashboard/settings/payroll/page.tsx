import { redirect } from "next/navigation"
import { connection } from "next/server"
import { getPayrollSummary } from "@/app/actions/staff-pay"
import { PayrollSummaryView } from "@/components/staff/payroll-summary-view"
import { getAuthSession } from "@/lib/auth"
import { isOwner } from "@/lib/permissions"

export const instant = false

export const metadata = {
  title: "Staff Payroll | Ev Sale Pos",
  description: "Monthly salary and staff commission for every staff member",
}

export default async function PayrollPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await connection()
  const session = await getAuthSession()
  if (!session?.user?.organizationId) redirect("/login?callbackUrl=/dashboard/settings/payroll")
  // Owner only
  if (!isOwner(session.user)) redirect("/dashboard")

  const { month } = await searchParams
  const summary = await getPayrollSummary(month)

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <PayrollSummaryView summary={summary} />
    </div>
  )
}
