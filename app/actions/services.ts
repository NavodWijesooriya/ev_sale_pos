"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getAuthSession } from "@/lib/auth"
import { ServiceType, UserRole, VehicleStatus } from "@prisma/client"
import type { Prisma } from "@prisma/client"

type ServiceRecordWithParts = Prisma.ServiceRecordGetPayload<{
  include: { serviceJob: { include: { parts: true } } }
}>

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

async function requireServiceAccess() {
  const auth = await requireAuthOrg()
  const user = await prisma.user.findFirst({
    where: {
      id: auth.userId,
      organizationId: auth.organizationId,
      isActive: true,
    },
    select: { role: true, branchId: true },
  })
  if (!user || (user.role !== UserRole.OrgAdmin && user.role !== UserRole.Technician)) {
    throw new Error("Forbidden. Service job cards are available to service staff and organization admins only.")
  }
  if (user.role === UserRole.Technician && !user.branchId) {
    throw new Error("Forbidden. A workshop branch must be assigned to your technician account.")
  }
  return {
    organizationId: auth.organizationId,
    user: { id: auth.userId, role: user.role, branchId: user.branchId },
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
  parts?: Array<{ sparePartId: string; quantity: number }>
}

async function restoreCompletedServiceResources(
  tx: Prisma.TransactionClient,
  organizationId: string,
  record: ServiceRecordWithParts,
) {
  if (record.serviceType === ServiceType.Free) {
    const restored = await tx.vehicle.updateMany({
      where: {
        id: record.vehicleId,
        organizationId,
        freeServicesUsed: { gt: 0 },
      },
      data: { freeServicesUsed: { decrement: 1 } },
    })
    if (restored.count !== 1) {
      throw new Error("Unable to restore the vehicle's free-service balance.")
    }
  }

  for (const part of record.serviceJob?.parts ?? []) {
    const restored = await tx.sparePart.updateMany({
      where: { id: part.sparePartId, organizationId },
      data: { stockQuantity: { increment: part.quantity } },
    })
    if (restored.count !== 1) {
      throw new Error("Unable to restore spare-part stock for the service job.")
    }
  }
}

/**
 * Fetch sold vehicles, branches, and registered customers for service booking
 */
export async function getServiceInitialData() {
  try {
    const { organizationId, user } = await requireServiceAccess()

    const branchScope =
      user.role === UserRole.Technician ? { branchId: user.branchId! } : {}

    const [soldVehicles, branches, customers, spareParts] = await Promise.all([
      // Sold vehicles only
      prisma.vehicle.findMany({
        where: {
          organizationId,
          status: VehicleStatus.Sold,
          ...branchScope,
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
        where: { organizationId, ...branchScope },
        orderBy: { name: "asc" },
      }),

      // Customers
      prisma.customer.findMany({
        where: { organizationId },
        orderBy: { name: "asc" },
        take: 100,
      }),

      prisma.sparePart.findMany({
        where: { organizationId, stockQuantity: { gt: 0 } },
        select: { id: true, name: true, sku: true, price: true, stockQuantity: true },
        orderBy: { name: "asc" },
      }),
    ])

    return {
      success: true,
      data: {
        vehicles: soldVehicles,
        branches,
        customers,
        spareParts,
      },
    }
  } catch (error) {
    console.error("getServiceInitialData error:", error)
    return {
      success: false,
      error: (error as Error).message,
      data: { vehicles: [], branches: [], customers: [], spareParts: [] },
    }
  }
}

export async function getVehicleFreeServiceStatus(vehicleId: string) {
  try {
    const { organizationId, user } = await requireServiceAccess()
    if (!vehicleId?.trim()) throw new Error("Select a vehicle to check its free-service balance.")

    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        organizationId,
        status: VehicleStatus.Sold,
        ...(user.role === UserRole.Technician ? { branchId: user.branchId! } : {}),
      },
      select: {
        freeServiceEntitlement: true,
        freeServicesUsed: true,
      },
    })
    if (!vehicle) throw new Error("Vehicle not found in your dealership records.")

    return {
      success: true,
      data: {
        ...vehicle,
        remaining: Math.max(0, vehicle.freeServiceEntitlement - vehicle.freeServicesUsed),
      },
    }
  } catch (error) {
    console.error("getVehicleFreeServiceStatus error:", error)
    return { success: false, error: (error as Error).message }
  }
}

