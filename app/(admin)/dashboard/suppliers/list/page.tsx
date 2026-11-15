import { redirect } from "next/navigation"
import { getSuppliers } from "@/app/actions/inventory"
import { SupplierList } from "@/components/suppliers/supplier-list"
import { getAuthSession } from "@/lib/auth"
import { hasPermission } from "@/lib/permissions"

export const instant = false

export const metadata = {
  title: "Suppliers | Ev Sale Pos",
  description: "Manage the suppliers you buy bikes from",
}

export default async function SuppliersListPage() {
  const session = await getAuthSession()
  if (!session?.user?.organizationId) redirect("/login?callbackUrl=/dashboard/suppliers/list")
  if (!hasPermission(session.user, "MANAGE_SUPPLIERS")) redirect("/dashboard")

  const result = await getSuppliers()
  if (!result.success) throw new Error(result.error)

  // Same rule the server enforces: MANAGE_SUPPLIERS (the page itself already requires it)
  const canManage = hasPermission(session.user, "MANAGE_SUPPLIERS")

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
