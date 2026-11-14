import { redirect } from "next/navigation"
import { getCheques } from "@/app/actions/supplier-payments"
import { ChequeManagement } from "@/components/suppliers/cheque-management"
import { getAuthSession } from "@/lib/auth"

export const instant = false

export const metadata = {
  title: "Cheque Management | Ev Sale Pos",
  description: "Track, clear and bounce supplier cheques",
}

export default async function SupplierChequesPage() {
  const session = await getAuthSession()
  if (!session?.user?.organizationId) redirect("/login?callbackUrl=/dashboard/suppliers/cheques")
  if (!["OrgAdmin", "BranchManager", "SuperAdmin"].includes(session.user.role)) redirect("/dashboard")

  const cheques = await getCheques()
  return <ChequeManagement cheques={cheques} />
}
