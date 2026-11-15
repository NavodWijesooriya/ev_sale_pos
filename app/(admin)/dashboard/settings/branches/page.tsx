import { redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth"
import { hasPermission } from "@/lib/permissions"
import { getBranches } from "@/app/actions/branch"
import { BranchManagement } from "@/components/settings/branch-management"

export const instant = false

export const metadata = {
  title: "Branch Showrooms Management | VoltPOS EV ERP",
  description: "Configure dealership physical branches, showrooms, and regional EV service facilities",
}

export default async function BranchesPage() {
  const session = await getAuthSession()

  // 1. Route Security: owners, or staff granted the Access settings permission
  if (!session?.user || !hasPermission(session.user, "ACCESS_SETTINGS")) {
    redirect("/dashboard")
  }

  // 2. Fetch all branch records strictly belonging to the current organizationId
  const branches = await getBranches()

  return (
    <BranchManagement
      initialBranches={branches}
      dealershipName={session.user.organizationName || "Dealership"}
    />
  )
}

