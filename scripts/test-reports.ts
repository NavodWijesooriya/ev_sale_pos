import { prisma } from "../lib/prisma"
import { getAnalyticsData } from "../app/actions/reports"

async function testReports() {
  console.log("=== Testing Reports & Analytics Server Action ===")

  // Mock session by temporarily querying the first organization
  const org = await prisma.organization.findFirst()
  if (!org) {
    console.error("No organization found")
    return
  }
  console.log(`Testing with Dealership: ${org.businessName} (${org.id})`)

  // Let's test the database queries directly to simulate the action
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1) // YTD
  const end = new Date()

  const salesAgg = await prisma.sale.aggregate({
    where: { organizationId: org.id },
    _sum: { totalAmount: true },
    _count: { id: true },
  })

  const vehiclesSold = await prisma.saleItem.count({
    where: { sale: { organizationId: org.id } },
  })

  const stock = await prisma.vehicle.count({
    where: { organizationId: org.id, status: "InStock" },
  })

  const services = await prisma.serviceRecord.count({
    where: { organizationId: org.id },
  })

  console.log("KPI Direct Aggregates:")
  console.log("  Total Revenue:", salesAgg._sum.totalAmount || 0)
  console.log("  Sales Count:", salesAgg._count.id)
  console.log("  Total Vehicles Sold:", vehiclesSold)
  console.log("  InStock Vehicles:", stock)
  console.log("  Total Services Completed:", services)
}

testReports()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
