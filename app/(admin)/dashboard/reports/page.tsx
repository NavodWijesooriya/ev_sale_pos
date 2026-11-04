import { redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth"
import { getAdvancedReportsData } from "@/app/actions/reports"
import { AdvancedReportsDashboard } from "@/components/reports/advanced-reports-dashboard"

export const instant = false

export default async function ReportsPage() {
  const session = await getAuthSession()

  if (!session?.user?.organizationId) {
    redirect("/login")
  }

  // Fetch complete 4-tab advanced analytics data for the authenticated dealership
  const data = await getAdvancedReportsData()

  return <AdvancedReportsDashboard initialData={data} />
}

