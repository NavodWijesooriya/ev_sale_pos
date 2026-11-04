"use server"

import { prisma } from "@/lib/prisma"
import { getAuthSession } from "@/lib/auth"

/**
 * Enforces session authentication and extracts the user's organizationId
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

export interface CustomerSummaryItem {
  id: string
  name: string
  phone: string
  email?: string | null
  nic?: string | null
  address?: string | null
  totalSpent: number
  totalPurchases: number
  totalServices: number
  lastActivityDate?: Date | string | null
}

/**
 * Retrieves all customers belonging to the current organization with summary calculations
 */
export async function getCustomers() {
  try {
    const { organizationId } = await requireAuthOrg()

    const customers = await prisma.customer.findMany({
      where: { organizationId },
      include: {
        sales: {
          select: {
            id: true,
            totalAmount: true,
            saleDate: true,
          },
          orderBy: { saleDate: "desc" },
        },
        serviceRecords: {
          select: {
            id: true,
            serviceDate: true,
          },
          orderBy: { serviceDate: "desc" },
          take: 1,
        },
        _count: {
          select: {
            sales: true,
            serviceRecords: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    })

    const formatted: CustomerSummaryItem[] = customers.map((c) => {
      const totalSpent = c.sales.reduce((sum, s) => sum + s.totalAmount, 0)
      const lastSaleDate = c.sales[0]?.saleDate
      const lastServiceDate = c.serviceRecords[0]?.serviceDate

      let lastActivity: Date | null = null
      if (lastSaleDate && lastServiceDate) {
        lastActivity = new Date(lastSaleDate) > new Date(lastServiceDate) ? lastSaleDate : lastServiceDate
      } else {
        lastActivity = lastSaleDate || lastServiceDate || null
      }

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        nic: c.nic,
        address: c.address,
        totalSpent,
        totalPurchases: c._count.sales,
        totalServices: c._count.serviceRecords,
        lastActivityDate: lastActivity,
      }
    })

    return {
      success: true,
      data: formatted,
    }
  } catch (error) {
    console.error("getCustomers error:", error)
    return {
      success: false,
      error: (error as Error).message,
      data: [],
    }
  }
}

/**
 * Retrieves a customer's detailed CRM profile with complete purchase and service history
 */
export async function getCustomerProfile(customerId: string) {
  try {
    const { organizationId } = await requireAuthOrg()

    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        organizationId,
      },
      include: {
        sales: {
          orderBy: { saleDate: "desc" },
          include: {
            branch: {
              select: {
                id: true,
                name: true,
                location: true,
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
              include: {
                vehicle: {
                  include: {
                    vehicleModel: true,
                  },
                },
              },
            },
            financeDetail: true,
            dmtRegistration: true,
          },
        },
        serviceRecords: {
          orderBy: { serviceDate: "desc" },
          include: {
            branch: {
              select: {
                id: true,
                name: true,
                location: true,
              },
            },
            vehicle: {
              include: {
                vehicleModel: true,
              },
            },
          },
        },
      },
    })

    if (!customer) {
      return {
        success: false,
        error: "Customer not found in your dealership records.",
        data: null,
      }
    }

    const totalSpent = customer.sales.reduce((sum, s) => sum + s.totalAmount, 0)

    return {
      success: true,
      data: {
        ...customer,
        totalSpent,
      },
    }
  } catch (error) {
    console.error("getCustomerProfile error:", error)
    return {
      success: false,
      error: (error as Error).message,
      data: null,
    }
  }
}

