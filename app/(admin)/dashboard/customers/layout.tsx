import { guardRoute } from "@/lib/route-guard"

export default async function CustomersLayout({ children }: { children: React.ReactNode }) {
  // The RMV registry under Customers is sales paperwork, so sales staff may open it too.
  await guardRoute("MANAGE_CUSTOMERS", "CREATE_SALE")
  return children
}
