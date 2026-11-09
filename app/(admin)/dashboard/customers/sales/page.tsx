import { redirect } from "next/navigation"
import { CustomerType } from "@prisma/client"
import { getAuthSession } from "@/lib/auth"
import { getCustomers } from "@/app/actions/customers"
import { CustomerDirectory } from "@/components/customers/customer-directory"

export const instant = false

export const metadata = {
  title: "Sale Customers | Ev Sale Pos",
  description: "Manage customers who have purchased vehicles from the dealership",
}

export default async function SaleCustomersPage() {
  const session = await getAuthSession()

  if (!session?.user?.organizationId) {
    redirect("/login?callbackUrl=/dashboard/customers/sales")
  }

  const result = await getCustomers(CustomerType.SALE)

  return (
    <CustomerDirectory
      customers={result.data || []}
      customerType={CustomerType.SALE}
      dealershipName={session.user.organizationName || "Dealership"}
    />
  )
}
