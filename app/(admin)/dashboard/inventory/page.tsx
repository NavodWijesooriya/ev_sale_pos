import { redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth"
import {
  getVehicleModels,
  getSuppliers,
  getStockVehicles,
  getGRNs,
  getDealershipBranches,
  getCatalogManagementAccess,
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
  const [modelsRes, suppliersRes, stockRes, grnsRes, branchesRes, canManageCatalog] = await Promise.all([
    getVehicleModels(),
    getSuppliers(),
    getStockVehicles(),
    getGRNs(),
    getDealershipBranches(),
    getCatalogManagementAccess(),
  ])

  return (
    <InventoryDashboard
      initialModels={modelsRes.data}
      initialSuppliers={suppliersRes.data}
      initialVehicles={stockRes.data}
      initialGRNs={grnsRes.data}
      branches={branchesRes.data}
      dealershipName={session.user.organizationName || "Dealership"}
      canManageCatalog={canManageCatalog}
    />
  )
}
