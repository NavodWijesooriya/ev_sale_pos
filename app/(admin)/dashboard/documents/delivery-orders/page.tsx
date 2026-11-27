import { redirect } from "next/navigation"
import { getDeliveryOrders } from "@/app/actions/documents"
import { DeliveryOrdersView } from "@/components/documents/delivery-orders-view"
import { getAuthSession } from "@/lib/auth"

export const instant = false

export const metadata = {
  title: "Delivery Orders | Ev Sale Pos",
  description: "Finance sales from Delivery Order to claim and payment",
}

export default async function DeliveryOrdersPage() {
  const session = await getAuthSession()
  if (!session?.user?.organizationId) redirect("/login?callbackUrl=/dashboard/documents/delivery-orders")
  const result = await getDeliveryOrders()
  if (!result.success) throw new Error(result.error)
  return <DeliveryOrdersView data={result.data} />
}
