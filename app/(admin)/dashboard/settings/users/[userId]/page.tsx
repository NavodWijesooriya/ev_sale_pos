import { notFound, redirect } from "next/navigation"
import { connection } from "next/server"
import { getStaffMonthPay } from "@/app/actions/staff-pay"
import { StaffProfileView } from "@/components/staff/staff-profile-view"
import { getAuthSession } from "@/lib/auth"
import { isOwner } from "@/lib/permissions"

export const instant = false

export const metadata = {
  title: "Staff Profile | Ev Sale Pos",
  description: "Staff salary, commission and monthly earnings",
}

export default async function StaffProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>
  searchParams: Promise<{ month?: string }>
}) {
  await connection()
  const session = await getAuthSession()
  if (!session?.user?.organizationId) redirect("/login?callbackUrl=/dashboard/settings/users")
  // Owner only: salary and staff commission are never shown to anyone else.
  if (!isOwner(session.user)) redirect("/dashboard")

  const [{ userId }, { month }] = await Promise.all([params, searchParams])
  const data = await getStaffMonthPay(userId, month)
  if (!data) notFound()

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <StaffProfileView data={data} />
    </div>
  )
}
