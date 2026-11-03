import { redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth"
import { getServiceInitialData, getServiceRecords } from "@/app/actions/services"
import { ServiceDashboard } from "@/components/services/service-dashboard"

export const instant = false

export const metadata = {
  title: "Service & Maintenance Management | VoltPOS EV Dealership ERP",
  description: "Manage EV periodic services, battery diagnostics, workshop repair jobs, and warranty claims",
}

export default async function ServicesPage() {
  const session = await getAuthSession()

  if (!session?.user?.organizationId) {
    redirect("/login?callbackUrl=/dashboard/services")
  }

  // Fetch initial data strictly scoped to current tenant
  const [initDataRes, recordsRes] = await Promise.all([
    getServiceInitialData(),
    getServiceRecords(),
  ])

  const initialVehicles = initDataRes.data?.vehicles || []
  const branches = initDataRes.data?.branches || []
  const customers = initDataRes.data?.customers || []
  const initialRecords = recordsRes.data || []

  return (
    <ServiceDashboard
      initialVehicles={initialVehicles as any}
      branches={branches as any}
      customers={customers as any}
      initialRecords={initialRecords as any}
      dealershipName={session.user.organizationName || "Dealership"}
    />
  )
}
