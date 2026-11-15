import { redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth"
import { hasAnyPermission, type Permission } from "@/lib/permissions"

/**
 * Server-side page guard for a whole route segment (use from a layout.tsx).
 * Redirects to the dashboard when the signed-in user holds none of `permissions`.
 * This only keeps people off screens they can't use: server actions enforce the
 * same permissions themselves and remain the authoritative check.
 */
export async function guardRoute(...permissions: Permission[]) {
  const session = await getAuthSession()
  if (!session?.user?.organizationId) redirect("/login")
  if (!hasAnyPermission(session.user, permissions)) redirect("/dashboard")
}
