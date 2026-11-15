import { redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth"
import { hasPermission } from "@/lib/permissions"
import { getUnifiedReportsData } from "@/app/actions/reports"
import { AdvancedReportsDashboard } from "@/components/reports/advanced-reports-dashboard"

export const instant = false

export const metadata = {
  title: "Reports & Analytics | Ev Sale Pos",
  description: "Comprehensive dealership intelligence covering sales, commissions, advances, services, and GRN stock",
}

export default async function ReportsPage() {
  const session = await getAuthSession()

  if (!session?.user?.organizationId) {
    redirect("/login")
  }
  if (!hasPermission(session.user, "VIEW_REPORTS")) {
    redirect("/dashboard")
  }

  // Fetch unified reports data spanning sales, commissions, advances, service, and GRN batches
  const data = await getUnifiedReportsData()

  return <AdvancedReportsDashboard initialData={data} />
}

