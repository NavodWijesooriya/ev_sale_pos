"use server"

import { AdvancePaymentStatus, VehicleStatus } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { getAuthSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { recordAudit } from "@/lib/audit"
import { nicEquals } from "@/lib/nic"
import { normalizeTin, optionalTinSchema } from "@/lib/validations/tin"
import { branchFilter, hasPermission } from "@/lib/permissions"
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
  if (!hasPermission(session.user, "CREATE_SALE")) {
    throw new Error("You do not have permission to manage customer advances.")
  }

  return { organizationId, userId, user: session.user }
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export interface AdvancePaymentRecord {
  id: string
  customerId: string
  customerName: string
  nicNumber: string
  tinNumber?: string | null
  bikeModel: string
  vehicleId?: string | null
  chassisNumber?: string | null
  /** Bike model booked without a specific bike in stock (the bike is linked when the sale is made). */
  vehicleModelId?: string | null
  /** Staff member who recorded the advance. */
  staffId: string
  staffName: string
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
  /** Staff member who recorded the original advance. */
  staffName: string
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

export interface AdvanceVehicleModelOption {
  id: string
  brand: string
  modelName: string
  defaultPrice: number
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
  unitGrnNumber?: string | null
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
        unitGrnNumber: true,
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
): Promise<
  { success: true; newAdvanceId: string; transferred: number; remaining: number } | { success: false; error: string }
> {
  let auth: Awaited<ReturnType<typeof requireOrganizationUser>>
  try {
    auth = await requireOrganizationUser()
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Not allowed." }
  }
  const { organizationId, userId, user } = auth
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
    const result = await prisma.$transaction(async (tx) => {
      // Row lock: two transfers (or a transfer and a sale) on the same advance run one after the other,
      // so the balance can never be spent twice.
      await tx.$queryRaw`SELECT id FROM "AdvancePayment" WHERE id = ${advanceId} AND "organizationId" = ${organizationId} FOR UPDATE`

      const sourceAdvance = await tx.advancePayment.findFirst({
        where: {
          id: advanceId,
          organizationId,
          status: AdvancePaymentStatus.PENDING,
          sale: null,
          ...branchFilter(user),
        },
        select: {
          id: true,
          customerId: true,
          vehicleId: true,
          nicNumber: true,
          tinNumber: true,
          bikeModel: true,
          amount: true,
          advanceDate: true,
          branchId: true,
          staffId: true,
          paymentMethod: true,
          paymentDetails: true,
          notes: true,
          customer: { select: { name: true } },
        },
      })
      if (!sourceAdvance) {
        throw new Error("This advance is no longer available for transfer.")
      }

      // Partial or full: no amount means the whole remaining balance.
      const amount = round2(parsedInput.data.transferAmount ?? sourceAdvance.amount)
      if (!(amount > 0)) throw new Error("Enter an amount above zero.")
      if (amount > sourceAdvance.amount + 0.005) {
        throw new Error(
          `You can transfer at most ${sourceAdvance.amount.toFixed(2)} (the available balance of this advance).`,
        )
      }
      const isFull = amount >= sourceAdvance.amount - 0.005

      const targetCustomer = await tx.customer.findFirst({
        where: { id: parsedInput.data.targetCustomerId, organizationId },
        select: { id: true, name: true, nic: true },
      })
      if (!targetCustomer) throw new Error("The selected customer could not be found.")

      const targetVehicleId = parsedInput.data.targetVehicleId?.trim() || null
      let targetVehicle: {
        id: string
        chassisNumber: string
        unitGrnNumber: string | null
        vehicleModel: { brand: string; modelName: string }
      } | null = null
      if (targetVehicleId) {
        targetVehicle = await tx.vehicle.findFirst({
          where: {
            id: targetVehicleId,
            organizationId,
            status: VehicleStatus.AVAILABLE,
          },
          select: {
            id: true,
            chassisNumber: true,
            unitGrnNumber: true,
            vehicleModel: {
              select: { brand: true, modelName: true },
            },
          },
        })
        if (!targetVehicle) throw new Error("The selected vehicle is no longer available.")
      }

      const targetBikeModel = targetVehicle
        ? `${targetVehicle.vehicleModel.brand} ${targetVehicle.vehicleModel.modelName} · ${targetVehicle.unitGrnNumber || targetVehicle.chassisNumber}`.trim()
        : sourceAdvance.bikeModel

      const isSameCustomer = targetCustomer.id === sourceAdvance.customerId
      const isSameVehicle = targetVehicle ? targetVehicle.id === sourceAdvance.vehicleId : !sourceAdvance.vehicleId

      if (isSameCustomer && isSameVehicle) {
        throw new Error("Choose a different customer or vehicle for the transfer.")
      }

      // Moving money to another customer needs the NIC of both people (same check as Transfer by NIC).
      // Enforced here, not only in the screens: a missing or wrong NIC stops the transfer.
      if (!isSameCustomer) {
        if (!nicEquals(sourceAdvance.nicNumber, parsedInput.data.sourceNic)) {
          throw new Error(
            `Enter the advance holder's full NIC (${sourceAdvance.customer.name}) to verify the transfer. A part of the NIC is not enough.`,
          )
        }
        if (!targetCustomer.nic) {
          throw new Error(
            `${targetCustomer.name} has no NIC on file, so the transfer cannot be verified. Add the customer's NIC first.`,
          )
        }
        if (!nicEquals(targetCustomer.nic, parsedInput.data.targetNic)) {
          throw new Error(
            `Enter the receiving customer's full NIC (${targetCustomer.name}) to verify the transfer. A part of the NIC is not enough.`,
          )
        }
      }

      const transferNote = parsedInput.data.transferNote?.trim() || ""
      const movedNote = `${isFull ? "Transferred" : `Partly transferred (${amount.toFixed(2)})`} to ${targetCustomer.name}${
        targetVehicle ? ` (Vehicle: ${targetVehicle.chassisNumber})` : ""
      }: ${transferNote || "Balance reallocated"}`
      const sourceNotes = sourceAdvance.notes ? `${sourceAdvance.notes} | ${movedNote}` : movedNote
      const remaining = isFull ? 0 : round2(sourceAdvance.amount - amount)

      // Compare-and-set debit: succeeds only if the balance is still exactly what we read.
      const debited = await tx.advancePayment.updateMany({
        where: {
          id: sourceAdvance.id,
          organizationId,
          status: AdvancePaymentStatus.PENDING,
          sale: null,
          amount: sourceAdvance.amount,
        },
        data: isFull
          ? { status: AdvancePaymentStatus.TRANSFERRED, notes: sourceNotes }
          : { amount: remaining, notes: sourceNotes },
      })
      if (debited.count !== 1) {
        throw new Error("This advance was just updated. Refresh and try again.")
      }

      const destNotes = transferNote
        ? `Transferred from Advance #${sourceAdvance.id.slice(0, 8)} (${sourceAdvance.nicNumber}): ${transferNote}`
        : `Transferred from Advance #${sourceAdvance.id.slice(0, 8)} (${sourceAdvance.nicNumber})`

      const destinationAdvance = await tx.advancePayment.create({
        data: {
          organizationId,
          customerId: targetCustomer.id,
          vehicleId: targetVehicle ? targetVehicle.id : null,
          nicNumber: targetCustomer.nic ?? sourceAdvance.nicNumber,
          // A TIN belongs to the person who gave it: it only follows the advance when the customer stays the same.
          tinNumber: isSameCustomer ? sourceAdvance.tinNumber : null,
          bikeModel: targetBikeModel,
          amount,
          advanceDate: sourceAdvance.advanceDate,
          branchId: sourceAdvance.branchId,
          staffId: sourceAdvance.staffId,
          paymentMethod: sourceAdvance.paymentMethod || "Cash",
          paymentDetails: sourceAdvance.paymentDetails,
          notes: destNotes,
          status: AdvancePaymentStatus.PENDING,
        },
        select: { id: true },
      })

      await tx.advanceTransfer.create({
        data: {
          fromAdvanceId: sourceAdvance.id,
          toCustomerId: targetCustomer.id,
          toAdvanceId: destinationAdvance.id,
          transferAmount: amount,
          note: transferNote || null,
          fromCustomerId: sourceAdvance.customerId,
          createdById: userId,
          createdByName: user.name,
        },
      })

      await recordAudit(
        tx,
        { id: userId, name: user.name, organizationId, branchId: user.branchId },
        {
          action: "ADVANCE_TRANSFERRED",
          entityType: "AdvancePayment",
          entityId: sourceAdvance.id,
          branchId: sourceAdvance.branchId,
          description: `Transferred ${amount.toFixed(2)} from ${sourceAdvance.customer.name} (${sourceAdvance.nicNumber}) to ${targetCustomer.name} (${targetCustomer.nic ?? "no NIC"}); ${remaining.toFixed(2)} left on the source advance`,
        },
      )

      return { newAdvanceId: destinationAdvance.id, transferred: amount, remaining }
    })

    revalidatePath("/dashboard/sales/advances")
    revalidatePath("/dashboard/sales/advances/reports")
    revalidatePath("/dashboard/sales/advances/transfers")
    revalidatePath("/dashboard/reports")
    return { success: true, ...result }
  } catch (error) {
    console.error("transferAdvancePayment error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to transfer this advance.",
    }
  }
}

export interface NicAdvanceMatch {
  id: string
  name: string
  nic: string | null
  phone: string
  /** Pending advances that are not yet used by a sale. */
  availableBalance: number
  advances: Array<{ id: string; amount: number; advanceDate: string; bikeModel: string }>
}

/** Finds customers by (part of) their NIC with the unallocated advance balance each one holds. */
export async function searchAdvanceBalancesByNic(nic: string): Promise<NicAdvanceMatch[]> {
  const { organizationId, user } = await requireOrganizationUser()
  const term = typeof nic === "string" ? nic.trim() : ""
  if (term.length < 4) return []

  const customers = await prisma.customer.findMany({
    where: { organizationId, nic: { contains: term, mode: "insensitive" } },
    select: {
      id: true,
      name: true,
      nic: true,
      phone: true,
      advancePayments: {
        where: { status: AdvancePaymentStatus.PENDING, sale: null, ...branchFilter(user) },
        select: { id: true, amount: true, advanceDate: true, bikeModel: true },
        orderBy: { advanceDate: "asc" },
      },
    },
    orderBy: { name: "asc" },
    take: 10,
  })

  return customers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    nic: customer.nic,
    phone: customer.phone,
    availableBalance: round2(customer.advancePayments.reduce((sum, a) => sum + a.amount, 0)),
    advances: customer.advancePayments.map((a) => ({
      id: a.id,
      amount: a.amount,
      advanceDate: a.advanceDate.toISOString(),
      bikeModel: a.bikeModel,
    })),
  }))
}

