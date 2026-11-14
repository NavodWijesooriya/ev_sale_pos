"use server"

import { prisma } from "@/lib/prisma"
import { getAuthSession } from "@/lib/auth"

async function requireOrganization() {
  const session = await getAuthSession()
  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized. Please log in to your dealership portal.")
  }
  return { organizationId: session.user.organizationId, role: session.user.role }
}

export interface CommissionReportSale {
  id: string
  saleDate: Date
  invoiceNumber: string
  totalAmount: number
  paymentType: string | null
  financeAmount: number
  downPayment: number
  commissionBasis: string
  commissionRate: number
  commissionAmount: number
  financeCommission: number | null
  insuranceCommission: number | null
  customer: {
    id: string
    name: string
    phone: string
  }
  financeCompany: {
    id: string
    name: string
  } | null
  insuranceCompany: {
    id: string
    name: string
  } | null
  commissionRecipient: {
    id: string
    name: string
    email: string
    role: string
  } | null
  soldBy: {
    id: string
    name: string
    email: string
  } | null
  vehicle: {
    id: string
    chassisNumber: string
    unitGrnNumber: string | null
    brand: string
    modelName: string
  } | null
}

export interface CommissionStaffOption {
  id: string
  name: string
  role: string
}

export interface CommissionReportData {
  totalFinanceAmount: number
  totalFinanceCommission: number
  totalInsuranceCommission: number
  overallTotal: number
  totalSalesCount: number
  staffOptions: CommissionStaffOption[]
  sales: CommissionReportSale[]
}

export async function getCommissionReports(
  startDate?: Date | string | null,
  endDate?: Date | string | null,
  staffId?: string | null
): Promise<CommissionReportData> {
  const { organizationId } = await requireOrganization()

  const whereClause: any = {
    organizationId,
    OR: [
      { financeCommission: { gt: 0 } },
      { insuranceCommission: { gt: 0 } },
      { commissionAmount: { gt: 0 } },
    ],
  }

  if (startDate || endDate) {
    whereClause.saleDate = {}
    if (startDate) {
      whereClause.saleDate.gte = new Date(startDate)
    }
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      whereClause.saleDate.lte = end
    }
  }

  if (staffId && staffId !== "ALL") {
    whereClause.OR = undefined
    whereClause.AND = [
      {
        OR: [
          { financeCommission: { gt: 0 } },
          { insuranceCommission: { gt: 0 } },
          { commissionAmount: { gt: 0 } },
        ],
      },
      {
        OR: [
          { commissionRecipientId: staffId },
          { userId: staffId },
        ],
      },
    ]
  }

  const [salesRaw, staffList] = await Promise.all([
    prisma.sale.findMany({
      where: whereClause,
      orderBy: {
        saleDate: "desc",
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        financeCompany: {
          select: {
            id: true,
            name: true,
          },
        },
        insuranceCompany: {
          select: {
            id: true,
            name: true,
          },
        },
        commissionRecipient: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        soldBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          take: 1,
          include: {
            vehicle: {
              include: {
                vehicleModel: {
                  select: {
                    brand: true,
                    modelName: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { organizationId, isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ])

  let totalFinanceAmount = 0
  let totalFinanceCommission = 0
  let totalInsuranceCommission = 0

  const sales: CommissionReportSale[] = salesRaw.map((s) => {
    // Exact commission value: check commissionAmount, then financeCommission
    const fComm =
      s.commissionAmount && s.commissionAmount > 0
        ? s.commissionAmount
        : s.financeCommission || 0
    const iComm = s.insuranceCommission || 0
    const fAmt = s.financeAmount || 0

    totalFinanceAmount += fAmt
    totalFinanceCommission += fComm
    totalInsuranceCommission += iComm

    const vehicleItem = s.items[0]?.vehicle
    const vehicle = vehicleItem
      ? {
          id: vehicleItem.id,
          chassisNumber: vehicleItem.chassisNumber,
          unitGrnNumber: vehicleItem.unitGrnNumber || null,
          brand: vehicleItem.vehicleModel?.brand || "",
          modelName: vehicleItem.vehicleModel?.modelName || "",
        }
      : null

    return {
      id: s.id,
      saleDate: s.saleDate,
      invoiceNumber: s.invoiceNumber,
      totalAmount: s.totalAmount,
      paymentType: s.paymentType,
      financeAmount: fAmt,
      downPayment: s.downPayment || 0,
      commissionBasis: s.commissionBasis || "FINANCE_AMOUNT",
      commissionRate: s.commissionRate || 0,
      commissionAmount: fComm,
      financeCommission: fComm,
      insuranceCommission: iComm,
      customer: s.customer,
      financeCompany: s.financeCompany,
      insuranceCompany: s.insuranceCompany,
      commissionRecipient: s.commissionRecipient,
      soldBy: s.soldBy,
      vehicle,
    }
  })

  const overallTotal = totalFinanceCommission + totalInsuranceCommission

  return {
    totalFinanceAmount,
    totalFinanceCommission,
    totalInsuranceCommission,
    overallTotal,
    totalSalesCount: sales.length,
    staffOptions: staffList,
    sales,
  }
}
