import { redirect } from "next/navigation"
import { CustomerType } from "@prisma/client"
import { getAuthSession } from "@/lib/auth"
import { getCRMCustomerFormOptions, getCustomers } from "@/app/actions/customers"
import { AddCRMCustomer } from "@/components/customers/add-crm-customer"
import { CustomerDirectory } from "@/components/customers/customer-directory"

export const instant = false

export const metadata = {
  title: "CRM Customers | Ev Sale Pos",
  description: "Manage CRM leads, vehicle interests, and follow-up conversations",
}

export default async function CRMCustomersPage() {
  const session = await getAuthSession()

  if (!session?.user?.organizationId) {
    redirect("/login?callbackUrl=/dashboard/customers/crm")
  }

  const [result, options] = await Promise.all([
    getCustomers(CustomerType.CRM),
    getCRMCustomerFormOptions(),
  ])
  if (!options.success) {
    throw new Error(options.error)
  }

  return (
    <div className="space-y-6">
      <AddCRMCustomer models={options.data.models} cities={options.data.cities} />
      <CustomerDirectory
        customers={result.data || []}
        customerType={CustomerType.CRM}
        dealershipName={session.user.organizationName || "Dealership"}
      />
    </div>
  )
}
