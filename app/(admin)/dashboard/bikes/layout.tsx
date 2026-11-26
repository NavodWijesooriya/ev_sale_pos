import { guardRoute } from "@/lib/route-guard"

export default async function BikesLayout({ children }: { children: React.ReactNode }) {
  await guardRoute("CREATE_SALE", "CREATE_GRN", "VIEW_INVENTORY_COST", "MANAGE_WARRANTY_SERVICE", "TRANSFER_OWNERSHIP")
  return children
}
