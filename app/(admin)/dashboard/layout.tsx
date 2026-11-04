import { redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth"
import { DashboardShell } from "@/components/layout/dashboard-shell"

export const instant = false

export const metadata = {
  title: "Admin Dashboard | Ev Sale Pos",
  description: "Manage EV inventory, chassis, branches, sales, and dealership operations",
}

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getAuthSession()

  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard")
  }

  return (
    <DashboardShell user={session.user}>
      {children}
    </DashboardShell>
  )
}

