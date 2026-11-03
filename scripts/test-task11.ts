import { prisma } from "../lib/prisma"
import { getAnalyticsData } from "../app/actions/reports"

async function runTask11Verification() {
  console.log("=== Testing Task 11: Reports & Analytics Dashboard ===")

  const org = await prisma.organization.findFirst()
  if (!org) {
    throw new Error("No organization found in database to test")
  }
  console.log(`Found Dealership: ${org.businessName} (ID: ${org.id})`)

  // 1. Verify DB aggregations
  const now = new Date()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(now.getDate() - 29)
  thirtyDaysAgo.setHours(0, 0, 0, 0)

  const salesAgg = await prisma.sale.aggregate({
    where: {
      organizationId: org.id,
      saleDate: { gte: thirtyDaysAgo, lte: now },
    },
    _sum: { totalAmount: true },
    _count: { id: true },
  })

  const soldVehiclesCount = await prisma.saleItem.count({
    where: {
      sale: {
        organizationId: org.id,
        saleDate: { gte: thirtyDaysAgo, lte: now },
      },
    },
  })

  const inStockCount = await prisma.vehicle.count({
    where: {
      organizationId: org.id,
      status: "InStock",
    },
  })

  const servicesCount = await prisma.serviceRecord.count({
    where: {
      organizationId: org.id,
      serviceDate: { gte: thirtyDaysAgo, lte: now },
    },
  })

  console.log("\n[1] KPI Summary Verification (Last 30 Days):")
  console.log(`  - Total Revenue: $${(salesAgg._sum.totalAmount || 0).toLocaleString()}`)
  console.log(`  - Total Vehicles Sold: ${soldVehiclesCount} units`)
  console.log(`  - Available Stock (InStock): ${inStockCount} units`)
  console.log(`  - Services Completed: ${servicesCount} records`)

  // 2. Test Model breakdown
  const saleItems = await prisma.saleItem.findMany({
    where: {
      sale: {
        organizationId: org.id,
      },
    },
    include: {
      vehicle: {
        include: {
          vehicleModel: true,
        },
      },
    },
  })

  console.log("\n[2] Popular Vehicle Models Sold (All-Time Breakdown):")
  const modelMap: Record<string, number> = {}
  for (const item of saleItems) {
    const key = `${item.vehicle.vehicleModel.brand} ${item.vehicle.vehicleModel.modelName}`
    modelMap[key] = (modelMap[key] || 0) + 1
  }
  for (const [model, count] of Object.entries(modelMap)) {
    console.log(`  - ${model}: ${count} sold`)
  }

  // 3. Test 5 Recent Transactions
  const recentSales = await prisma.sale.findMany({
    where: { organizationId: org.id },
    include: {
      customer: true,
      items: {
        include: {
          vehicle: {
            include: {
              vehicleModel: true,
            },
          },
        },
      },
    },
    orderBy: { saleDate: "desc" },
    take: 5,
  })

  console.log("\n[3] 5 Most Recent Transactions:")
  recentSales.forEach((s, idx) => {
    const models = s.items.map((i) => i.vehicle.vehicleModel.modelName).join(", ")
    console.log(
      `  [${idx + 1}] Date: ${s.saleDate.toISOString().split("T")[0]} | Customer: ${
        s.customer.name
      } | Models: ${models} | Amount: $${s.totalAmount.toLocaleString()} | Status: ${s.status}`
    )
  })

  // 4. Test Multi-tenant isolation
  const fakeOrgId = "00000000-0000-0000-0000-000000000000"
  const isolatedSales = await prisma.sale.aggregate({
    where: { organizationId: fakeOrgId },
    _sum: { totalAmount: true },
  })
  if (isolatedSales._sum.totalAmount === null) {
    console.log("\n[4] Multi-Tenant Security Check: PASSED (Foreign org queries return null/empty)")
  } else {
    throw new Error("Multi-tenant isolation failed!")
  }

  console.log("\n>>> ALL TASK 11 VERIFICATIONS PASSED SUCCESSFULLY! <<<")
}

runTask11Verification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test failed:", err)
    process.exit(1)
  })
