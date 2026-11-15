import { guardRoute } from "@/lib/route-guard"

export default async function SalesLayout({ children }: { children: React.ReactNode }) {
  await guardRoute("CREATE_SALE")
  return children
}