export async function setVehicleFreeServiceEntitlement(
  vehicleId: string,
  entitlement: number,
) {
  try {
    const { organizationId, user } = await requireServiceAccess()
    if (user.role !== UserRole.OrgAdmin) {
      throw new Error("Only organization admins can update free-service entitlements.")
    }
    if (!vehicleId?.trim() || !Number.isInteger(entitlement) || entitlement < 0) {
      throw new Error("Enter a valid non-negative whole-number entitlement.")
    }

    const result = await prisma.vehicle.updateMany({
      where: {
        id: vehicleId,
        organizationId,
        freeServicesUsed: { lte: entitlement },
      },
      data: { freeServiceEntitlement: entitlement },
    })
    if (result.count !== 1) {
      const vehicle = await prisma.vehicle.findFirst({
        where: { id: vehicleId, organizationId },
        select: { freeServicesUsed: true },
      })
      if (!vehicle) throw new Error("Vehicle not found in your dealership records.")
      throw new Error(
        `Entitlement cannot be less than the ${vehicle.freeServicesUsed} free service(s) already used.`,
      )
    }

    revalidatePath("/dashboard/customers")
    revalidatePath("/dashboard/services")
    return { success: true }
  } catch (error) {
    console.error("setVehicleFreeServiceEntitlement error:", error)
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Fetch all service records for the current dealership
 */
export async function getServiceRecords() {
  try {
    const { organizationId, user } = await requireServiceAccess()

    const records = await prisma.serviceRecord.findMany({
      where: {
        organizationId,
        ...(user.role === UserRole.Technician
          ? { branchId: user.branchId! }
          : {}),
      },
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
export async function completeServiceJob(input: CreateServiceRecordInput) {
  try {
    const { organizationId, user } = await requireServiceAccess()

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

    const laborCost = Number(input.totalCost)
    if (!Number.isFinite(laborCost) || laborCost < 0) {
      throw new Error("Service labor cost must be zero or greater.")
    }
    const nextDueDate = input.nextServiceDueDate ? new Date(input.nextServiceDueDate) : null
    if (nextDueDate && Number.isNaN(nextDueDate.getTime())) {
      throw new Error("Enter a valid next service due date.")
    }

    const selectedParts = new Map<string, number>()
    for (const part of input.parts ?? []) {
      if (!part.sparePartId?.trim() || !Number.isInteger(part.quantity) || part.quantity <= 0) {
        throw new Error("Each spare part must have a valid ID and positive whole-number quantity.")
      }
      selectedParts.set(
        part.sparePartId,
        (selectedParts.get(part.sparePartId) ?? 0) + part.quantity,
      )
    }

    const record = await prisma.$transaction(async (tx) => {
      const [vehicle, customer, branch] = await Promise.all([
        tx.vehicle.findFirst({
          where: { id: input.vehicleId, organizationId },
          include: {
            vehicleModel: true,
            saleItems: {
              include: { sale: { select: { customerId: true } } },
              take: 1,
            },
          },
        }),
        tx.customer.findFirst({
          where: { id: input.customerId, organizationId },
        }),
        tx.branch.findFirst({
          where: { id: input.branchId, organizationId },
        }),
      ])
      if (!vehicle) throw new Error("Vehicle not found in your dealership records.")
      if (!customer) throw new Error("Customer not found in your dealership records.")
      if (!branch) throw new Error("Workshop branch not found.")
      if (vehicle.saleItems[0]?.sale.customerId !== customer.id) {
        throw new Error("The selected customer is not the registered owner of this vehicle.")
      }
      if (
        user.role === UserRole.Technician &&
        vehicle.branchId !== user.branchId
      ) {
        throw new Error("Technicians can only service vehicles assigned to their workshop branch.")
      }
      if (user.role === UserRole.Technician && branch.id !== user.branchId) {
        throw new Error("Technicians can only complete service jobs at their assigned branch.")
      }

      if (input.serviceType === ServiceType.Free) {
        const usage = await tx.vehicle.updateMany({
          where: {
            id: vehicle.id,
            organizationId,
            freeServicesUsed: { lt: vehicle.freeServiceEntitlement },
          },
          data: { freeServicesUsed: { increment: 1 } },
        })
        if (usage.count !== 1) {
          throw new Error("No free maintenance services remain for this vehicle.")
        }
      }

      const partIds = [...selectedParts.keys()]
      const spareParts = partIds.length
        ? await tx.sparePart.findMany({
            where: { organizationId, id: { in: partIds } },
            select: { id: true, name: true, price: true, stockQuantity: true },
            orderBy: { id: "asc" },
          })
        : []
      if (spareParts.length !== partIds.length) {
        throw new Error("One or more selected spare parts are unavailable.")
      }

      const partCost = spareParts.reduce((sum, part) => {
        return sum + part.price * (selectedParts.get(part.id) ?? 0)
      }, 0)
      const totalCost = laborCost + partCost

      for (const part of spareParts) {
        const quantity = selectedParts.get(part.id)!
        const updated = await tx.sparePart.updateMany({
          where: {
            id: part.id,
            organizationId,
            stockQuantity: { gte: quantity },
          },
          data: { stockQuantity: { decrement: quantity } },
        })
        if (updated.count !== 1) {
          throw new Error(`Insufficient stock for "${part.name}". Refresh inventory and try again.`)
        }
      }

      const serviceRecord = await tx.serviceRecord.create({
        data: {
          organizationId,
          branchId: input.branchId,
          vehicleId: input.vehicleId,
          customerId: input.customerId,
          serviceType: input.serviceType,
          description: input.description.trim(),
          totalCost,
          nextServiceDueDate: nextDueDate,
          serviceDate: new Date(),
          status: "COMPLETED",
        },
      })

      await tx.serviceJob.create({
        data: {
          organizationId,
          serviceRecordId: serviceRecord.id,
          status: "COMPLETED",
          partsCost: partCost,
          totalCost,
          parts: {
            create: spareParts.map((part) => {
              const quantity = selectedParts.get(part.id)!
              return {
                sparePartId: part.id,
                quantity,
                unitPrice: part.price,
                totalPrice: part.price * quantity,
              }
            }),
          },
        },
      })

      return { ...serviceRecord, vehicleModelName: `${vehicle.vehicleModel.brand} ${vehicle.vehicleModel.modelName}`, chassisNumber: vehicle.chassisNumber }
    }, {
      maxWait: 5000,
      timeout: 20000,
    })

    revalidatePath("/dashboard/services")
    revalidatePath("/dashboard/services/spare-parts")
    revalidatePath("/dashboard")

    return {
      success: true,
      message: `Service job completed for ${record.vehicleModelName} (VIN: ${record.chassisNumber}). Spare-part stock and service total were updated.`,
      data: record,
    }
  } catch (error) {
    console.error("completeServiceJob error:", error)
    return {
      success: false,
      error: (error as Error).message || "Failed to log service record.",
    }
  }
}

export async function voidServiceJob(serviceRecordId: string) {
  try {
    const { organizationId, user } = await requireServiceAccess()
    if (user.role !== UserRole.OrgAdmin) {
      throw new Error("Only organization admins can void completed service jobs.")
    }
    if (!serviceRecordId?.trim()) throw new Error("Service job ID is required.")

    await prisma.$transaction(async (tx) => {
      const record = await tx.serviceRecord.findFirst({
        where: { id: serviceRecordId, organizationId },
        include: { serviceJob: { include: { parts: true } } },
      })
      if (!record) throw new Error("Service job not found.")
      if (record.status !== "COMPLETED") {
        throw new Error("Only completed service jobs can be voided.")
      }

      const updated = await tx.serviceRecord.updateMany({
        where: { id: record.id, organizationId, status: "COMPLETED" },
        data: { status: "VOIDED" },
      })
      if (updated.count !== 1) {
        throw new Error("This service job has already been updated.")
      }

      await restoreCompletedServiceResources(tx, organizationId, record)
      if (record.serviceJob) {
        await tx.serviceJob.update({
          where: { id: record.serviceJob.id },
          data: { status: "VOIDED" },
        })
      }
    }, { maxWait: 5000, timeout: 20000 })

    revalidatePath("/dashboard/services")
    revalidatePath("/dashboard/customers")
    revalidatePath(`/dashboard/services/${serviceRecordId}/job-card`)
    return { success: true, message: "Service job voided and its free-service balance restored." }
  } catch (error) {
    console.error("voidServiceJob error:", error)
    return { success: false, error: (error as Error).message }
  }
}

export async function deleteServiceJob(serviceRecordId: string) {
  try {
    const { organizationId, user } = await requireServiceAccess()
    if (user.role !== UserRole.OrgAdmin) {
      throw new Error("Only organization admins can delete service jobs.")
    }
    if (!serviceRecordId?.trim()) throw new Error("Service job ID is required.")

    await prisma.$transaction(async (tx) => {
      const record = await tx.serviceRecord.findFirst({
        where: { id: serviceRecordId, organizationId },
        include: { serviceJob: { include: { parts: true } } },
      })
      if (!record) throw new Error("Service job not found.")
      if (record.status === "COMPLETED") {
        const updated = await tx.serviceRecord.updateMany({
          where: { id: record.id, organizationId, status: "COMPLETED" },
          data: { status: "VOIDED" },
        })
        if (updated.count !== 1) {
          throw new Error("This service job has already been updated.")
        }
        await restoreCompletedServiceResources(tx, organizationId, record)
      } else if (record.status !== "VOIDED") {
        throw new Error("Only completed or voided service jobs can be deleted.")
      }

      await tx.serviceRecord.delete({
        where: { id: record.id },
      })
    }, { maxWait: 5000, timeout: 20000 })

    revalidatePath("/dashboard/services")
    revalidatePath("/dashboard/customers")
    return { success: true, message: "Service job deleted." }
  } catch (error) {
    console.error("deleteServiceJob error:", error)
    return { success: false, error: (error as Error).message }
  }
}

export async function createServiceRecord(input: CreateServiceRecordInput) {
  return completeServiceJob(input)
}
