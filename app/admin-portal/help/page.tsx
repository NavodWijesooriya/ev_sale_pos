import { redirect } from "next/navigation"
import { connection } from "next/server"
import { getAuthSession } from "@/lib/auth"
import { SuperAdminGuideView } from "@/components/admin-portal/super-admin-guide-view"

export const instant = false

export const metadata = {
  title: "Super Admin Platform Guide | Ev Sale Pos",
  description: "Operations guide for Super Admins on tenant registration, subdomain routing, and OrgAdmin onboarding",
}

export default async function SuperAdminHelpPage() {
  await connection()

  const session = await getAuthSession()

  if (
    !session?.user ||
    (session.user.role !== "PlatformAdmin" && session.user.role !== "SuperAdmin")
  ) {
    redirect("/login?callbackUrl=/admin-portal/help")
  }

  return <SuperAdminGuideView />
}

