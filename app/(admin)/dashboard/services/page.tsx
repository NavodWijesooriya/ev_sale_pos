import { redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth"
import { UserRole } from "@prisma/client"
import { getServiceInitialData, getServiceRecords } from "@/app/actions/services"
import { ServiceDashboard } from "@/components/services/service-dashboard"
import type { SoldVehicleItem, BranchOption, CustomerOption, SparePartOption } from "@/components/services/new-service-form"
import type { ServiceRecordRow } from "@/components/services/service-history-table"

export const instant = false

export const metadata = {
  title: "Service & Maintenance Management | Ev Sale Pos",
  description: "Manage EV periodic services, battery diagnostics, workshop repair jobs, and warranty claims",
}

export default async function ServicesPage() {
  const session = await getAuthSession()

  if (!session?.user?.organizationId) {
    redirect("/login?callbackUrl=/dashboard/services")
  }
  if (
    session.user.role !== UserRole.OrgAdmin &&
    session.user.role !== UserRole.Technician
  ) {
    redirect("/dashboard")
  }

  // Fetch initial data strictly scoped to current tenant
  const [initDataRes, recordsRes] = await Promise.all([
    getServiceInitialData(),
    getServiceRecords(),
  ])

  const initialVehicles = initDataRes.data?.vehicles || []
  const branches = initDataRes.data?.branches || []
  const customers = initDataRes.data?.customers || []
  const spareParts = initDataRes.data?.spareParts || []
  const initialRecords = recordsRes.data || []

  return (
    <ServiceDashboard
      initialVehicles={initialVehicles as SoldVehicleItem[]}
      branches={branches as BranchOption[]}
      customers={customers as CustomerOption[]}
      spareParts={spareParts as SparePartOption[]}
      initialRecords={initialRecords as ServiceRecordRow[]}
      dealershipName={session.user.organizationName || "Dealership"}
      canViewHistory={session.user.role === UserRole.OrgAdmin}
    />
  )
}
