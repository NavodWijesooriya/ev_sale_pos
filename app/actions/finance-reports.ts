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
}

export interface CommissionReportData {
  totalFinanceCommission: number
  totalInsuranceCommission: number
  overallTotal: number
  sales: CommissionReportSale[]
}

export async function getCommissionReports(
  startDate?: Date | string | null,
  endDate?: Date | string | null
): Promise<CommissionReportData> {
  const { organizationId } = await requireOrganization()

  const whereClause: any = {
    organizationId,
    OR: [
      { financeCommission: { gt: 0 } },
      { insuranceCommission: { gt: 0 } },
    ],
  }

  if (startDate || endDate) {
    whereClause.saleDate = {}
    if (startDate) {
      whereClause.saleDate.gte = new Date(startDate)
    }
    if (endDate) {
      // Set to end of day if endDate is provided
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      whereClause.saleDate.lte = end
    }
  }

  const sales = await prisma.sale.findMany({
    where: whereClause,
    orderBy: {
      saleDate: "desc",
    },
    select: {
      id: true,
      saleDate: true,
      invoiceNumber: true,
      totalAmount: true,
      financeCommission: true,
      insuranceCommission: true,
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
    },
  })

  let totalFinanceCommission = 0
  let totalInsuranceCommission = 0

  sales.forEach((sale) => {
    if (sale.financeCommission) {
      totalFinanceCommission += sale.financeCommission
    }
    if (sale.insuranceCommission) {
      totalInsuranceCommission += sale.insuranceCommission
    }
  })

  const overallTotal = totalFinanceCommission + totalInsuranceCommission

  return {
    totalFinanceCommission,
    totalInsuranceCommission,
    overallTotal,
    sales,
  }
}
