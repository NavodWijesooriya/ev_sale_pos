import { redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth"
import { getBranches } from "@/app/actions/branch"
import { BranchManagement } from "@/components/settings/branch-management"

export const instant = false

export const metadata = {
  title: "Branch Showrooms Management | VoltPOS EV ERP",
  description: "Configure dealership physical branches, showrooms, and regional EV service facilities",
}

export default async function BranchesPage() {
  const session = await getAuthSession()

  // 1. Route Security: ONLY allow access if the logged-in user's role is OrgAdmin (or SuperAdmin)
  if (
    !session?.user ||
    (session.user.role !== "OrgAdmin" && session.user.role !== "SuperAdmin")
  ) {
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
