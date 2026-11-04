import { redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth"
import {
  getVehicleModels,
  getSuppliers,
  getStockVehicles,
  getGRNs,
  getDealershipBranches,
} from "@/app/actions/inventory"
import { InventoryDashboard } from "@/components/inventory/inventory-dashboard"

export const instant = false

export const metadata = {
  title: "EV Bike Inventory & GRN Management | Ev Sale Pos",
  description: "Track physical EV bike chassis stock, bike models catalog, suppliers, and Goods Received Notes",
}

export default async function InventoryPage() {
  const session = await getAuthSession()

  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard/inventory")
  }

  // Fetch all inventory datasets strictly scoped to current tenant
  const [modelsRes, suppliersRes, stockRes, grnsRes, branchesRes] = await Promise.all([
    getVehicleModels(),
    getSuppliers(),
    getStockVehicles(),
    getGRNs(),
    getDealershipBranches(),
  ])

  return (
    <InventoryDashboard
      initialModels={modelsRes.data as any}
      initialSuppliers={suppliersRes.data as any}
      initialVehicles={stockRes.data as any}
      initialGRNs={grnsRes.data as any}
      branches={branchesRes.data as any}
      dealershipName={session.user.organizationName || "Dealership"}
    />
  )
}

