import { redirect } from "next/navigation"
import { getSuppliers } from "@/app/actions/inventory"
import { SupplierList } from "@/components/suppliers/supplier-list"
import { getAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const instant = false

export const metadata = {
  title: "Suppliers | Ev Sale Pos",
  description: "Manage the suppliers you buy bikes from",
}

export default async function SuppliersListPage() {
  const session = await getAuthSession()
  if (!session?.user?.organizationId) redirect("/login?callbackUrl=/dashboard/suppliers/list")
  if (!["OrgAdmin", "BranchManager", "SuperAdmin"].includes(session.user.role)) redirect("/dashboard")

  const result = await getSuppliers()
  if (!result.success) throw new Error(result.error)

  // Mirrors the server-side rule in requireCatalogManagement (inventory.ts)
  let canManage = session.user.role === "OrgAdmin"
  if (!canManage && session.user.role === "BranchManager") {
    const org = await prisma.organization.findFirst({
      where: { id: session.user.organizationId },
      select: { staffCanManageCatalog: true },
    })
    canManage = Boolean(org?.staffCanManageCatalog)
  }

  return (
    <SupplierList
      canManage={canManage}
      suppliers={result.data.map((s) => ({
        id: s.id,
        name: s.name,
        contactPerson: s.contactPerson,
        phone: s.phone,
        email: s.email,
        grnCount: s._count.grns,
      }))}
    />
  )
}
