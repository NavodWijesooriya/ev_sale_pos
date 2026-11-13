"use server"

import { AdvancePaymentStatus, VehicleStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { getAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  createAdvancePaymentSchema,
  type CreateAdvancePaymentInput,
  refundAdvancePaymentSchema,
  type RefundAdvancePaymentInput,
  transferAdvancePaymentSchema,
  type TransferAdvancePaymentInput,
} from "@/lib/validations/advance-payment"

async function requireOrganizationUser() {
  const session = await getAuthSession()
  const organizationId = session?.user?.organizationId
  const userId = session?.user?.id

  if (!organizationId || !userId) {
    throw new Error("Unauthorized. Please log in to your dealership portal.")
  }

  return { organizationId, userId }
}

export interface AdvancePaymentRecord {
  id: string
  customerId: string
  customerName: string
  nicNumber: string
  bikeModel: string
  vehicleId?: string | null
  chassisNumber?: string | null
  amount: number
  advanceDate: string
  createdAt?: string
  paymentMethod?: string | null
  notes?: string | null
  branchId: string
  paymentDetails: string
  status: AdvancePaymentStatus
}

export interface AdvanceRefundRecord {
  id: string
  customerName: string
  nicNumber: string
  amount: number
  advanceDate: string
  refundDate: string | null
  paymentMethod: string | null
  notes: string
}

export interface AdvancePaymentCustomerOption {
  id: string
  name: string
  nic: string | null
}

export interface AdvancePaymentBranchOption {
  id: string
  name: string
}

export interface PendingAdvanceTransferRecord {
  id: string
  customerId: string
  customerName: string
  nicNumber: string
  bikeModel: string
  amount: number
  advanceDate: string
}

export interface AdvanceTransferCustomerOption {
  id: string
  name: string
  nic: string | null
}

export interface AdvanceTransferVehicleOption {
  id: string
  chassisNumber: string
  color: string | null
  vehicleModel: {
    brand: string
    modelName: string
  }
}

export async function getAdvanceTransferOptions(): Promise<{
  customers: AdvanceTransferCustomerOption[]
  vehicles: AdvanceTransferVehicleOption[]
}> {
  const { organizationId } = await requireOrganizationUser()
  const [customers, vehicles] = await Promise.all([
    prisma.customer.findMany({
      where: { organizationId },
      select: { id: true, name: true, nic: true },
      orderBy: { name: "asc" },
    }),
    prisma.vehicle.findMany({
      where: { organizationId, status: VehicleStatus.AVAILABLE },
      select: {
        id: true,
        chassisNumber: true,
        color: true,
        vehicleModel: {
          select: { brand: true, modelName: true },
        },
      },
      orderBy: { chassisNumber: "asc" },
    }),
  ])

  return { customers, vehicles }
}

export async function transferAdvancePayment(
  id: string,
  input: TransferAdvancePaymentInput,
): Promise<{ success: true; newAdvanceId: string } | { success: false; error: string }> {
  const { organizationId } = await requireOrganizationUser()
  const advanceId = typeof id === "string" ? id.trim() : ""
  if (!advanceId) {
    return { success: false, error: "Select a valid advance payment." }
  }

  const parsedInput = transferAdvancePaymentSchema.safeParse(input)
  if (!parsedInput.success) {
    return {
      success: false,
      error: parsedInput.error.issues[0]?.message ?? "Select a valid transfer destination.",
    }
  }

  try {
    const newAdvanceId = await prisma.$transaction(async (tx) => {
      const sourceAdvance = await tx.advancePayment.findFirst({
        where: {
          id: advanceId,
          organizationId,
          status: AdvancePaymentStatus.PENDING,
          sale: null,
        },
        select: {
          id: true,
          customerId: true,
          nicNumber: true,
          bikeModel: true,
          amount: true,
          advanceDate: true,
          branchId: true,
          staffId: true,
          paymentDetails: true,
        },
      })
      if (!sourceAdvance) {
        throw new Error("This advance is no longer available for transfer.")
      }

      const [targetCustomer, targetVehicle] = await Promise.all([
        tx.customer.findFirst({
          where: { id: parsedInput.data.targetCustomerId, organizationId },
          select: { id: true, nic: true },
        }),
        tx.vehicle.findFirst({
          where: {
            id: parsedInput.data.targetVehicleId,
            organizationId,
            status: VehicleStatus.AVAILABLE,
          },
          select: {
            chassisNumber: true,
            vehicleModel: {
              select: { brand: true, modelName: true },
            },
          },
        }),
      ])
      if (!targetCustomer) throw new Error("The selected customer could not be found.")
      if (!targetVehicle) throw new Error("The selected vehicle is no longer available.")

      const targetBikeModel =
        `${targetVehicle.vehicleModel.brand} ${targetVehicle.vehicleModel.modelName} · ${targetVehicle.chassisNumber}`.trim()
      if (
        targetCustomer.id === sourceAdvance.customerId &&
        targetBikeModel.toLocaleLowerCase() === sourceAdvance.bikeModel.trim().toLocaleLowerCase()
      ) {
        throw new Error("Choose a different customer or vehicle for the transfer.")
      }

      const updatedSource = await tx.advancePayment.updateMany({
        where: {
          id: sourceAdvance.id,
          organizationId,
          status: AdvancePaymentStatus.PENDING,
          sale: null,
        },
        data: { status: AdvancePaymentStatus.TRANSFERRED },
      })
      if (updatedSource.count !== 1) {
        throw new Error("This advance was just updated. Refresh and try again.")
      }

      const destinationAdvance = await tx.advancePayment.create({
        data: {
          organizationId,
          customerId: targetCustomer.id,
          nicNumber: targetCustomer.nic ?? sourceAdvance.nicNumber,
          bikeModel: targetBikeModel,
          amount: sourceAdvance.amount,
          advanceDate: sourceAdvance.advanceDate,
          branchId: sourceAdvance.branchId,
          staffId: sourceAdvance.staffId,
          paymentDetails: sourceAdvance.paymentDetails,
          status: AdvancePaymentStatus.PENDING,
        },
        select: { id: true },
      })

      await tx.advanceTransfer.create({
        data: {
          fromAdvanceId: sourceAdvance.id,
          toCustomerId: targetCustomer.id,
          transferAmount: sourceAdvance.amount,
        },
      })

      return destinationAdvance.id
    })

    revalidatePath("/dashboard/sales/advances")
    revalidatePath("/dashboard/sales/advances/reports")
    revalidatePath("/dashboard/sales/advances/transfers")
    return { success: true, newAdvanceId }
  } catch (error) {
    console.error("transferAdvancePayment error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to transfer this advance.",
    }
  }
}

export async function getAdvancePayments(): Promise<AdvancePaymentRecord[]> {
  const { organizationId } = await requireOrganizationUser()
  const advances = await prisma.advancePayment.findMany({
    where: { organizationId },
    include: {
      customer: { select: { name: true } },
      vehicle: { select: { chassisNumber: true } },
    },
    orderBy: [{ advanceDate: "desc" }, { id: "desc" }],
  })

  return advances.map((advance: any) => ({
    id: advance.id,
    customerId: advance.customerId,
    customerName: advance.customer?.name || "Unknown Customer",
    nicNumber: advance.nicNumber,
    bikeModel: advance.bikeModel,
    vehicleId: advance.vehicleId || null,
    chassisNumber: advance.vehicle?.chassisNumber || null,
    amount: advance.amount,
    advanceDate: advance.advanceDate.toISOString(),
    createdAt: advance.createdAt ? advance.createdAt.toISOString() : advance.advanceDate.toISOString(),
    paymentMethod: advance.paymentMethod || null,
    notes: advance.notes || null,
    branchId: advance.branchId,
    paymentDetails: advance.paymentDetails,
    status: advance.status,
  }))
}

export async function getRefundedAdvancePayments(): Promise<AdvanceRefundRecord[]> {
  const { organizationId } = await requireOrganizationUser()
  const refundedAdvances = await prisma.advancePayment.findMany({
    where: {
      organizationId,
      status: AdvancePaymentStatus.REFUNDED,
    },
    include: {
      customer: { select: { name: true } },
      refunds: {
        orderBy: { refundDate: "desc" },
        select: {
          id: true,
          refundDate: true,
          refundAmount: true,
          paymentMethod: true,
        },
      },
    },
    orderBy: [{ advanceDate: "desc" }, { id: "desc" }],
  })

  const refundRecords: AdvanceRefundRecord[] = []
  for (const advance of refundedAdvances) {
    if (advance.refunds.length === 0) {
      refundRecords.push({
        id: advance.id,
        customerName: advance.customer.name,
        nicNumber: advance.nicNumber,
        amount: advance.amount,
        advanceDate: advance.advanceDate.toISOString(),
        refundDate: null,
        paymentMethod: null,
        notes: advance.paymentDetails,
      })
      continue
    }

    for (const refund of advance.refunds) {
      refundRecords.push({
        id: refund.id,
        customerName: advance.customer.name,
        nicNumber: advance.nicNumber,
        amount: refund.refundAmount,
        advanceDate: advance.advanceDate.toISOString(),
        refundDate: refund.refundDate.toISOString(),
        paymentMethod: refund.paymentMethod,
        notes: advance.paymentDetails,
      })
    }
  }

  return refundRecords
}

export async function getAdvancePaymentFormOptions(): Promise<{
  customers: AdvancePaymentCustomerOption[]
  branches: AdvancePaymentBranchOption[]
}> {
  const { organizationId } = await requireOrganizationUser()
  const [customers, branches] = await Promise.all([
    prisma.customer.findMany({
      where: { organizationId },
      select: { id: true, name: true, nic: true },
      orderBy: { name: "asc" },
    }),
    prisma.branch.findMany({
      where: { organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  return { customers, branches }
}

export async function createAdvancePayment(
  input: CreateAdvancePaymentInput,
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const session = await getAuthSession()
  const organizationId = session?.user?.organizationId
  const userId = session?.user?.id

  if (!organizationId || !userId) {
    return { success: false, error: "Unauthorized. Please log in to your dealership portal." }
  }

  const parsedInput = createAdvancePaymentSchema.safeParse(input)
  if (!parsedInput.success) {
    return { success: false, error: parsedInput.error.issues[0]?.message ?? "Invalid advance payment details." }
  }

  const data = parsedInput.data
  const [customer, branch, staff] = await Promise.all([
    prisma.customer.findFirst({
      where: { id: data.customerId, organizationId },
      select: { id: true },
    }),
    prisma.branch.findFirst({
      where: { id: data.branchId, organizationId },
      select: { id: true },
    }),
    prisma.user.findFirst({
      where: { id: userId, organizationId, isActive: true },
      select: { id: true },
    }),
  ])

  if (!customer) {
    return { success: false, error: "The selected customer could not be found." }
  }
  if (!branch) {
    return { success: false, error: "The selected showroom could not be found." }
  }
  if (!staff) {
    return { success: false, error: "Your active dealership account could not be verified." }
  }

  let advancePaymentId: string
  try {
    const advance = await prisma.advancePayment.create({
      data: {
        organizationId,
        customerId: customer.id,
        nicNumber: data.nicNumber,
        bikeModel: data.bikeModel,
        amount: data.amount,
        advanceDate: new Date(`${data.advanceDate}T00:00:00.000Z`),
        branchId: branch.id,
        staffId: staff.id,
        paymentDetails: data.paymentDetails,
        status: AdvancePaymentStatus.PENDING,
      },
      select: { id: true },
    })
    advancePaymentId = advance.id
  } catch (error) {
    console.error("createAdvancePayment error:", error)
    return { success: false, error: "Unable to create the advance payment. Please try again." }
  }

  revalidatePath("/dashboard/sales/advances")
  revalidatePath("/dashboard/sales")
  return { success: true, id: advancePaymentId }
}

export async function updateAdvancePayment(
  id: string,
  input: CreateAdvancePaymentInput,
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await getAuthSession()
  const organizationId = session?.user?.organizationId
  if (!organizationId) {
    return { success: false, error: "Unauthorized. Please log in to your dealership portal." }
  }

  const advanceId = typeof id === "string" ? id.trim() : ""
  if (!advanceId) {
    return { success: false, error: "Select a valid advance payment." }
  }

  const parsedInput = createAdvancePaymentSchema.safeParse(input)
  if (!parsedInput.success) {
    return { success: false, error: parsedInput.error.issues[0]?.message ?? "Invalid advance payment details." }
  }

  const data = parsedInput.data
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const advance = await tx.advancePayment.findFirst({
        where: { id: advanceId, organizationId, status: AdvancePaymentStatus.PENDING },
        select: { id: true, sale: { select: { id: true } } },
      })
      if (!advance || advance.sale) return false

      const [customer, branch] = await Promise.all([
        tx.customer.findFirst({
          where: { id: data.customerId, organizationId },
          select: { id: true },
        }),
        tx.branch.findFirst({
          where: { id: data.branchId, organizationId },
          select: { id: true },
        }),
      ])
      if (!customer || !branch) return false

      const result = await tx.advancePayment.updateMany({
        where: { id: advanceId, organizationId, status: AdvancePaymentStatus.PENDING },
        data: {
          customerId: customer.id,
          nicNumber: data.nicNumber,
          bikeModel: data.bikeModel,
          amount: data.amount,
          advanceDate: new Date(`${data.advanceDate}T00:00:00.000Z`),
          branchId: branch.id,
          paymentDetails: data.paymentDetails,
        },
      })
      return result.count === 1
    })

    if (!updated) {
      return {
        success: false,
        error: "This pending advance could not be updated. It may have already been used or refunded.",
      }
    }

    revalidatePath("/dashboard/sales/advances")
    return { success: true }
  } catch (error) {
    console.error("updateAdvancePayment error:", error)
    return { success: false, error: "Unable to update the advance payment. Please try again." }
  }
}

export async function refundAdvancePayment(
  id: string,
  input: RefundAdvancePaymentInput,
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await getAuthSession()
  const organizationId = session?.user?.organizationId
  if (!organizationId) {
    return { success: false, error: "Unauthorized. Please log in to your dealership portal." }
  }

  const advanceId = typeof id === "string" ? id.trim() : ""
  if (!advanceId) {
    return { success: false, error: "Select a valid advance payment." }
  }

  const parsedInput = refundAdvancePaymentSchema.safeParse(input)
  if (!parsedInput.success) {
    return { success: false, error: parsedInput.error.issues[0]?.message ?? "Select a valid refund payment method." }
  }

  try {
    const refunded = await prisma.$transaction(async (tx) => {
      const advance = await tx.advancePayment.findFirst({
        where: { id: advanceId, organizationId, status: AdvancePaymentStatus.PENDING },
        select: { id: true, amount: true, sale: { select: { id: true } } },
      })
      if (!advance || advance.sale) return false

      const updated = await tx.advancePayment.updateMany({
        where: { id: advanceId, organizationId, status: AdvancePaymentStatus.PENDING },
        data: { status: AdvancePaymentStatus.REFUNDED },
      })
      if (updated.count !== 1) return false

      await tx.advanceRefund.create({
        data: {
          advanceId: advance.id,
          refundAmount: advance.amount,
          paymentMethod: parsedInput.data.paymentMethod,
          status: "COMPLETED",
        },
      })
      return true
    })

    if (!refunded) {
      return {
        success: false,
        error: "This advance cannot be refunded because it is no longer pending.",
      }
    }

    revalidatePath("/dashboard/sales/advances")
    return { success: true }
  } catch (error) {
    console.error("refundAdvancePayment error:", error)
    return { success: false, error: "Unable to refund the advance payment. Please try again." }
  }
}

export interface AvailableVehicleOption {
  id: string
  chassisNumber: string
  unitGrnNumber?: string | null
  color: string | null
  purchasePrice: number
  motorNumber?: string | null
  batterySerialNumber?: string | null
  branchId: string
  branchName: string
  vehicleModel: {
    id: string
    brand: string
    modelName: string
    defaultPrice: number
  }
}

export async function getAvailableVehicles(): Promise<AvailableVehicleOption[]> {
  const { organizationId } = await requireOrganizationUser()

  const vehicles = await prisma.vehicle.findMany({
    where: {
      organizationId,
      status: { in: [VehicleStatus.AVAILABLE, VehicleStatus.InStock] },
    },
    include: {
      vehicleModel: {
        select: {
          id: true,
          brand: true,
          modelName: true,
          defaultPrice: true,
        },
      },
      branch: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return vehicles.map((v) => ({
    id: v.id,
    chassisNumber: v.chassisNumber,
    unitGrnNumber: v.unitGrnNumber,
    color: v.color,
    purchasePrice: v.purchasePrice,
    motorNumber: v.motorNumber,
    batterySerialNumber: v.batterySerialNumber,
    branchId: v.branchId,
    branchName: v.branch.name,
    vehicleModel: {
      id: v.vehicleModel.id,
      brand: v.vehicleModel.brand,
      modelName: v.vehicleModel.modelName,
      defaultPrice: v.vehicleModel.defaultPrice,
    },
  }))
}

export async function getCustomers() {
  const { organizationId } = await requireOrganizationUser()

  return prisma.customer.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      phone: true,
      nic: true,
      customerType: true,
    },
    orderBy: { name: "asc" },
  })
}

export interface RecordAdvancePaymentInput {
  customerId: string
  vehicleId?: string | null
  amount: number
  paymentMethod: string
  notes?: string | null
  branchId?: string | null
}

export async function recordAdvancePayment(data: RecordAdvancePaymentInput) {
  try {
    const { organizationId, userId } = await requireOrganizationUser()

    const customerId = data.customerId?.trim()
    if (!customerId) {
      return { success: false, error: "Please select a customer." }
    }

    if (!data.amount || data.amount <= 0) {
      return { success: false, error: "Advance amount must be greater than zero." }
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, organizationId },
      select: { id: true, name: true, nic: true },
    })

    if (!customer) {
      return { success: false, error: "Customer not found." }
    }

    let bikeModel = "General Advance"
    let selectedBranchId = data.branchId || null
    let vehicleId = data.vehicleId?.trim() || null

    if (vehicleId) {
      const vehicle = await prisma.vehicle.findFirst({
        where: { id: vehicleId, organizationId },
        include: { vehicleModel: true },
      })
      if (vehicle) {
        bikeModel = `${vehicle.vehicleModel.brand} ${vehicle.vehicleModel.modelName}`
        if (!selectedBranchId) {
          selectedBranchId = vehicle.branchId
        }
      } else {
        vehicleId = null
      }
    }

    if (!selectedBranchId) {
      const defaultBranch = await prisma.branch.findFirst({
        where: { organizationId },
        select: { id: true },
      })
      if (!defaultBranch) {
        return { success: false, error: "No branch found in this dealership organization." }
      }
      selectedBranchId = defaultBranch.id
    }

    const paymentMethod = data.paymentMethod?.trim() || "Cash"
    const notes = data.notes?.trim() || null

    const advance = await (prisma.advancePayment as any).create({
      data: {
        organizationId,
        customerId: customer.id,
        vehicleId: vehicleId || null,
        nicNumber: customer.nic || "N/A",
        bikeModel,
        amount: Number(data.amount),
        paymentMethod,
        paymentDetails: notes ? `${paymentMethod} - ${notes}` : paymentMethod,
        notes,
        branchId: selectedBranchId,
        staffId: userId,
        status: AdvancePaymentStatus.PENDING,
      },
    })

    revalidatePath("/dashboard/sales/advances")
    revalidatePath("/dashboard/sales/new")

    return {
      success: true,
      advanceId: advance.id,
    }
  } catch (error) {
    console.error("recordAdvancePayment error:", error)
    return {
      success: false,
      error: (error as Error).message || "Failed to record advance payment.",
    }
  }
}