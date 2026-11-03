"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getAuthSession } from "@/lib/auth"
import { ServiceType, VehicleStatus } from "@prisma/client"

/**
 * Enforces session authentication and extracts the user's organizationId and userId
 */
async function requireAuthOrg() {
  const session = await getAuthSession()
  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized. Please log in to your dealership portal.")
  }
  return {
    organizationId: session.user.organizationId,
    userId: session.user.id,
    user: session.user,
  }
}

export interface CreateServiceRecordInput {
  vehicleId: string
  customerId: string
  branchId: string
  serviceType: ServiceType
  description: string
  totalCost: number
  nextServiceDueDate?: string | Date | null
}

/**
 * Fetch sold vehicles, branches, and registered customers for service booking
 */
export async function getServiceInitialData() {
  try {
    const { organizationId } = await requireAuthOrg()

    const [soldVehicles, branches, customers] = await Promise.all([
      // Sold vehicles only
      prisma.vehicle.findMany({
        where: {
          organizationId,
          status: VehicleStatus.Sold,
        },
        include: {
          vehicleModel: true,
          branch: true,
          saleItems: {
            include: {
              sale: {
                include: {
                  customer: true,
                },
              },
            },
            take: 1,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      // Branches
      prisma.branch.findMany({
        where: { organizationId },
        orderBy: { name: "asc" },
      }),

      // Customers
      prisma.customer.findMany({
        where: { organizationId },
        orderBy: { name: "asc" },
        take: 100,
      }),
    ])

    return {
      success: true,
      data: {
        vehicles: soldVehicles,
        branches,
        customers,
      },
    }
  } catch (error) {
    console.error("getServiceInitialData error:", error)
    return {
      success: false,
      error: (error as Error).message,
      data: { vehicles: [], branches: [], customers: [] },
    }
  }
}

/**
 * Fetch all service records for the current dealership
 */
export async function getServiceRecords() {
  try {
    const { organizationId } = await requireAuthOrg()

    const records = await prisma.serviceRecord.findMany({
      where: { organizationId },
      orderBy: { serviceDate: "desc" },
      include: {
        customer: true,
        branch: true,
        vehicle: {
          include: {
            vehicleModel: true,
          },
        },
      },
    })

    return {
      success: true,
      data: records,
    }
  } catch (error) {
    console.error("getServiceRecords error:", error)
    return {
      success: false,
      error: (error as Error).message,
      data: [],
    }
  }
}

/**
 * Creates a new service/repair record connecting organization, branch, vehicle, and customer
 */
export async function createServiceRecord(input: CreateServiceRecordInput) {
  try {
    const { organizationId } = await requireAuthOrg()

    // 1. Validation
    if (!input.vehicleId?.trim()) {
      throw new Error("Please select a vehicle.")
    }
    if (!input.customerId?.trim()) {
      throw new Error("Customer information is required.")
    }
    if (!input.branchId?.trim()) {
      throw new Error("Please select the servicing branch/workshop.")
    }
    if (!input.serviceType) {
      throw new Error("Please select the Service Type (Free, Paid, or Warranty).")
    }
    if (!input.description?.trim()) {
      throw new Error("Please enter service details / work description.")
    }

    // 2. Multi-tenant checks
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: input.vehicleId, organizationId },
      include: { vehicleModel: true },
    })

    if (!vehicle) {
      throw new Error("Vehicle not found in your dealership records.")
    }

    const customer = await prisma.customer.findFirst({
      where: { id: input.customerId, organizationId },
    })

    if (!customer) {
      throw new Error("Customer not found in your dealership records.")
    }

    const branch = await prisma.branch.findFirst({
      where: { id: input.branchId, organizationId },
    })

    if (!branch) {
      throw new Error("Branch workshop not found.")
    }

    // For Free or Warranty, cost is usually 0 unless paid parts are added
    const cost = input.serviceType === ServiceType.Paid ? Math.max(0, Number(input.totalCost) || 0) : Math.max(0, Number(input.totalCost) || 0)

    const nextDueDate = input.nextServiceDueDate ? new Date(input.nextServiceDueDate) : null

    // 3. Create ServiceRecord
    const record = await prisma.serviceRecord.create({
      data: {
        organizationId,
        branchId: input.branchId,
        vehicleId: input.vehicleId,
        customerId: input.customerId,
        serviceType: input.serviceType,
        description: input.description.trim(),
        totalCost: cost,
        nextServiceDueDate: nextDueDate,
        serviceDate: new Date(),
      },
    })

    revalidatePath("/dashboard/services")
    revalidatePath("/dashboard")

    return {
      success: true,
      message: `Service record logged successfully for ${vehicle.vehicleModel.brand} ${vehicle.vehicleModel.modelName} (VIN: ${vehicle.chassisNumber})!`,
      data: record,
    }
  } catch (error) {
    console.error("createServiceRecord error:", error)
    return {
      success: false,
      error: (error as Error).message || "Failed to log service record.",
    }
  }
}
