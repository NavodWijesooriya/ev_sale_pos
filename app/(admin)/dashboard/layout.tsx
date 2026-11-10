import { connection } from "next/server"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"

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
  await connection()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    redirect("/login")
  }

  const dealershipUser = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase().trim() },
    select: {
      id: true,
      name: true,
      role: true,
      organizationId: true,
      organization: { select: { businessName: true } },
      isActive: true,
    },
  })

  if (!dealershipUser?.isActive) {
    redirect("/login")
  }

  const shellUser = {
    id: dealershipUser.id,
    name: dealershipUser.name,
    email: user.email,
    role: dealershipUser.role,
    organizationId: dealershipUser.organizationId,
    organizationName: dealershipUser.organization.businessName,
  }

  return (
    <DashboardShell user={shellUser}>
      {children}
    </DashboardShell>
  )
}
