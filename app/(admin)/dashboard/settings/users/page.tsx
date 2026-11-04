import { redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth"
import { getStaffInitialData } from "@/app/actions/staff"
import { StaffManagement } from "@/components/settings/staff-management"

export const instant = false

export default async function StaffManagementPage() {
  const session = await getAuthSession()

  // 1. Authentication check
  if (!session?.user?.organizationId) {
    redirect("/login")
  }

  // 2. Strict Role Access Control: ONLY OrgAdmin (or SuperAdmin) can access User Management
  if (session.user.role !== "OrgAdmin" && session.user.role !== "SuperAdmin") {
    redirect("/dashboard")
  }

  // 3. Fetch initial staff accounts and branch options
  const initialData = await getStaffInitialData()

  return <StaffManagement initialData={initialData} />
}

