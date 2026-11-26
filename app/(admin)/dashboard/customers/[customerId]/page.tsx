import { notFound, redirect } from "next/navigation"
import { UserRole } from "@prisma/client"
import { getAuthSession } from "@/lib/auth"
import { getCustomerProfile } from "@/app/actions/customers"
import { getCustomerOwnership } from "@/app/actions/ownership-transfer"
import { CustomerOwnershipCard } from "@/components/customers/customer-ownership-card"
import {
  CustomerProfile,
  type CustomerProfileData,
} from "@/components/customers/customer-profile"

export const instant = false

export const metadata = {
  title: "Customer Profile & CRM Dossier | Ev Sale Pos",
  description: "View customer details, electric vehicle purchase history, and after-sales service logs",
}

interface CustomerProfilePageProps {
  params: Promise<{
    customerId: string
  }>
}

export default async function CustomerDetailPage({ params }: CustomerProfilePageProps) {
  const session = await getAuthSession()

  if (!session?.user?.organizationId) {
    redirect("/login?callbackUrl=/dashboard/customers")
  }

  const { customerId } = await params

  if (!customerId) {
    notFound()
  }

  const res = await getCustomerProfile(customerId)

  if (!res.success || !res.data) {
    notFound()
  }

  const ownership = await getCustomerOwnership(customerId)

  return (
    <div className="space-y-6">
      <CustomerProfile
        customer={res.data as CustomerProfileData}
        canManageFreeServiceEntitlement={session.user.role === UserRole.OrgAdmin}
      />
      <CustomerOwnershipCard ownership={ownership} />
    </div>
  )
}
