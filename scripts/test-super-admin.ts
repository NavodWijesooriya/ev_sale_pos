import { prisma } from "../lib/prisma"
import bcrypt from "bcrypt"
import { navigationItems } from "../components/layout/sidebar"
import { UserRole } from "@prisma/client"

async function runSuperAdminVerification() {
  console.log("=== Testing Super Admin Dashboard & Staff Management ===")

  // 1. Verify PlatformAdmin credentials & login capability
  console.log("\n[1] Verifying PlatformAdmin Credentials:")
  const platformAdmin = await prisma.platformUser.findFirst({
    where: { role: "PlatformAdmin" },
  })

  if (!platformAdmin) {
    throw new Error("No PlatformAdmin user found in database!")
  }
  console.log(`  ✔ Found PlatformAdmin: ${platformAdmin.name} (${platformAdmin.email})`)

  const testPassword = "Admin123!"
  const isMatch = await bcrypt.compare(testPassword, platformAdmin.passwordHash)
  if (!isMatch) {
    throw new Error("PlatformAdmin password verification failed!")
  }
  console.log("  ✔ PlatformAdmin password successfully verified (bcrypt.compare)")

  // 2. Verify Super Admin Global KPIs
  console.log("\n[2] Verifying Global Multi-Tenant Telemetry & KPIs:")
  const [totalOrgs, activeVehicles, totalVehicles, salesAgg, totalUsers, orgs] = await Promise.all([
    prisma.organization.count(),
    prisma.vehicle.count({ where: { status: "InStock" } }),
    prisma.vehicle.count(),
    prisma.sale.aggregate({ _sum: { totalAmount: true } }),
    prisma.user.count(),
    prisma.organization.findMany({
      select: {
        id: true,
        businessName: true,
        subdomain: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ])

  const totalSalesValue = salesAgg._sum.totalAmount || 0

  console.log(`  - Total Registered Organizations: ${totalOrgs}`)
  console.log(`  - Total Active Vehicles (InStock): ${activeVehicles} (of ${totalVehicles} total inventory)`)
  console.log(`  - Total Sales Value Across Tenants: Rs. ${totalSalesValue.toLocaleString()}`)
  console.log(`  - Total Registered Staff Logins: ${totalUsers}`)

  console.log("\n[3] Organizations Directory (Data Table Preview):")
  orgs.forEach((o, idx) => {
    console.log(
      `  [${idx + 1}] ${o.businessName} | Subdomain: ${o.subdomain || "N/A"} | Plan: ${o.subscriptionPlan} | Status: ${o.subscriptionStatus} | Created: ${o.createdAt.toISOString().split("T")[0]}`
    )
  })

  // 4. Verify Tenant Staff Management & Dealership Owner Flow
  console.log("\n[4] Verifying Tenant Staff Management & RBAC:")
  const tenantOrg = await prisma.organization.findFirst({
    include: { branches: true },
  })
  if (!tenantOrg) {
    throw new Error("No tenant organization found!")
  }

  const cashierEmail = `cashier.verified.${Date.now()}@apexev.com`
  const cashierPassword = "CashierSecret123!"
  const cashierHash = await bcrypt.hash(cashierPassword, 10)

  const cashier = await prisma.user.create({
    data: {
      organizationId: tenantOrg.id,
      name: "Dinesh Cashier",
      email: cashierEmail,
      passwordHash: cashierHash,
      role: UserRole.Cashier,
      branchId: tenantOrg.branches[0]?.id || null,
      isActive: true,
    },
    include: { branch: true },
  })

  console.log(`  ✔ Successfully created Cashier: ${cashier.name} (${cashier.email})`)
  console.log(`    - Assigned Role: ${cashier.role}`)
  console.log(`    - Linked Tenant: ${tenantOrg.businessName}`)
  console.log(`    - Branch: ${cashier.branch ? cashier.branch.name : "Headquarters"}`)

  // 5. Verify Dynamic Sidebar Access Control (Settings & Reports hidden for Cashier)
  console.log("\n[5] Verifying Sidebar Access Control Rules:")
  const getVisibleItems = (role: string) => {
    return navigationItems
      .filter((item) => !item.roles || item.roles.includes(role))
      .map((item) => item.title)
  }

  const cashierView = getVisibleItems("Cashier")
  console.log("  Cashier Visible Navigation:", cashierView)
  const cashierHasSettingsOrReports =
    cashierView.includes("Settings (Staff)") || cashierView.includes("Reports")
  if (cashierHasSettingsOrReports) {
    throw new Error("FAILED: Cashier can see Settings or Reports!")
  }
  console.log("  ✔ SUCCESS: 'Settings' and 'Reports' are HIDDEN from Cashier")

  const techView = getVisibleItems("Technician")
  console.log("  Technician Visible Navigation:", techView)
  const techHasSettingsOrReports =
    techView.includes("Settings (Staff)") || techView.includes("Reports")
  if (techHasSettingsOrReports) {
    throw new Error("FAILED: Technician can see Settings or Reports!")
  }
  console.log("  ✔ SUCCESS: 'Settings' and 'Reports' are HIDDEN from Technician")

  const managerView = getVisibleItems("BranchManager")
  console.log("  BranchManager Visible Navigation:", managerView)
  if (!managerView.includes("Reports")) {
    throw new Error("FAILED: BranchManager cannot see Reports!")
  }
  console.log("  ✔ SUCCESS: 'Reports' is VISIBLE to BranchManager")

  const adminView = getVisibleItems("OrgAdmin")
  console.log("  OrgAdmin Visible Navigation:", adminView)
  if (!adminView.includes("Settings (Staff)") || !adminView.includes("Reports")) {
    throw new Error("FAILED: OrgAdmin cannot see Settings or Reports!")
  }
  console.log("  ✔ SUCCESS: 'Settings' and 'Reports' are VISIBLE to OrgAdmin")

  console.log("\n>>> ALL SUPER ADMIN & STAFF MANAGEMENT VERIFICATIONS PASSED! <<<")
}

runSuperAdminVerification()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
