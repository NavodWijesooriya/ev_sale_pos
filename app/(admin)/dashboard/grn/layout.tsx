import { guardRoute } from "@/lib/route-guard"

export default async function GrnLayout({ children }: { children: React.ReactNode }) {
  await guardRoute("CREATE_GRN", "TRANSFER_STOCK", "VIEW_INVENTORY_COST")
  return children
}
