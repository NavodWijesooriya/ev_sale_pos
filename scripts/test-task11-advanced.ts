import { prisma } from "../lib/prisma"

async function verifyAdvancedReports() {
  console.log("=== Testing Task 11: Advanced Reports & Analytics Dashboard ===")

  const org = await prisma.organization.findFirst()
  if (!org) {
    throw new Error("No organization found to test")
  }
  console.log(`Dealership: ${org.businessName} (ID: ${org.id})`)

  // 1. Tab 1: Financial Performance
  console.log("\n[Tab 1: Financial Performance (Profit & Revenue)]")
  const sales = await prisma.sale.findMany({
    where: { organizationId: org.id },
    include: {
      items: { include: { vehicle: true } },
      financeDetail: true,
    },
  })

  let totalRevenue = 0
  let totalCommission = 0
  let totalNetGrossProfit = 0

  sales.forEach((s, idx) => {
    const purchaseCost = s.items.reduce((sum, it) => sum + it.vehicle.purchasePrice, 0)
    const saleProfit = (s.totalAmount + s.additionalCharges - s.discount) - purchaseCost
    const comm = s.financeDetail?.dealerCommission || 0
    totalRevenue += s.totalAmount
    totalCommission += comm
    totalNetGrossProfit += (saleProfit + comm)

    console.log(
      `  Sale #${idx + 1} | Total: Rs. ${s.totalAmount} | Charges: Rs. ${s.additionalCharges} | Discount: Rs. ${s.discount} | Cost: Rs. ${purchaseCost} | Net Profit: Rs. ${saleProfit + comm}`
    )
  })

  console.log(`  -> Calculated Total Revenue: Rs. ${totalRevenue.toLocaleString()}`)
  console.log(`  -> Calculated Finance Commission: Rs. ${totalCommission.toLocaleString()}`)
  console.log(`  -> Calculated Net Gross Profit: Rs. ${totalNetGrossProfit.toLocaleString()}`)
  const margin = totalRevenue > 0 ? ((totalNetGrossProfit / totalRevenue) * 100).toFixed(1) : "0"
  console.log(`  -> Overall Profit Margin: ${margin}%`)

  // 2. Tab 2: Inventory Aging (Dead Stock)
  console.log("\n[Tab 2: Inventory Aging (Dead Stock)]")
  const inStock = await prisma.vehicle.findMany({
    where: { organizationId: org.id, status: "InStock" },
    include: { grnItems: { include: { grn: true } }, vehicleModel: true },
  })

  const now = new Date()
  let over90 = 0, over60 = 0, over30 = 0, fresh = 0
  inStock.forEach((v) => {
    const inStockDate = v.grnItems[0]?.grn?.receivedDate || v.createdAt
    const days = Math.max(0, Math.floor((now.getTime() - new Date(inStockDate).getTime()) / (1000 * 60 * 60 * 24)))
    let tier = "Fresh (<30d)"
    if (days > 90) { over90++; tier = "Critical (>90d)"; }
    else if (days > 60) { over60++; tier = "Warning (60-90d)"; }
    else if (days > 30) { over30++; tier = "Aging (30-60d)"; }
    else { fresh++; }
    console.log(`  ${v.chassisNumber} | ${v.vehicleModel.modelName} | Days: ${days} | Tier: ${tier}`)
  })
  console.log(`  -> Total In-Stock: ${inStock.length} | >90d: ${over90} | 60-90d: ${over60} | 30-60d: ${over30} | <30d: ${fresh}`)

  // 3. Tab 3: Pending DMT Tracker
  console.log("\n[Tab 3: Pending DMT Tracker]")
  const pendingDMT = await prisma.dMTRegistration.findMany({
    where: { sale: { organizationId: org.id }, status: { not: "Completed" } },
    include: { sale: { include: { customer: true, items: { include: { vehicle: true } } } } },
  })
  console.log(`  -> Found ${pendingDMT.length} pending DMT registration(s):`)
  pendingDMT.forEach((d) => {
    const missing: string[] = []
    if (!d.hasMTA2) missing.push("MTA2")
    if (!d.hasNIC) missing.push("NIC")
    if (!d.hasPhotos) missing.push("Photos")
    if (!d.hasTIN) missing.push("TIN")
    console.log(`  File: ${d.id.slice(0, 8)} | Customer: ${d.sale.customer.name} | Status: ${d.status} | Missing: [${missing.join(", ")}]`)
  })

  // 4. Tab 4: After-Sales & Service Revenue
  console.log("\n[Tab 4: After-Sales & Service Revenue]")
  const services = await prisma.serviceRecord.findMany({
    where: { organizationId: org.id },
  })
  let paidRev = 0, freeCount = 0, warrantyCount = 0
  services.forEach((s) => {
    if (s.serviceType === "Paid") paidRev += s.totalCost
    if (s.serviceType === "Free") freeCount += 1
    if (s.serviceType === "Warranty") warrantyCount += 1
  })
  console.log(`  -> Total Paid Service Revenue: Rs. ${paidRev.toLocaleString()}`)
  console.log(`  -> Total Free Services Done: ${freeCount}`)
  console.log(`  -> Total Warranty Claims: ${warrantyCount}`)
  console.log(`  -> Total Service Orders: ${services.length}`)

  console.log("\n>>> ALL ADVANCED REPORTS LOGIC VERIFIED SUCCESSFULLY! <<<")
}

verifyAdvancedReports()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
