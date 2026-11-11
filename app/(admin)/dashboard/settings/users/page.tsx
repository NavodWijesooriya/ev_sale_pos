import { redirect } from "next/navigation"
import { connection } from "next/server"
import { getAuthSession } from "@/lib/auth"
import { getStaffList } from "@/app/actions/staff"
import { UnifiedTeamAccessView } from "@/components/staff/unified-team-access-view"

export const instant = false

export const metadata = {
  title: "Team & User Access | Ev Sale Pos",
  description: "Manage dealership staff roles, user access and permissions",
}

export default async function TeamAccessPage() {
  await connection()

  const session = await getAuthSession()

  // 1. Authentication check
  if (!session?.user?.organizationId) {
    redirect("/login?callbackUrl=/dashboard/settings/users")
  }

  // 2. Strict Role Access Control: ONLY OrgAdmin (or SuperAdmin) can access User Management
  if (session.user.role !== "OrgAdmin" && session.user.role !== "SuperAdmin") {
    redirect("/dashboard")
  }

  // 3. Fetch staff list
  const staff = await getStaffList()

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <UnifiedTeamAccessView
        initialStaff={staff}
        currentUserId={session.user.id}
      />
    </div>
  )
}
