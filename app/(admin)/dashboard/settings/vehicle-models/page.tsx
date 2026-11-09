import { redirect } from "next/navigation"
import { getCatalogManagementAccess, getVehicleModels } from "@/app/actions/inventory"
import { VehicleModels } from "@/components/settings/vehicle-models"
import { getAuthSession } from "@/lib/auth"

export const instant = false

export const metadata = {
  title: "Vehicle Models | Ev Sale Pos",
  description: "Manage EV vehicle models and default catalog prices",
}

export default async function VehicleModelsPage() {
  const session = await getAuthSession()

  if (!session?.user?.organizationId) {
    redirect("/login?callbackUrl=/dashboard/settings/vehicle-models")
  }

  if (session.user.role !== "OrgAdmin" && session.user.role !== "BranchManager") {
    redirect("/dashboard")
  }

  const [modelsResult, canManageCatalog] = await Promise.all([
    getVehicleModels(),
    getCatalogManagementAccess(),
  ])

  if (!modelsResult.success) {
    throw new Error(modelsResult.error)
  }

  return (
    <VehicleModels
      initialModels={modelsResult.data}
      canManageCatalog={canManageCatalog}
    />
  )
}
