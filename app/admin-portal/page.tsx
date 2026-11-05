import { redirect } from "next/navigation"
import { connection } from "next/server"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { SuperAdminView, OrganizationRow } from "@/components/admin-portal/super-admin-view"

export const instant = false

export default async function SuperAdminDashboardPage() {
  await connection()

  // 1. Verify the signed-in Supabase user is a platform administrator.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    redirect("/admin-portal/login?callbackUrl=/admin-portal")
  }

  const platformUser = await prisma.platformUser.findUnique({
    where: { email: user.email.toLowerCase().trim() },
    select: { name: true, role: true },
  })

  if (platformUser?.role !== "PlatformAdmin") {
    redirect("/admin-portal/login?callbackUrl=/admin-portal")
  }

  // 2. Fetch Global Platform KPIs
  const [
    totalOrganizations,
    activeVehicles,
    totalVehicles,
    salesAgg,
    totalUsers,
    orgsRaw,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.vehicle.count({ where: { status: "InStock" } }),
    prisma.vehicle.count(),
    prisma.sale.aggregate({ _sum: { totalAmount: true } }),
    prisma.user.count(),
    prisma.organization.findMany({
      include: {
        _count: {
          select: {
            users: true,
            branches: true,
            vehicles: true,
            sales: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ])

  const totalSalesValue = salesAgg._sum.totalAmount || 0

  const organizations: OrganizationRow[] = orgsRaw.map((o) => ({
    id: o.id,
    businessName: o.businessName,
    subdomain: o.subdomain,
    domain: o.domain,
    subscriptionPlan: o.subscriptionPlan,
    subscriptionStatus: o.subscriptionStatus,
    createdAt: o.createdAt.toISOString(),
    phone: o.phone,
    usersCount: o._count.users,
    branchesCount: o._count.branches,
    vehiclesCount: o._count.vehicles,
    salesCount: o._count.sales,
  }))

  return (
    <SuperAdminView
      user={{
        name: platformUser.name,
        email: user.email,
        role: platformUser.role,
      }}
      kpis={{
        totalOrganizations,
        activeVehicles,
        totalVehicles,
        totalSalesValue,
        totalUsers,
      }}
      organizations={organizations}
    />
  )
}
