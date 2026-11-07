import { redirect } from "next/navigation"
import { UserRole } from "@prisma/client"
import { getAuthSession } from "@/lib/auth"
import { getSpareParts } from "@/app/actions/spare-parts"
import { SparePartsInventory } from "@/components/services/spare-parts-inventory"

export const metadata = {
  title: "Spare Parts Inventory | Ev Sale Pos",
  description: "Manage spare parts and workshop stock",
}

export default async function SparePartsPage() {
  const session = await getAuthSession()
  if (!session?.user?.organizationId) {
    redirect("/login?callbackUrl=/dashboard/services/spare-parts")
  }
  if (session.user.role !== UserRole.OrgAdmin) {
    redirect("/dashboard/services")
  }

  const result = await getSpareParts()
  if (!result.success) {
    throw new Error(result.error)
  }

  return <SparePartsInventory initialParts={result.data} />
}
