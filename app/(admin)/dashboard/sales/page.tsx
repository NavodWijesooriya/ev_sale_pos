import { redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth"
import { getPOSInitialData, getSalesHistory } from "@/app/actions/sales"
import { SalesDashboard } from "@/components/sales/sales-dashboard"

export const instant = false

export const metadata = {
  title: "Sales & POS Management | VoltPOS EV Dealership ERP",
  description: "Point of Sale terminal, EV customer billing, cash & bank leasing management",
}

export default async function SalesPage() {
  const session = await getAuthSession()

  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard/sales")
  }

  // Fetch initial POS stock and sales history strictly scoped to current tenant
  const [posDataRes, salesHistoryRes] = await Promise.all([
    getPOSInitialData(),
    getSalesHistory(),
  ])

  const initialVehicles = posDataRes.data?.vehicles || []
  const initialCustomers = posDataRes.data?.customers || []
  const branches = posDataRes.data?.branches || []
  const initialSales = salesHistoryRes.data || []

  return (
    <SalesDashboard
      initialVehicles={initialVehicles as any}
      initialCustomers={initialCustomers as any}
      initialSales={initialSales as any}
      branches={branches as any}
      dealershipName={session.user.organizationName || "Dealership"}
    />
  )
}
