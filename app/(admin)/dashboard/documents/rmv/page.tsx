import { redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth"
import { canManageDocuments } from "@/lib/documents"
import { getRMVRegistry } from "@/app/actions/sales"
import { RMVRegistryTable } from "@/components/customers/rmv-registry-table"

export const instant = false

export const metadata = {
  title: "RMV Documents | Ev Sale Pos",
  description: "Track Sri Lanka DMT registration book, number plate, and insurance document status",
}

export default async function RMVRegistryPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await getAuthSession()

  if (!session?.user?.organizationId) {
    redirect("/login?callbackUrl=/dashboard/documents/rmv")
  }

  const { tab } = await searchParams
  const result = await getRMVRegistry()

  return (
    <RMVRegistryTable
      sales={result.data || []}
      dealershipName={session.user.organizationName || "Dealership"}
      canManage={canManageDocuments(session.user)}
      initialFilter={["PENDING_AT_RMV", "RECEIVED_NOT_HANDED", "HANDED_OVER"].includes(tab ?? "") ? (tab as "PENDING_AT_RMV" | "RECEIVED_NOT_HANDED" | "HANDED_OVER") : "all"}
    />
  )
}
