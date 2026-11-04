"use server"

import { prisma } from "@/lib/prisma"
import { getAuthSession } from "@/lib/auth"

/**
 * Ensures session authentication and extracts organizationId
 */
async function requireAuthOrg() {
  const session = await getAuthSession()
  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized. Please log in to your dealership portal.")
  }
  return {
    organizationId: session.user.organizationId,
    user: session.user,
  }
}

export interface MonthlyFinancialBucket {
  monthKey: string // "2026-06"
  monthLabel: string // "Jun 2026"
  revenue: number
  acquisitionCost: number
  commission: number
  grossProfit: number
  netProfit: number
  salesCount: number
  units: number
  marginPercent: number
}

export interface InStockVehicleAgingItem {
  id: string
  chassisNumber: string
  motorNumber?: string | null
  batterySerialNumber?: string | null
  color?: string | null
  modelName: string
  brand: string
  branchName: string
  purchasePrice: number
  inStockSince: string
  daysInStock: number
  agingTier: "critical" | "warning" | "aging" | "fresh"
  status: string
}

export interface PendingDMTItem {
  id: string
  saleId: string
  saleDate: string
  customerName: string
  customerPhone: string
  customerNIC?: string | null
  vehicleSummary: string
  chassisNumber: string
  branchName: string
  status: string
  hasMTA2: boolean
  hasNIC: boolean
  hasPhotos: boolean
  hasTIN: boolean
  missingDocuments: string[]
  registeredNumber?: string | null
}

export interface ServiceRecordItem {
  id: string
  serviceDate: string
  customerName: string
  customerPhone: string
  vehicleSummary: string
  chassisNumber: string
  branchName: string
  serviceType: "Free" | "Paid" | "Warranty"
  description: string
  totalCost: number
  nextServiceDueDate?: string | null
}

export interface AdvancedReportsData {
  organization: {
    id: string
    businessName: string
    phone?: string | null
    logoUrl?: string | null
  }
  financial: {
    totalRevenue: number
    totalFinanceCommission: number
    netGrossProfit: number
    profitMarginPercent: number
    totalAcquisitionCost: number
    monthlyPerformance: MonthlyFinancialBucket[]
  }
  inventoryAging: {
    summary: {
      totalInStock: number
      totalTiedCapital: number
      criticalOver90Count: number
      criticalOver90Capital: number
      warningOver60Count: number
      warningOver60Capital: number
      agingOver30Count: number
      agingOver30Capital: number
      freshCount: number
      averageDaysInStock: number
    }
    vehicles: InStockVehicleAgingItem[]
  }
  pendingDMT: {
    summary: {
      totalPending: number
      missingMTA2Count: number
      missingNICCount: number
      missingPhotosCount: number
      missingTINCount: number
      processingCount: number
    }
    registrations: PendingDMTItem[]
  }
  afterSales: {
    summary: {
      totalPaidServiceRevenue: number
      totalFreeServicesDone: number
      totalWarrantyClaims: number
      totalServiceOrders: number
      totalGrossCost: number
    }
    recentServices: ServiceRecordItem[]
  }
}

/**
 * Main action for Task 11: Advanced Reports & Analytics Dashboard
 * Fetches all metrics across Financial, Inventory Aging, Pending DMT, and After-Sales
 */
