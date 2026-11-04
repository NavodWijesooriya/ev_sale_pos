import { redirect } from "next/navigation"
import { connection } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession } from "@/lib/auth"
import { SuperAdminView, OrganizationRow } from "@/components/admin-portal/super-admin-view"

export const instant = false

export default async function SuperAdminDashboardPage() {
  await connection()

  // 1. Route Security: Verify the user is logged in as a PlatformAdmin
  const session = await getAuthSession()

  if (
    !session?.user ||
    (session.user.role !== "PlatformAdmin" && session.user.role !== "SuperAdmin")
  ) {
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
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
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

