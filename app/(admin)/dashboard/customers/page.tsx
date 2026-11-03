import { redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth"
import { getCustomers } from "@/app/actions/customers"
import { CustomerDirectory } from "@/components/customers/customer-directory"

export const instant = false

export const metadata = {
  title: "Customer Directory & CRM | VoltPOS EV Dealership ERP",
  description: "Customer relationship management, client dossiers, purchase tracking, and lifetime value",
}

export default async function CustomersPage() {
  const session = await getAuthSession()

  if (!session?.user?.organizationId) {
    redirect("/login?callbackUrl=/dashboard/customers")
  }

  const res = await getCustomers()
  const customers = res.data || []

  return (
    <CustomerDirectory
      customers={customers}
      dealershipName={session.user.organizationName || "Dealership"}
    />
  )
}