export async function getAdvancedReportsData(): Promise<AdvancedReportsData> {
  const { organizationId } = await requireAuthOrg()

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      businessName: true,
      phone: true,
      logoUrl: true,
    },
  })

  const now = new Date()

  // ==========================================
  // 1. Financial Performance & 6-Month Trend
  // ==========================================
  const sales = await prisma.sale.findMany({
    where: {
      organizationId,
    },
    include: {
      customer: {
        select: { name: true, phone: true },
      },
      branch: {
        select: { name: true },
      },
      items: {
        include: {
          vehicle: {
            select: {
              id: true,
              purchasePrice: true,
              chassisNumber: true,
              vehicleModel: {
                select: { brand: true, modelName: true },
              },
            },
          },
        },
      },
      financeDetail: {
        select: {
          dealerCommission: true,
          financeCompany: true,
          status: true,
        },
      },
    },
    orderBy: {
      saleDate: "desc",
    },
  })

  let totalRevenue = 0
  let totalFinanceCommission = 0
  let totalAcquisitionCost = 0
  let netGrossProfit = 0

  // Prepare 6-month timeline buckets
  const monthlyMap = new Map<string, MonthlyFinancialBucket>()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const label = d.toLocaleDateString("en-US", { month: "short", year: "numeric" })
    monthlyMap.set(key, {
      monthKey: key,
      monthLabel: label,
      revenue: 0,
      acquisitionCost: 0,
      commission: 0,
      grossProfit: 0,
      netProfit: 0,
      salesCount: 0,
      units: 0,
      marginPercent: 0,
    })
  }

  for (const sale of sales) {
    const vehicleCost =
      sale.items.length > 0
        ? sale.items.reduce((sum, it) => sum + (it.vehicle?.purchasePrice || 0), 0)
        : 0

    // Profit formula per prompt: (sale.totalAmount + sale.additionalCharges - sale.discount) - purchasePrice
    const saleProfit =
      sale.totalAmount +
      (sale.additionalCharges || 0) -
      (sale.discount || 0) -
      vehicleCost

    const commission = sale.financeDetail?.dealerCommission || 0

    totalRevenue += sale.totalAmount
    totalFinanceCommission += commission
    totalAcquisitionCost += vehicleCost
    netGrossProfit += saleProfit + commission

    // Assign to monthly bucket if in last 6 months
    const monthKey = `${sale.saleDate.getFullYear()}-${String(
      sale.saleDate.getMonth() + 1
    ).padStart(2, "0")}`

    const bucket = monthlyMap.get(monthKey)
    if (bucket) {
      bucket.revenue += sale.totalAmount
      bucket.acquisitionCost += vehicleCost
      bucket.commission += commission
      bucket.grossProfit += saleProfit
      bucket.netProfit += saleProfit + commission
      bucket.salesCount += 1
      bucket.units += sale.items.length
    }
  }

  // Calculate margin percentages for each month
  const monthlyPerformance = Array.from(monthlyMap.values()).map((bucket) => ({
    ...bucket,
    marginPercent:
      bucket.revenue > 0 ? Math.round((bucket.netProfit / bucket.revenue) * 100) : 0,
  }))

  const profitMarginPercent =
    totalRevenue > 0 ? Math.round((netGrossProfit / totalRevenue) * 100) : 0

  // ==========================================
  // 2. Inventory Aging (Dead Stock)
  // ==========================================
  const inStockVehiclesRaw = await prisma.vehicle.findMany({
    where: {
      organizationId,
      status: "InStock",
    },
    include: {
      vehicleModel: {
        select: { brand: true, modelName: true },
      },
      branch: {
        select: { name: true },
      },
      grnItems: {
        include: {
          grn: {
            select: { receivedDate: true },
          },
        },
        take: 1,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  })

  let totalTiedCapital = 0
  let criticalOver90Count = 0
  let criticalOver90Capital = 0
  let warningOver60Count = 0
  let warningOver60Capital = 0
  let agingOver30Count = 0
  let agingOver30Capital = 0
  let freshCount = 0
  let sumDays = 0

  const inStockVehicles: InStockVehicleAgingItem[] = inStockVehiclesRaw.map((v) => {
    const inStockDate = v.grnItems[0]?.grn?.receivedDate || v.createdAt
    const daysInStock = Math.max(
      0,
      Math.floor((now.getTime() - new Date(inStockDate).getTime()) / (1000 * 60 * 60 * 24))
    )

    totalTiedCapital += v.purchasePrice
    sumDays += daysInStock

    let agingTier: "critical" | "warning" | "aging" | "fresh" = "fresh"

    if (daysInStock > 90) {
      agingTier = "critical"
      criticalOver90Count += 1
      criticalOver90Capital += v.purchasePrice
    } else if (daysInStock > 60) {
      agingTier = "warning"
      warningOver60Count += 1
      warningOver60Capital += v.purchasePrice
    } else if (daysInStock > 30) {
      agingTier = "aging"
      agingOver30Count += 1
      agingOver30Capital += v.purchasePrice
    } else {
      freshCount += 1
    }

    return {
      id: v.id,
      chassisNumber: v.chassisNumber,
      motorNumber: v.motorNumber,
      batterySerialNumber: v.batterySerialNumber,
      color: v.color,
      modelName: v.vehicleModel.modelName,
      brand: v.vehicleModel.brand,
      branchName: v.branch.name,
      purchasePrice: v.purchasePrice,
      inStockSince: new Date(inStockDate).toISOString(),
      daysInStock,
      agingTier,
      status: v.status,
    }
  })

  // Sort by aging descending (oldest dead stock first)
  inStockVehicles.sort((a, b) => b.daysInStock - a.daysInStock)

  const averageDaysInStock =
    inStockVehicles.length > 0 ? Math.round(sumDays / inStockVehicles.length) : 0

  // ==========================================
  // 3. Pending DMT Tracker
  // ==========================================
  const pendingDMTRegistrationsRaw = await prisma.dMTRegistration.findMany({
    where: {
      sale: {
        organizationId,
      },
      status: {
        not: "Completed",
      },
    },
    include: {
      sale: {
        include: {
          customer: {
            select: { name: true, phone: true, nic: true },
          },
          branch: {
            select: { name: true },
          },
          items: {
            include: {
              vehicle: {
                include: {
                  vehicleModel: {
                    select: { brand: true, modelName: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      sale: {
        saleDate: "desc",
      },
    },
  })

  let missingMTA2Count = 0
  let missingNICCount = 0
  let missingPhotosCount = 0
  let missingTINCount = 0
  let processingCount = 0

  const pendingDMTList: PendingDMTItem[] = pendingDMTRegistrationsRaw.map((reg) => {
    const missing: string[] = []
    if (!reg.hasMTA2) {
      missing.push("MTA2 Transfer Form")
      missingMTA2Count += 1
    }
    if (!reg.hasNIC) {
      missing.push("Customer NIC Copy")
      missingNICCount += 1
    }
    if (!reg.hasPhotos) {
      missing.push("Passport Photos")
      missingPhotosCount += 1
    }
    if (!reg.hasTIN) {
      missing.push("TIN Certificate")
      missingTINCount += 1
    }

    if (reg.status === "Processing") {
      processingCount += 1
    }

    const firstItem = reg.sale.items[0]
    const vehicleSummary = firstItem
      ? `${firstItem.vehicle.vehicleModel.brand} ${firstItem.vehicle.vehicleModel.modelName}`
      : "Electric Vehicle"
    const chassisNumber = firstItem ? firstItem.vehicle.chassisNumber : "N/A"

    return {
      id: reg.id,
      saleId: reg.saleId,
      saleDate: reg.sale.saleDate.toISOString(),
      customerName: reg.sale.customer.name,
      customerPhone: reg.sale.customer.phone,
      customerNIC: reg.sale.customer.nic,
      vehicleSummary,
      chassisNumber,
      branchName: reg.sale.branch.name,
      status: reg.status,
      hasMTA2: reg.hasMTA2,
      hasNIC: reg.hasNIC,
      hasPhotos: reg.hasPhotos,
      hasTIN: reg.hasTIN,
      missingDocuments: missing,
      registeredNumber: reg.registeredNumber,
    }
  })

  // ==========================================
  // 4. After-Sales & Service Revenue
  // ==========================================
  const serviceRecordsRaw = await prisma.serviceRecord.findMany({
    where: {
      organizationId,
    },
    include: {
      customer: {
        select: { name: true, phone: true },
      },
      branch: {
        select: { name: true },
      },
      vehicle: {
        include: {
          vehicleModel: {
            select: { brand: true, modelName: true },
          },
        },
      },
    },
    orderBy: {
      serviceDate: "desc",
    },
  })

  let totalPaidServiceRevenue = 0
  let totalFreeServicesDone = 0
  let totalWarrantyClaims = 0
  let totalGrossCost = 0

  const serviceRecords: ServiceRecordItem[] = serviceRecordsRaw.map((s) => {
    totalGrossCost += s.totalCost

    if (s.serviceType === "Paid") {
      totalPaidServiceRevenue += s.totalCost
    } else if (s.serviceType === "Free") {
      totalFreeServicesDone += 1
    } else if (s.serviceType === "Warranty") {
      totalWarrantyClaims += 1
    }

    return {
      id: s.id,
      serviceDate: s.serviceDate.toISOString(),
      customerName: s.customer.name,
      customerPhone: s.customer.phone,
      vehicleSummary: `${s.vehicle.vehicleModel.brand} ${s.vehicle.vehicleModel.modelName}`,
      chassisNumber: s.vehicle.chassisNumber,
      branchName: s.branch.name,
      serviceType: s.serviceType as "Free" | "Paid" | "Warranty",
      description: s.description || "General maintenance and checkup",
      totalCost: s.totalCost,
      nextServiceDueDate: s.nextServiceDueDate ? s.nextServiceDueDate.toISOString() : null,
    }
  })

  return {
    organization: {
      id: organizationId,
      businessName: org?.businessName || "Apex EV Motors",
      phone: org?.phone || null,
      logoUrl: org?.logoUrl || null,
    },
    financial: {
      totalRevenue,
      totalFinanceCommission,
      netGrossProfit,
      profitMarginPercent,
      totalAcquisitionCost,
      monthlyPerformance,
    },
    inventoryAging: {
      summary: {
        totalInStock: inStockVehicles.length,
        totalTiedCapital,
        criticalOver90Count,
        criticalOver90Capital,
        warningOver60Count,
        warningOver60Capital,
        agingOver30Count,
        agingOver30Capital,
        freshCount,
        averageDaysInStock,
      },
      vehicles: inStockVehicles,
    },
    pendingDMT: {
      summary: {
        totalPending: pendingDMTList.length,
        missingMTA2Count,
        missingNICCount,
        missingPhotosCount,
        missingTINCount,
        processingCount,
      },
      registrations: pendingDMTList,
    },
    afterSales: {
      summary: {
        totalPaidServiceRevenue,
        totalFreeServicesDone,
        totalWarrantyClaims,
        totalServiceOrders: serviceRecords.length,
        totalGrossCost,
      },
      recentServices: serviceRecords,
    },
  }
}

// ==========================================
// Backward-compatible getAnalyticsData
// ==========================================
export interface AnalyticsFilterParams {
  startDate?: string
  endDate?: string
  preset?: string
}

export interface AnalyticsData {
  dateRange: {
    startDate: string
    endDate: string
    preset?: string
  }
  kpis: {
    totalRevenue: number
    totalVehiclesSold: number
    currentAvailableStock: number
    totalServicesCompleted: number
    averageDealSize: number
    totalServiceRevenue: number
  }
  revenueOverTime: {
    date: string
    displayDate: string
    revenue: number
    units: number
    services: number
  }[]
  salesByModel: {
    name: string
    brand: string
    count: number
    revenue: number
    percentage: number
    fill: string
  }[]
  paymentMethodDistribution: {
    method: string
    count: number
    revenue: number
  }[]
  recentSales: {
    id: string
    saleDate: string
    customerName: string
    customerPhone: string
    vehicleSummary: string
    branchName: string
    paymentMethod: string
    status: string
    totalAmount: number
  }[]
  exportableSales: {
    saleId: string
    date: string
    customerName: string
    customerPhone: string
    customerNic: string
    vehicleModels: string
    chassisNumbers: string
    branch: string
    soldBy: string
    paymentMethod: string
    status: string
    additionalCharges: number
    discount: number
    totalAmount: number
  }[]
}

const MODEL_COLORS = [
  "#10b981",
  "#06b6d4",
  "#6366f1",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#14b8a6",
  "#3b82f6",
]

export async function getAnalyticsData(
  params?: AnalyticsFilterParams
): Promise<AnalyticsData> {
  const { organizationId } = await requireAuthOrg()

  const now = new Date()
  let start: Date
  let end: Date

  if (params?.startDate && params?.endDate) {
    start = new Date(params.startDate)
    start.setHours(0, 0, 0, 0)
    end = new Date(params.endDate)
    end.setHours(23, 59, 59, 999)
  } else {
    const preset = params?.preset || "30d"
    end = new Date()
    end.setHours(23, 59, 59, 999)

    if (preset === "7d") {
      start = new Date()
      start.setDate(now.getDate() - 6)
      start.setHours(0, 0, 0, 0)
    } else if (preset === "month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      start.setHours(0, 0, 0, 0)
    } else if (preset === "ytd") {
      start = new Date(now.getFullYear(), 0, 1)
      start.setHours(0, 0, 0, 0)
    } else if (preset === "all") {
      start = new Date(2020, 0, 1)
      start.setHours(0, 0, 0, 0)
    } else {
      start = new Date()
      start.setDate(now.getDate() - 29)
      start.setHours(0, 0, 0, 0)
    }
  }

  const salesAggregate = await prisma.sale.aggregate({
    where: {
      organizationId,
      saleDate: { gte: start, lte: end },
    },
    _sum: {
      totalAmount: true,
      discount: true,
      additionalCharges: true,
    },
    _count: {
      id: true,
    },
  })

  const totalRevenue = salesAggregate._sum.totalAmount || 0
  const totalSalesCount = salesAggregate._count.id || 0

  const totalVehiclesSold = await prisma.saleItem.count({
    where: {
      sale: {
        organizationId,
        saleDate: { gte: start, lte: end },
      },
    },
  })

  const currentAvailableStock = await prisma.vehicle.count({
    where: {
      organizationId,
      status: "InStock",
    },
  })

  const totalServicesCompleted = await prisma.serviceRecord.count({
    where: {
      organizationId,
      serviceDate: { gte: start, lte: end },
    },
  })

  const serviceAggregate = await prisma.serviceRecord.aggregate({
    where: {
      organizationId,
      serviceDate: { gte: start, lte: end },
    },
    _sum: {
      totalCost: true,
    },
  })
  const totalServiceRevenue = serviceAggregate._sum.totalCost || 0

  const averageDealSize =
    totalSalesCount > 0 ? Math.round(totalRevenue / totalSalesCount) : 0

  const salesInRange = await prisma.sale.findMany({
    where: {
      organizationId,
      saleDate: { gte: start, lte: end },
    },
    select: {
      id: true,
      saleDate: true,
      totalAmount: true,
      paymentMethod: true,
      items: { select: { id: true } },
    },
    orderBy: { saleDate: "asc" },
  })

  const servicesInRange = await prisma.serviceRecord.findMany({
    where: {
      organizationId,
      serviceDate: { gte: start, lte: end },
    },
    select: {
      id: true,
      serviceDate: true,
      totalCost: true,
    },
  })

  const timelineMap = new Map<
    string,
    { date: string; displayDate: string; revenue: number; units: number; services: number }
  >()

  const iterDate = new Date(start)
  while (iterDate <= end) {
    const key = iterDate.toISOString().split("T")[0]
    const displayDate = iterDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
    timelineMap.set(key, {
      date: key,
      displayDate,
      revenue: 0,
      units: 0,
      services: 0,
    })
    iterDate.setDate(iterDate.getDate() + 1)
  }

  for (const s of salesInRange) {
    const key = s.saleDate.toISOString().split("T")[0]
    const bucket = timelineMap.get(key)
    if (bucket) {
      bucket.revenue += s.totalAmount
      bucket.units += s.items.length
    }
  }

  for (const s of servicesInRange) {
    const key = s.serviceDate.toISOString().split("T")[0]
    const bucket = timelineMap.get(key)
    if (bucket) {
      bucket.services += 1
    }
  }

  const revenueOverTime = Array.from(timelineMap.values())

  const saleItems = await prisma.saleItem.findMany({
    where: {
      sale: {
        organizationId,
        saleDate: { gte: start, lte: end },
      },
    },
    include: {
      vehicle: {
        include: {
          vehicleModel: {
            select: { id: true, brand: true, modelName: true },
          },
        },
      },
    },
  })

  const modelMap = new Map<
    string,
    { name: string; brand: string; count: number; revenue: number }
  >()

  for (const item of saleItems) {
    const model = item.vehicle.vehicleModel
    const fullName = `${model.brand} ${model.modelName}`
    const existing = modelMap.get(fullName) || {
      name: fullName,
      brand: model.brand,
      count: 0,
      revenue: 0,
    }
    existing.count += 1
    existing.revenue += item.price
    modelMap.set(fullName, existing)
  }

  const totalSoldUnits = saleItems.length
  const salesByModel = Array.from(modelMap.values())
    .sort((a, b) => b.count - a.count)
    .map((item, index) => ({
      ...item,
      percentage: totalSoldUnits > 0 ? Math.round((item.count / totalSoldUnits) * 100) : 0,
      fill: MODEL_COLORS[index % MODEL_COLORS.length],
    }))

  const paymentMethodAggregate = await prisma.sale.groupBy({
    by: ["paymentMethod"],
    where: {
      organizationId,
      saleDate: { gte: start, lte: end },
    },
    _count: { id: true },
    _sum: { totalAmount: true },
  })

  const paymentMethodDistribution = paymentMethodAggregate.map((p) => ({
    method: p.paymentMethod,
    count: p._count.id,
    revenue: p._sum.totalAmount || 0,
  }))

  const recentSalesRaw = await prisma.sale.findMany({
    where: { organizationId },
    include: {
      customer: { select: { name: true, phone: true } },
      branch: { select: { name: true } },
      items: {
        include: {
          vehicle: {
            include: {
              vehicleModel: { select: { brand: true, modelName: true } },
            },
          },
        },
      },
    },
    orderBy: { saleDate: "desc" },
    take: 5,
  })

  const recentSales = recentSalesRaw.map((s) => ({
    id: s.id,
    saleDate: s.saleDate.toISOString(),
    customerName: s.customer.name,
    customerPhone: s.customer.phone,
    vehicleSummary: s.items
      .map((i) => `${i.vehicle.vehicleModel.brand} ${i.vehicle.vehicleModel.modelName}`)
      .join(", ") || "Vehicle",
    branchName: s.branch.name,
    paymentMethod: s.paymentMethod,
    status: s.status,
    totalAmount: s.totalAmount,
  }))

  const allFilteredSales = await prisma.sale.findMany({
    where: {
      organizationId,
      saleDate: { gte: start, lte: end },
    },
    include: {
      customer: { select: { name: true, phone: true, nic: true } },
      branch: { select: { name: true } },
      soldBy: { select: { name: true } },
      items: {
        include: {
          vehicle: {
            include: {
              vehicleModel: { select: { brand: true, modelName: true } },
            },
          },
        },
      },
    },
    orderBy: { saleDate: "desc" },
  })

  const exportableSales = allFilteredSales.map((s) => ({
    saleId: s.id,
    date: s.saleDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    customerName: s.customer.name,
    customerPhone: s.customer.phone,
    customerNic: s.customer.nic || "N/A",
    vehicleModels: s.items
      .map((i) => `${i.vehicle.vehicleModel.brand} ${i.vehicle.vehicleModel.modelName}`)
      .join("; "),
    chassisNumbers: s.items.map((i) => i.vehicle.chassisNumber).join("; "),
    branch: s.branch.name,
    soldBy: s.soldBy.name,
    paymentMethod: s.paymentMethod,
    status: s.status,
    additionalCharges: s.additionalCharges,
    discount: s.discount,
    totalAmount: s.totalAmount,
  }))

  return {
    dateRange: {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      preset: params?.preset || "30d",
    },
    kpis: {
      totalRevenue,
      totalVehiclesSold,
      currentAvailableStock,
      totalServicesCompleted,
      averageDealSize,
      totalServiceRevenue,
    },
    revenueOverTime,
    salesByModel,
    paymentMethodDistribution,
    recentSales,
    exportableSales,
  }
}

