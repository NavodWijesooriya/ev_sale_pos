import { guardRoute } from "@/lib/route-guard"

export default async function ServicesLayout({ children }: { children: React.ReactNode }) {
  await guardRoute("MANAGE_WARRANTY_SERVICE")
  return children
}