export interface AdvanceTransferHistoryRow {
  id: string
  transferDate: string
  fromCustomer: string
  fromNic: string
  toCustomer: string
  toNic: string | null
  amount: number
  note: string | null
  transferredBy: string | null
}

/** Every advance transfer, newest first. Branch-assigned staff only see their own branch's transfers. */
export async function getAdvanceTransferHistory(): Promise<AdvanceTransferHistoryRow[]> {
  const { organizationId, user } = await requireOrganizationUser()
  const rows = await prisma.advanceTransfer.findMany({
    where: { fromAdvance: { organizationId, ...branchFilter(user) } },
    include: {
      fromAdvance: { select: { nicNumber: true, customer: { select: { name: true } } } },
      toCustomer: { select: { name: true, nic: true } },
    },
    orderBy: { transferDate: "desc" },
    take: 200,
  })
  return rows.map((row) => ({
    id: row.id,
    transferDate: row.transferDate.toISOString(),
    fromCustomer: row.fromAdvance.customer.name,
    fromNic: row.fromAdvance.nicNumber,
    toCustomer: row.toCustomer.name,
    toNic: row.toCustomer.nic,
    amount: row.transferAmount,
    note: row.note,
    transferredBy: row.createdByName,
  }))
}

export async function getAdvancePayments(): Promise<AdvancePaymentRecord[]> {
  const { organizationId } = await requireOrganizationUser()
  const advances = await prisma.advancePayment.findMany({
    where: { organizationId },
    include: {
      customer: { select: { name: true } },
      vehicle: { select: { chassisNumber: true } },
      staff: { select: { name: true } },
    },
    orderBy: [{ advanceDate: "desc" }, { id: "desc" }],
  })

  return advances.map((advance: any) => ({
    id: advance.id,
    customerId: advance.customerId,
    customerName: advance.customer?.name || "Unknown Customer",
    nicNumber: advance.nicNumber,
    tinNumber: advance.tinNumber || null,
    bikeModel: advance.bikeModel,
    vehicleId: advance.vehicleId || null,
    chassisNumber: advance.vehicle?.chassisNumber || null,
    vehicleModelId: advance.vehicleModelId || null,
    staffId: advance.staffId,
    staffName: advance.staff?.name || "Unknown",
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
      staff: { select: { name: true } },
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
        staffName: advance.staff.name,
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
        staffName: advance.staff.name,
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
  models: AdvanceVehicleModelOption[]
}> {
  const { organizationId } = await requireOrganizationUser()
  const [customers, branches, models] = await Promise.all([
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
    // Every model of the dealership, not only the ones in stock: an advance can book a model that has no bike yet.
    prisma.vehicleModel.findMany({
      where: { organizationId },
      select: { id: true, brand: true, modelName: true, defaultPrice: true },
      orderBy: [{ brand: "asc" }, { modelName: "asc" }],
    }),
  ])

  return { customers, branches, models }
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
  if (!session?.user || !hasPermission(session.user, "CREATE_SALE")) {
    return { success: false, error: "You do not have permission to manage customer advances." }
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
    const advance = await prisma.$transaction(async (tx) => {
      const created = await tx.advancePayment.create({
      data: {
        organizationId,
        customerId: customer.id,
        nicNumber: data.nicNumber,
        tinNumber: normalizeTin(data.tinNumber),
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
      await recordAudit(
        tx,
        { id: userId, name: session?.user?.name ?? "Unknown", organizationId, branchId: session?.user?.branchId },
        {
          action: "ADVANCE_RECORDED",
          entityType: "AdvancePayment",
          entityId: created.id,
          branchId: branch.id,
          description: `Customer advance of ${data.amount.toFixed(2)} recorded for ${data.bikeModel}`,
        },
      )
      return created
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
  if (!session?.user || !hasPermission(session.user, "CREATE_SALE")) {
    return { success: false, error: "You do not have permission to manage customer advances." }
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
          tinNumber: normalizeTin(data.tinNumber),
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
  if (!session?.user || !hasPermission(session.user, "CREATE_SALE")) {
    return { success: false, error: "You do not have permission to manage customer advances." }
  }
  // Refunding pays money back: only the owner, or staff the owner has allowed, may do it. Checked here, not in the screen.
  if (!hasPermission(session.user, "REFUND_ADVANCES")) {
    return {
      success: false,
      error: "Only the dealership owner, or staff the owner has allowed to refund advances, can refund an advance.",
    }
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
      await recordAudit(
        tx,
        {
          id: session?.user?.id ?? "",
          name: session?.user?.name ?? "Unknown",
          organizationId,
          branchId: session?.user?.branchId,
        },
        {
          action: "ADVANCE_REFUNDED",
          entityType: "AdvancePayment",
          entityId: advance.id,
          description: `Customer advance of ${advance.amount.toFixed(2)} refunded via ${parsedInput.data.paymentMethod}`,
        },
      )
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
      status: VehicleStatus.AVAILABLE,
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
  tinNumber?: string | null
  vehicleId?: string | null
  /** Book a bike model that is not in stock (no specific bike). Ignored when a bike is selected. */
  vehicleModelId?: string | null
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
    let vehicleModelId: string | null = null

    if (vehicleId) {
      const vehicle = await prisma.vehicle.findFirst({
        where: { id: vehicleId, organizationId },
        include: { vehicleModel: true },
      })
      if (vehicle) {
        bikeModel = `${vehicle.vehicleModel.brand} ${vehicle.vehicleModel.modelName}`
        vehicleModelId = vehicle.vehicleModelId
        if (!selectedBranchId) {
          selectedBranchId = vehicle.branchId
        }
      } else {
        vehicleId = null
      }
    }

    // No bike chosen: the advance can still book a bike model that is not in stock.
    const requestedModelId = data.vehicleModelId?.trim() || null
    if (!vehicleId && requestedModelId) {
      const model = await prisma.vehicleModel.findFirst({
        where: { id: requestedModelId, organizationId },
        select: { id: true, brand: true, modelName: true },
      })
      if (!model) return { success: false, error: "The selected bike model was not found." }
      bikeModel = `${model.brand} ${model.modelName}`
      vehicleModelId = model.id
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
    const tinParsed = optionalTinSchema.safeParse(data.tinNumber ?? "")
    if (!tinParsed.success) return { success: false, error: tinParsed.error.issues[0]?.message ?? "Enter a valid TIN." }

    const advance = await (prisma.advancePayment as any).create({
      data: {
        organizationId,
        customerId: customer.id,
        vehicleId: vehicleId || null,
        vehicleModelId,
        nicNumber: customer.nic || "N/A",
        tinNumber: normalizeTin(data.tinNumber),
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