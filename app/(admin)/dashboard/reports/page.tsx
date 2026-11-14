import { redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth"
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
  if (!["OrgAdmin", "BranchManager", "SuperAdmin"].includes(session.user.role)) {
    redirect("/dashboard")
  }

  // Fetch unified reports data spanning sales, commissions, advances, service, and GRN batches
  const data = await getUnifiedReportsData()

  return <AdvancedReportsDashboard initialData={data} />
}

