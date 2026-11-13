import { redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth"
import { getRMVRegistry } from "@/app/actions/sales"
import { RMVRegistryTable } from "@/components/customers/rmv-registry-table"

export const instant = false

export const metadata = {
  title: "RMV & Vehicle Document Registry | Ev Sale Pos",
  description: "Track Sri Lanka DMT registration book, number plate, and insurance document status",
}

export default async function RMVRegistryPage() {
  const session = await getAuthSession()

  if (!session?.user?.organizationId) {
    redirect("/login?callbackUrl=/dashboard/customers/rmv")
  }

  const result = await getRMVRegistry()

  return (
    <RMVRegistryTable
      sales={result.data || []}
      dealershipName={session.user.organizationName || "Dealership"}
    />
  )
}
