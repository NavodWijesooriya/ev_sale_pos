import { notFound, redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth"
import { getCustomerProfile } from "@/app/actions/customers"
import { CustomerProfile } from "@/components/customers/customer-profile"

export const instant = false

export const metadata = {
  title: "Customer Profile & CRM Dossier | VoltPOS EV Dealership ERP",
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

  return <CustomerProfile customer={res.data as any} />
}
