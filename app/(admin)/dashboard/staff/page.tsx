import { redirect } from "next/navigation"
import { connection } from "next/server"
import { getAuthSession } from "@/lib/auth"
import { getStaffInitialData } from "@/app/actions/staff"
import { StaffManagementView } from "@/components/staff/staff-management-view"

export const instant = false

export const metadata = {
  title: "Staff Management | Ev Sale Pos",
  description: "Manage dealership staff roles and user access control",
}

export default async function StaffManagementPage() {
  await connection()

  const session = await getAuthSession()
  if (!session?.user?.organizationId) {
    redirect("/login?callbackUrl=/dashboard/staff")
  }

  // Strictly enforce OrgAdmin / SuperAdmin authorization
  if (session.user.role !== "OrgAdmin" && session.user.role !== "SuperAdmin") {
    redirect("/dashboard")
  }

  const { users, currentUserId } = await getStaffInitialData()

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <StaffManagementView
        initialStaff={users}
        currentUserId={currentUserId}
      />
    </div>
  )
}
