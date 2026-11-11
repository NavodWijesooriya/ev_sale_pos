import { redirect } from "next/navigation"
import { connection } from "next/server"
import { getAuthSession } from "@/lib/auth"
import { getStaffInitialData } from "@/app/actions/staff"
import { StaffManagement } from "@/components/settings/staff-management"

export const instant = false

export const metadata = {
  title: "Team & User Access | Ev Sale Pos",
  description: "Manage dealership staff roles, user access and permissions",
}

export default async function StaffManagementPage() {
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

  // 3. Fetch initial staff accounts and branch options
  const initialData = await getStaffInitialData()

  return <StaffManagement initialData={initialData} />
}
