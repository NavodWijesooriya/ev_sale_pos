import { redirect } from "next/navigation"
import { getDeliveryOrders } from "@/app/actions/documents"
import { DeliveryOrdersView } from "@/components/documents/delivery-orders-view"
import { getAuthSession } from "@/lib/auth"
import { DO_STAGES, type DoStage } from "@/lib/documents"

export const instant = false

export const metadata = {
  title: "Delivery Orders | Ev Sale Pos",
  description: "Finance sales from Delivery Order to claim and payment",
}

export default async function DeliveryOrdersPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await getAuthSession()
  if (!session?.user?.organizationId) redirect("/login?callbackUrl=/dashboard/documents/delivery-orders")
  const result = await getDeliveryOrders()
  if (!result.success) throw new Error(result.error)
  const { tab } = await searchParams
  const initialTab = DO_STAGES.includes(tab as DoStage) ? (tab as DoStage) : "AWAITING_DO"
  return <DeliveryOrdersView data={result.data} initialTab={initialTab} />
}
