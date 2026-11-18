"use server"

import { prisma } from "@/lib/prisma"
import { getAuthSession } from "@/lib/auth"
import { batchVehicleWhere } from "@/lib/batch"
import { branchFilter, hasPermission, isOwner } from "@/lib/permissions"
import { redactKeys } from "@/lib/redact"
import { VehicleStatus } from "@prisma/client"
import { getCommissionReports, type CommissionReportData } from "./finance-reports"
import {
  colomboDateKey,
  colomboDayRange,
  colomboMonthKey,
  colomboParts,
  daysInMonth,
  monthLabel,
  parseDateKey,
  parseMonthKey,
} from "@/lib/dates"

/**
 * Ensures session authentication and extracts organizationId.
 * Reports expose margins and purchase costs, so only management roles may run them
 * (server actions are callable directly, hiding the nav link is not enough).
 */
async function requireAuthOrg() {
  const session = await getAuthSession()
  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized. Please log in to your dealership portal.")
  }
  if (!hasPermission(session.user, "VIEW_REPORTS")) {
    throw new Error("You do not have permission to view reports.")
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
  outDate?: string | null
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
  const { organizationId, user } = await requireAuthOrg()

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
      ...branchFilter(user),
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
    const current = colomboParts(now)
    const d = new Date(Date.UTC(current.year, current.month - i, 1))
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
    const label = monthLabel(d.getUTCFullYear(), d.getUTCMonth())
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

    // Sale value = amount invoiced + advance already paid by the customer.
    // totalAmount is already net of discount and includes additional charges, so
    // they must not be applied again (that double-counted them), and the deducted
    // advance is real revenue that totalAmount no longer contains.
    const saleValue = sale.totalAmount + (sale.advanceDeducted || 0)
    const saleProfit = saleValue - vehicleCost

    const commission =
      sale.commissionAmount && sale.commissionAmount > 0
        ? sale.commissionAmount
        : sale.financeCommission || sale.financeDetail?.dealerCommission || 0

    totalRevenue += saleValue
    totalFinanceCommission += commission
    totalAcquisitionCost += vehicleCost
    netGrossProfit += saleProfit + commission

    // Assign to monthly bucket if in last 6 months (Colombo calendar month)
    const monthKey = colomboMonthKey(sale.saleDate)

    const bucket = monthlyMap.get(monthKey)
    if (bucket) {
      bucket.revenue += saleValue
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
      ...branchFilter(user),
      status: { in: [VehicleStatus.AVAILABLE, VehicleStatus.InStock] },
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
      // Branch-assigned staff only see their own branch's registrations, like every other report
      sale: {
        organizationId,
        ...branchFilter(user),
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
      ...branchFilter(user),
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
      outDate: s.outDate ? s.outDate.toISOString() : null,
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
  const { organizationId, user } = await requireAuthOrg()

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
      ...branchFilter(user),
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
      ...branchFilter(user),
      status: { in: [VehicleStatus.AVAILABLE, VehicleStatus.InStock] },
    },
  })

  const totalServicesCompleted = await prisma.serviceRecord.count({
    where: {
      organizationId,
      ...branchFilter(user),
      serviceDate: { gte: start, lte: end },
    },
  })

  const serviceAggregate = await prisma.serviceRecord.aggregate({
    where: {
      organizationId,
      ...branchFilter(user),
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
      ...branchFilter(user),
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
      ...branchFilter(user),
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
      ...branchFilter(user),
      saleDate: { gte: start, lte: end },
    },
    _count: { id: true },
    _sum: { totalAmount: true },
  })

  const paymentMethodDistribution = paymentMethodAggregate.map((p) => ({
    method: p.paymentMethod ?? "N/A",
    count: p._count.id,
    revenue: p._sum.totalAmount || 0,
  }))

  const recentSalesRaw = await prisma.sale.findMany({
    where: { organizationId, ...branchFilter(user) },
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
    paymentMethod: s.paymentMethod ?? "N/A",
    status: s.status,
    totalAmount: s.totalAmount,
  }))

  const allFilteredSales = await prisma.sale.findMany({
    where: {
      organizationId,
      ...branchFilter(user),
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
    paymentMethod: s.paymentMethod ?? "N/A",
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

// ==========================================
// 5. Daily & Monthly Sales Reports
// ==========================================

export interface SalesReportItem {
  id: string
  saleDate: string
  invoiceNumber: string
  customerName: string
  customerPhone: string
  customerNic: string
  vehicleModel: string
  unitGrnNumber: string | null
  chassisNumber: string
  color: string | null
  paymentType: string
  paymentMethod: string
  financeCompany: string | null
  advanceDeducted: number
  totalAmount: number
  grossPrice: number
  status: string
  soldByName: string
  branchName: string
}

export interface SalesReportKPIs {
  totalSalesCount: number
  totalRevenue: number
  cashSalesTotal: number
  financeSalesTotal: number
  totalAdvancesDeducted: number
  netCashCollected: number
}

export interface DailySalesReportData {
  selectedDate: string
  kpis: SalesReportKPIs
  sales: SalesReportItem[]
}

export interface MonthlySalesReportData {
  selectedYearMonth: string // "2026-11"
  selectedYearMonthLabel: string // "Nov 2026"
  kpis: SalesReportKPIs
  dailyTrend: Array<{
    date: string
    dayLabel: string
    salesCount: number
    revenue: number
    cashTotal: number
    financeTotal: number
  }>
  sales: SalesReportItem[]
}

/**
 * Cash actually received at the till for a sale, excluding the customer advance
 * (collected earlier) and the finance company's loan (paid later, if at all).
 * For finance sales that is the down payment; for cash sales the invoiced amount.
 */
function cashCollectedOnSale(
  sale: { totalAmount: number; downPayment: number | null },
  isFinance: boolean,
): number {
  const invoiced = Math.max(0, sale.totalAmount)
  return isFinance ? Math.min(invoiced, Math.max(0, sale.downPayment || 0)) : invoiced
}

/** `batch` limits the report to sales of bikes from one round / batch (e.g. "JM 01" or "JM0102"). */
export async function getDailySalesReport(dateStr?: string, batch?: string): Promise<DailySalesReportData> {
  const { organizationId, user } = await requireAuthOrg()

  // Day boundaries are Colombo calendar days, independent of the server's timezone.
  const target = parseDateKey(dateStr) ?? colomboParts(new Date())
  const { start: startOfDay, end: endOfDay } = colomboDayRange(target.year, target.month, target.day)

  const salesRaw = await prisma.sale.findMany({
    where: {
      organizationId,
      ...branchFilter(user),
      saleDate: { gte: startOfDay, lte: endOfDay },
      ...(batch?.trim() ? { items: { some: { vehicle: batchVehicleWhere(batch) } } } : {}),
    },
    include: {
      customer: { select: { id: true, name: true, phone: true, nic: true } },
      branch: { select: { id: true, name: true } },
      soldBy: { select: { id: true, name: true } },
      financeCompany: { select: { id: true, name: true } },
      items: {
        include: {
          vehicle: {
            include: {
              vehicleModel: { select: { brand: true, modelName: true, defaultPrice: true } },
            },
          },
        },
      },
    },
    orderBy: { saleDate: "desc" },
  })

  let totalRevenue = 0
  let cashSalesTotal = 0
  let financeSalesTotal = 0
  let totalAdvancesDeducted = 0
  let netCashCollected = 0

  const sales: SalesReportItem[] = salesRaw.map((s) => {
    const v = s.items[0]?.vehicle
    const m = v?.vehicleModel
    const isFinance = Boolean(s.financeCompanyId || s.paymentType === "FINANCE" || s.paymentMethod === "Leasing")
    const grossPrice = s.totalAmount + (s.advanceDeducted || 0)
    const advDeducted = s.advanceDeducted || 0

    totalRevenue += grossPrice
    totalAdvancesDeducted += advDeducted

    if (isFinance) {
      financeSalesTotal += grossPrice
    } else {
      cashSalesTotal += grossPrice
    }
    netCashCollected += cashCollectedOnSale(s, isFinance)

    return {
      id: s.id,
      saleDate: s.saleDate.toISOString(),
      invoiceNumber: s.invoiceNumber,
      customerName: s.customer.name,
      customerPhone: s.customer.phone,
      customerNic: s.customer.nic || "N/A",
      vehicleModel: m ? `${m.brand} ${m.modelName}` : "EV Bike",
      unitGrnNumber: v?.unitGrnNumber || null,
      chassisNumber: v?.chassisNumber || "N/A",
      color: v?.color || null,
      paymentType: isFinance ? "FINANCE" : "CASH",
      paymentMethod: s.paymentMethod || (isFinance ? "Leasing" : "Cash"),
      financeCompany: s.financeCompany?.name || null,
      advanceDeducted: advDeducted,
      totalAmount: s.totalAmount,
      grossPrice,
      status: s.status,
      soldByName: s.soldBy.name,
      branchName: s.branch.name,
    }
  })

  const formattedDateStr = `${target.year}-${String(target.month + 1).padStart(2, "0")}-${String(target.day).padStart(2, "0")}`

  return {
    selectedDate: formattedDateStr,
    kpis: {
      totalSalesCount: sales.length,
      totalRevenue,
      cashSalesTotal,
      financeSalesTotal,
      totalAdvancesDeducted,
      netCashCollected,
    },
    sales,
  }
}

export async function getMonthlySalesReport(yearMonthStr?: string, batch?: string): Promise<MonthlySalesReportData> {
  const { organizationId, user } = await requireAuthOrg()

  const selected = parseMonthKey(yearMonthStr) ?? colomboParts(new Date())
  const { year, month } = selected

  // Month boundaries are Colombo calendar days, independent of the server's timezone.
  const startOfMonth = colomboDayRange(year, month, 1).start
  const endOfMonth = colomboDayRange(year, month, daysInMonth(year, month)).end

  const salesRaw = await prisma.sale.findMany({
    where: {
      organizationId,
      ...branchFilter(user),
      saleDate: { gte: startOfMonth, lte: endOfMonth },
      ...(batch?.trim() ? { items: { some: { vehicle: batchVehicleWhere(batch) } } } : {}),
    },
    include: {
      customer: { select: { id: true, name: true, phone: true, nic: true } },
      branch: { select: { id: true, name: true } },
      soldBy: { select: { id: true, name: true } },
      financeCompany: { select: { id: true, name: true } },
      items: {
        include: {
          vehicle: {
            include: {
              vehicleModel: { select: { brand: true, modelName: true, defaultPrice: true } },
            },
          },
        },
      },
    },
    orderBy: { saleDate: "desc" },
  })

  let totalRevenue = 0
  let cashSalesTotal = 0
  let financeSalesTotal = 0
  let totalAdvancesDeducted = 0
  let netCashCollected = 0

  // Map for daily breakdown within month
  const dayCount = daysInMonth(year, month)
  const dailyMap = new Map<number, { date: string; dayLabel: string; salesCount: number; revenue: number; cashTotal: number; financeTotal: number }>()

  for (let day = 1; day <= dayCount; day++) {
    const dStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    dailyMap.set(day, {
      date: dStr,
      dayLabel: `Day ${day}`,
      salesCount: 0,
      revenue: 0,
      cashTotal: 0,
      financeTotal: 0,
    })
  }

  const sales: SalesReportItem[] = salesRaw.map((s) => {
    const v = s.items[0]?.vehicle
    const m = v?.vehicleModel
    const isFinance = Boolean(s.financeCompanyId || s.paymentType === "FINANCE" || s.paymentMethod === "Leasing")
    const grossPrice = s.totalAmount + (s.advanceDeducted || 0)
    const advDeducted = s.advanceDeducted || 0

    totalRevenue += grossPrice
    totalAdvancesDeducted += advDeducted

    if (isFinance) {
      financeSalesTotal += grossPrice
    } else {
      cashSalesTotal += grossPrice
    }
    netCashCollected += cashCollectedOnSale(s, isFinance)

    const dayNumber = colomboParts(s.saleDate).day
    const dayBucket = dailyMap.get(dayNumber)
    if (dayBucket) {
      dayBucket.salesCount += 1
      dayBucket.revenue += grossPrice
      if (isFinance) {
        dayBucket.financeTotal += grossPrice
      } else {
        dayBucket.cashTotal += grossPrice
      }
    }

    return {
      id: s.id,
      saleDate: s.saleDate.toISOString(),
      invoiceNumber: s.invoiceNumber,
      customerName: s.customer.name,
      customerPhone: s.customer.phone,
      customerNic: s.customer.nic || "N/A",
      vehicleModel: m ? `${m.brand} ${m.modelName}` : "EV Bike",
      unitGrnNumber: v?.unitGrnNumber || null,
      chassisNumber: v?.chassisNumber || "N/A",
      color: v?.color || null,
      paymentType: isFinance ? "FINANCE" : "CASH",
      paymentMethod: s.paymentMethod || (isFinance ? "Leasing" : "Cash"),
      financeCompany: s.financeCompany?.name || null,
      advanceDeducted: advDeducted,
      totalAmount: s.totalAmount,
      grossPrice,
      status: s.status,
      soldByName: s.soldBy.name,
      branchName: s.branch.name,
    }
  })

  const ymString = `${year}-${String(month + 1).padStart(2, "0")}`
  const ymLabel = monthLabel(year, month)

  return {
    selectedYearMonth: ymString,
    selectedYearMonthLabel: ymLabel,
    kpis: {
      totalSalesCount: sales.length,
      totalRevenue,
      cashSalesTotal,
      financeSalesTotal,
      totalAdvancesDeducted,
      netCashCollected,
    },
    dailyTrend: Array.from(dailyMap.values()),
    sales,
  }
}

// ==========================================
// 6. Advances Report Data
// ==========================================

export interface AdvancesReportItem {
  id: string
  advanceDate: string
  customerName: string
  customerPhone: string
  customerNic: string
  allocatedVehicle: string
  unitGrnNumber: string | null
  chassisNumber: string | null
  paymentMethod: string
  amount: number
  status: "PENDING" | "USED" | "TRANSFERRED" | "REFUNDED"
  branchName: string
  staffName: string
  notes: string | null
  saleInvoiceNumber: string | null
  transferredToCustomer: string | null
  transferredNote: string | null
}

export interface AdvancesReportKPIs {
  totalAdvancesCount: number
  totalPendingAmount: number
  pendingCount: number
  totalUsedAmount: number
  usedCount: number
  totalTransferredAmount: number
  transferredCount: number
  totalRefundedAmount: number
  refundedCount: number
}

export interface AdvancesReportData {
  kpis: AdvancesReportKPIs
  advances: AdvancesReportItem[]
}

export async function getAdvancesReportData(): Promise<AdvancesReportData> {
  const { organizationId, user } = await requireAuthOrg()

  const advancesRaw = await prisma.advancePayment.findMany({
    where: { organizationId, ...branchFilter(user) },
    include: {
      customer: { select: { id: true, name: true, phone: true, nic: true } },
      branch: { select: { id: true, name: true } },
      staff: { select: { id: true, name: true } },
      vehicle: {
        include: {
          vehicleModel: { select: { brand: true, modelName: true } },
        },
      },
      sale: { select: { id: true, invoiceNumber: true, saleDate: true } },
      transfers: {
        include: {
          toCustomer: { select: { id: true, name: true } },
        },
        take: 1,
      },
    },
    orderBy: { advanceDate: "desc" },
  })

  let totalPendingAmount = 0
  let pendingCount = 0
  let totalUsedAmount = 0
  let usedCount = 0
  let totalTransferredAmount = 0
  let transferredCount = 0
  let totalRefundedAmount = 0
  let refundedCount = 0

  const advances: AdvancesReportItem[] = advancesRaw.map((a) => {
    if (a.status === "PENDING") {
      totalPendingAmount += a.amount
      pendingCount += 1
    } else if (a.status === "USED") {
      totalUsedAmount += a.amount
      usedCount += 1
    } else if (a.status === "TRANSFERRED") {
      totalTransferredAmount += a.amount
      transferredCount += 1
    } else if (a.status === "REFUNDED") {
      totalRefundedAmount += a.amount
      refundedCount += 1
    }

    let allocatedDesc = a.bikeModel
    if (a.vehicle) {
      allocatedDesc = `${a.vehicle.vehicleModel.brand} ${a.vehicle.vehicleModel.modelName}`
    }

    const transferRecord = a.transfers[0]

    return {
      id: a.id,
      advanceDate: a.advanceDate.toISOString(),
      customerName: a.customer.name,
      customerPhone: a.customer.phone,
      customerNic: a.nicNumber || a.customer.nic || "N/A",
      allocatedVehicle: allocatedDesc,
      unitGrnNumber: a.vehicle?.unitGrnNumber || null,
      chassisNumber: a.vehicle?.chassisNumber || null,
      paymentMethod: a.paymentMethod || "Cash",
      amount: a.amount,
      status: a.status as "PENDING" | "USED" | "TRANSFERRED" | "REFUNDED",
      branchName: a.branch.name,
      staffName: a.staff.name,
      notes: a.notes,
      saleInvoiceNumber: a.sale?.invoiceNumber || null,
      transferredToCustomer: transferRecord?.toCustomer?.name || null,
      transferredNote: transferRecord?.note || null,
    }
  })

  return {
    kpis: {
      totalAdvancesCount: advances.length,
      totalPendingAmount,
      pendingCount,
      totalUsedAmount,
      usedCount,
      totalTransferredAmount,
      transferredCount,
      totalRefundedAmount,
      refundedCount,
    },
    advances,
  }
}

// ==========================================
// 7. Service & Spare Parts Report Data
// ==========================================

export interface ServiceJobReportItem {
  id: string
  serviceDate: string
  inDate: string
  outDate: string | null
  durationDays: number
  inMileage: string | null
  nextServiceMileage: string | null
  customerName: string
  customerPhone: string
  vehicleSummary: string
  chassisNumber: string
  registrationNumber: string | null
  serviceType: "Free" | "Paid" | "Warranty"
  status: string
  technicianName: string | null
  description: string
  partsCost: number
  laborCost: number
  totalCost: number
  partsUsed: Array<{
    partName: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
}

export interface LowStockPartItem {
  id: string
  name: string
  sku: string
  partNumber: string | null
  stockQuantity: number
  price: number
  totalValue: number
  isCritical: boolean
}

export interface ServiceAndPartsReportData {
  kpis: {
    totalCompletedJobs: number
    totalFreeServices: number
    totalPaidServices: number
    totalWarrantyServices: number
    totalLaborRevenue: number
    totalPartsRevenue: number
    totalOverallServiceRevenue: number
    lowStockPartsCount: number
    totalSparePartsCount: number
  }
  serviceJobs: ServiceJobReportItem[]
  lowStockParts: LowStockPartItem[]
}

export async function getServiceAndPartsReportData(): Promise<ServiceAndPartsReportData> {
  const { organizationId, user } = await requireAuthOrg()

  const [serviceRecordsRaw, sparePartsRaw] = await Promise.all([
    prisma.serviceRecord.findMany({
      where: { organizationId, ...branchFilter(user) },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        branch: { select: { id: true, name: true } },
        assignedTechnician: { select: { id: true, name: true } },
        vehicle: {
          include: {
            vehicleModel: { select: { brand: true, modelName: true } },
          },
        },
        serviceJob: {
          include: {
            parts: {
              include: {
                sparePart: {
                  select: { name: true, sku: true, partNumber: true },
                },
              },
            },
          },
        },
      },
      orderBy: { inDate: "desc" },
    }),
    prisma.sparePart.findMany({
      where: { organizationId, ...branchFilter(user) },
      orderBy: { stockQuantity: "asc" },
    }),
  ])

  let totalCompletedJobs = 0
  let totalFreeServices = 0
  let totalPaidServices = 0
  let totalWarrantyServices = 0
  let totalLaborRevenue = 0
  let totalPartsRevenue = 0

  const serviceJobs: ServiceJobReportItem[] = serviceRecordsRaw.map((s) => {
    const isCompleted = s.status === "COMPLETED" || Boolean(s.outDate)
    if (isCompleted) totalCompletedJobs += 1

    if (s.serviceType === "Free") totalFreeServices += 1
    else if (s.serviceType === "Paid") totalPaidServices += 1
    else if (s.serviceType === "Warranty") totalWarrantyServices += 1

    const partsCost = s.serviceJob?.partsCost || 0
    // Labor cost is total minus parts cost
    const laborCost = Math.max(0, s.totalCost - partsCost)

    if (s.serviceType === "Paid") {
      totalLaborRevenue += laborCost
      totalPartsRevenue += partsCost
    }

    const inDateObj = new Date(s.inDate || s.serviceDate)
    const outDateObj = s.outDate ? new Date(s.outDate) : null
    const durationDays = outDateObj
      ? Math.max(0, Math.round((outDateObj.getTime() - inDateObj.getTime()) / (1000 * 60 * 60 * 24)))
      : 0

    const partsUsed =
      s.serviceJob?.parts.map((p) => ({
        partName: p.sparePart.name,
        quantity: p.quantity,
        unitPrice: p.unitPrice,
        totalPrice: p.totalPrice,
      })) || []

    return {
      id: s.id,
      serviceDate: s.serviceDate.toISOString(),
      inDate: inDateObj.toISOString(),
      outDate: outDateObj ? outDateObj.toISOString() : null,
      durationDays,
      inMileage: s.inMileage,
      nextServiceMileage: s.nextServiceMileage,
      customerName: s.customer.name,
      customerPhone: s.customer.phone,
      vehicleSummary: `${s.vehicle.vehicleModel.brand} ${s.vehicle.vehicleModel.modelName}`,
      chassisNumber: s.vehicle.chassisNumber,
      registrationNumber: s.vehicle.registrationNumber || null,
      serviceType: s.serviceType as "Free" | "Paid" | "Warranty",
      status: s.status,
      technicianName: s.assignedTechnician?.name || null,
      description: s.description || "Routine maintenance",
      partsCost,
      laborCost,
      totalCost: s.totalCost,
      partsUsed,
    }
  })

  let lowStockCount = 0
  const lowStockParts: LowStockPartItem[] = sparePartsRaw.map((sp) => {
    const isCritical = sp.stockQuantity <= 3
    if (sp.stockQuantity <= 5) lowStockCount += 1

    return {
      id: sp.id,
      name: sp.name,
      sku: sp.sku,
      partNumber: sp.partNumber,
      stockQuantity: sp.stockQuantity,
      price: sp.price,
      totalValue: sp.stockQuantity * sp.price,
      isCritical,
    }
  })

  return {
    kpis: {
      totalCompletedJobs,
      totalFreeServices,
      totalPaidServices,
      totalWarrantyServices,
      totalLaborRevenue,
      totalPartsRevenue,
      totalOverallServiceRevenue: totalLaborRevenue + totalPartsRevenue,
      lowStockPartsCount: lowStockCount,
      totalSparePartsCount: sparePartsRaw.length,
    },
    serviceJobs,
    lowStockParts,
  }
}

// ==========================================
// 8. GRN Batch Summary Report Data
// ==========================================

export interface GRNBatchSummaryItem {
  id: string
  grnNumber: string // "JM 01"
  dateReceived: string
  supplierName: string
  branchName: string
  totalUnitsReceived: number
  totalUnitsSold: number
  totalUnitsRemaining: number
  depletionPercent: number
  totalBatchValue: number
  vehicles: Array<{
    id: string
    unitGrnNumber: string | null // "JM0101"
    chassisNumber: string
    brand: string
    modelName: string
    color: string | null
    status: string
    buyerName: string | null
    invoiceNumber: string | null
  }>
}

export interface GRNBatchReportData {
  kpis: {
    totalBatchesCount: number
    totalUnitsReceived: number
    totalUnitsSold: number
    totalUnitsRemaining: number
    overallDepletionPercent: number
  }
  batches: GRNBatchSummaryItem[]
}

export async function getGRNBatchReportData(): Promise<GRNBatchReportData> {
  const { organizationId, user } = await requireAuthOrg()

  const grnsRaw = await prisma.gRN.findMany({
    where: { organizationId, ...branchFilter(user) },
    include: {
      supplier: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
      vehicles: {
        include: {
          vehicleModel: { select: { brand: true, modelName: true, defaultPrice: true } },
          sales: {
            include: {
              customer: { select: { name: true } },
            },
            take: 1,
          },
        },
        orderBy: { unitGrnNumber: "asc" },
      },
    },
    orderBy: { date: "desc" },
  })

  let totalUnitsReceived = 0
  let totalUnitsSold = 0
  let totalUnitsRemaining = 0

  const batches: GRNBatchSummaryItem[] = grnsRaw.map((g) => {
    const receivedCount = g.vehicles.length
    const soldCount = g.vehicles.filter((v) => v.status === "Sold").length
    const remainingCount = receivedCount - soldCount
    const depletion = receivedCount > 0 ? Math.round((soldCount / receivedCount) * 100) : 0

    totalUnitsReceived += receivedCount
    totalUnitsSold += soldCount
    totalUnitsRemaining += remainingCount

    const batchValue = g.vehicles.reduce((sum, v) => sum + (v.vehicleModel?.defaultPrice || 0), 0)

    const vehicleItems = g.vehicles.map((v) => {
      const sale = v.sales[0]
      return {
        id: v.id,
        unitGrnNumber: v.unitGrnNumber,
        chassisNumber: v.chassisNumber,
        brand: v.vehicleModel?.brand || "",
        modelName: v.vehicleModel?.modelName || "",
        color: v.color,
        status: v.status,
        buyerName: sale?.customer?.name || null,
        invoiceNumber: sale?.invoiceNumber || null,
      }
    })

    return {
      id: g.id,
      grnNumber: g.grnNumber,
      dateReceived: g.receivedDate.toISOString(),
      supplierName: g.supplier?.name || "Direct Factory Import",
      branchName: g.branch?.name || "Main Showroom",
      totalUnitsReceived: receivedCount,
      totalUnitsSold: soldCount,
      totalUnitsRemaining: remainingCount,
      depletionPercent: depletion,
      totalBatchValue: batchValue,
      vehicles: vehicleItems,
    }
  })

  const overallDepletion =
    totalUnitsReceived > 0 ? Math.round((totalUnitsSold / totalUnitsReceived) * 100) : 0

  return {
    kpis: {
      totalBatchesCount: batches.length,
      totalUnitsReceived,
      totalUnitsSold,
      totalUnitsRemaining,
      overallDepletionPercent: overallDepletion,
    },
    batches,
  }
}

// ==========================================
// 9. Unified Reports Master Fetcher
// ==========================================

export interface UnifiedReportsData {
  advancedData: AdvancedReportsData
  dailySales: DailySalesReportData
  monthlySales: MonthlySalesReportData
  advancesReport: AdvancesReportData
  serviceAndParts: ServiceAndPartsReportData
  grnBatches: GRNBatchReportData
  commissionsData: CommissionReportData
}

/** Report fields that reveal margin or profit (need VIEW_COST_PRICE). */
const PROFIT_REPORT_FIELDS = [
  "acquisitionCost",
  "grossProfit",
  "netProfit",
  "marginPercent",
  "netGrossProfit",
  "profitMarginPercent",
  "totalAcquisitionCost",
] as const

/** Report fields that reveal what stock cost or how much capital it ties up (need VIEW_INVENTORY_COST). */
const INVENTORY_COST_REPORT_FIELDS = [
  "totalTiedCapital",
  "criticalOver90Capital",
  "warningOver60Capital",
  "agingOver30Capital",
  "purchasePrice",
] as const

const EMPTY_COMMISSIONS: CommissionReportData = {
  totalFinanceAmount: 0,
  totalFinanceCommission: 0,
  totalInsuranceCommission: 0,
  overallTotal: 0,
  totalSalesCount: 0,
  staffOptions: [],
  sales: [],
}

export async function getUnifiedReportsData(): Promise<UnifiedReportsData> {
  const { user } = await requireAuthOrg()
  const [
    advancedData,
    dailySales,
    monthlySales,
    advancesReport,
    serviceAndParts,
    grnBatches,
    commissionsData,
  ] = await Promise.all([
    getAdvancedReportsData(),
    getDailySalesReport(),
    getMonthlySalesReport(),
    getAdvancesReportData(),
    getServiceAndPartsReportData(),
    getGRNBatchReportData(),
    isOwner(user) ? getCommissionReports() : Promise.resolve(EMPTY_COMMISSIONS),
  ])

  return {
    advancedData: redactKeys(
      redactKeys(advancedData, hasPermission(user, "VIEW_COST_PRICE") ? [] : PROFIT_REPORT_FIELDS),
      hasPermission(user, "VIEW_INVENTORY_COST") ? [] : INVENTORY_COST_REPORT_FIELDS,
    ),
    dailySales,
    monthlySales,
    advancesReport,
    serviceAndParts,
    grnBatches,
    commissionsData,
  }
}
