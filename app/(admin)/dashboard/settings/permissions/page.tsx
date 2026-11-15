import { redirect } from "next/navigation"
import { getStaffInitialData } from "@/app/actions/staff"
import { PermissionsMatrix } from "@/components/settings/permissions-matrix"
import { getAuthSession } from "@/lib/auth"
import { isOwner } from "@/lib/permissions"

export const instant = false

export const metadata = {
  title: "Permissions | Ev Sale Pos",
  description: "Control what each staff member can access",
}

export default async function PermissionsPage() {
  const session = await getAuthSession()
  if (!session?.user?.organizationId) redirect("/login?callbackUrl=/dashboard/settings/permissions")
  // Owner / admin only
  if (!isOwner(session.user)) redirect("/dashboard")

  const { users } = await getStaffInitialData()
  const staff = users.filter((u) => !isOwner(u) && u.isActive)

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PermissionsMatrix staff={staff} />
    </div>
  )
}
