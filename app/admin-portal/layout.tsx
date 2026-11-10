import { connection } from "next/server"
import { Metadata } from "next"
import { AdminPortalShell } from "@/components/admin-portal/sidebar"
import { getAuthSession } from "@/lib/auth"

export const metadata: Metadata = {
  title: "Super Admin Portal | Ev Sale Pos",
  description: "Platform Administration and Tenant Management",
}

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await connection()
  const session = await getAuthSession()

  return (
    <AdminPortalShell
      user={session?.user ? { name: session.user.name, email: session.user.email } : null}
    >
      {children}
    </AdminPortalShell>
  )
}
