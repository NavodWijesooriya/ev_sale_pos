"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { recordAudit } from "@/lib/audit"
import { requireAnyPermission, requirePermission } from "@/lib/authorize"
import { generateNextCustomerCrn } from "@/lib/customer-crn"
import { colomboDateKey, parseDateKey } from "@/lib/dates"
import { findNicConflict, isNicUniqueViolation, nicConflictMessage, NIC_RACE_MESSAGE, normalizeNic } from "@/lib/nic"
import { loadOwnedVehicles, loadOwnershipHistory } from "@/lib/ownership"
import { branchFilter, hasPermission } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { activeSale } from "@/lib/sale-status"

const transferSchema = z.object({
  vehicleId: z.string().trim().min(1, "Select the bike."),
  newCustomerId: z.string().trim().optional().or(z.literal("")),
  newCustomer: z
    .object({
      name: z.string().trim().min(1, "Enter the new owner's name.").max(120),
      phone: z.string().trim().min(1, "Enter the new owner's phone number.").max(32),
      nic: z.string().trim().max(64).optional().or(z.literal("")),
      address: z.string().trim().max(500).optional().or(z.literal("")),
    })
    .optional(),
  transferDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Select the transfer date."),
  reason: z.string().trim().max(2000, "The reason is too long (2,000 characters at most).").optional().or(z.literal("")),
  transferFee: z.number({ error: "Enter a valid transfer fee." }).finite().min(0, "The transfer fee cannot be negative.").max(10_000_000),
  docTransferForm: z.boolean(),
  docNicCopies: z.boolean(),
  docRegistrationBook: z.boolean(),
  /** Move the (unfinished) DMT / RMV registration to the new owner. */
  updateDmtOwner: z.boolean(),
  /** Finance sale: the staff member confirmed the leasing company may still hold ownership. */
  financeWarningConfirmed: z.boolean(),
})
export type TransferOwnershipInput = z.infer<typeof transferSchema>

export interface TransferCustomerOption {
  id: string
  name: string
  phone: string
  nic: string | null
}

/** Customers matching a NIC or phone fragment (at least 3 characters). */
export async function searchTransferCustomers(query: string): Promise<TransferCustomerOption[]> {
  const user = await requirePermission("TRANSFER_OWNERSHIP")
  const term = typeof query === "string" ? query.trim() : ""
  if (term.length < 3) return []
  return prisma.customer.findMany({
    where: {
      organizationId: user.organizationId,
      OR: [
        { nic: { contains: term, mode: "insensitive" } },
        { phone: { contains: term } },
        { name: { contains: term, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, phone: true, nic: true },
    orderBy: { name: "asc" },
    take: 8,
  })
}

/** What the dialog needs to know about a bike before it asks anything. */
export interface TransferContext {
  vehicleId: string
  label: string
  chassisNumber: string
  currentOwner: { id: string; name: string; phone: string; nic: string | null }
  saleDate: string
  isFinanceSale: boolean
  financeCompanyName: string | null
  /** The DMT / RMV registration exists and is not completed yet, so it could still move to the new owner. */
  dmtOpen: boolean
}

export async function getTransferContext(vehicleId: string): Promise<{ success: true; data: TransferContext } | { success: false; error: string }> {
  try {
    const user = await requirePermission("TRANSFER_OWNERSHIP")
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, organizationId: user.organizationId, ...branchFilter(user) },
      select: {
        id: true,
        chassisNumber: true,
        status: true,
        vehicleModel: { select: { brand: true, modelName: true } },
        sales: {
          where: activeSale,
          take: 1,
          orderBy: { saleDate: "desc" },
          select: {
            saleDate: true,
            paymentType: true,
            financeCompanyId: true,
            financeCompany: { select: { name: true } },
            financeDetail: { select: { financeCompany: true } },
            dmtRegistration: { select: { status: true } },
          },
        },
      },
    })
    if (!vehicle) return { success: false, error: "Bike not found." }
    const sale = vehicle.sales[0]
    if (vehicle.status !== "Sold" || !sale) return { success: false, error: "Only a sold bike can change owner." }
    const history = await loadOwnershipHistory(prisma, user.organizationId, vehicle.id)
    if (!history.currentOwner) return { success: false, error: "This bike has no owner on record." }
    const isFinanceSale = sale.paymentType === "FINANCE" || Boolean(sale.financeCompanyId) || Boolean(sale.financeDetail)
    return {
      success: true,
      data: {
        vehicleId: vehicle.id,
        label: `${vehicle.vehicleModel.brand} ${vehicle.vehicleModel.modelName}`,
        chassisNumber: vehicle.chassisNumber,
        currentOwner: history.currentOwner,
        saleDate: colomboDateKey(sale.saleDate),
        isFinanceSale,
        // Sales details stay with staff who may see sales: others only get the warning, not the lender's name.
        financeCompanyName: hasPermission(user, "CREATE_SALE")
          ? (sale.financeCompany?.name ?? sale.financeDetail?.financeCompany ?? null)
          : null,
        dmtOpen: Boolean(sale.dmtRegistration) && sale.dmtRegistration?.status !== "Completed",
      },
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Could not load the bike." }
  }
}

export async function transferVehicleOwnership(
  input: TransferOwnershipInput,
): Promise<{ success: true; transferId: string; slipNumber: string } | { success: false; error: string }> {
  try {
    // Server-side: the owner, or staff the owner gave the Transfer ownership permission.
    const user = await requirePermission("TRANSFER_OWNERSHIP")
    const data = transferSchema.parse(input)
    const actor = { id: user.id, name: user.name, organizationId: user.organizationId, branchId: user.branchId }

    const date = parseDateKey(data.transferDate)
    if (!date) throw new Error("Select a valid transfer date.")
    if (data.transferDate > colomboDateKey(new Date())) throw new Error("The transfer date cannot be in the future.")
    if (!data.newCustomerId && !data.newCustomer) throw new Error("Choose the new owner or add a new customer.")

    const result = await prisma.$transaction(
      async (tx) => {
        // One transfer of a bike at a time: the current owner is read under this lock.
        await tx.$queryRaw`SELECT id FROM "Vehicle" WHERE id = ${data.vehicleId} AND "organizationId" = ${user.organizationId} FOR UPDATE`

        const vehicle = await tx.vehicle.findFirst({
          where: { id: data.vehicleId, organizationId: user.organizationId, ...branchFilter(user) },
          select: {
            id: true,
            status: true,
            chassisNumber: true,
            sales: {
              where: activeSale,
              take: 1,
              orderBy: { saleDate: "desc" },
              select: {
                id: true,
                saleDate: true,
                paymentType: true,
                financeCompanyId: true,
                financeDetail: { select: { id: true } },
                dmtRegistration: { select: { id: true, status: true, ownerCustomerId: true } },
              },
            },
          },
        })
        if (!vehicle) throw new Error("Bike not found.")
        const sale = vehicle.sales[0]
        if (vehicle.status !== "Sold" || !sale) throw new Error("Only a sold bike can change owner.")
        if (data.transferDate < colomboDateKey(sale.saleDate)) throw new Error("The transfer date cannot be before the sale date.")

        const isFinanceSale = sale.paymentType === "FINANCE" || Boolean(sale.financeCompanyId) || Boolean(sale.financeDetail)
        if (isFinanceSale && !data.financeWarningConfirmed) {
          throw new Error(
            "This bike was sold on finance: the leasing company may still hold ownership until the lease is settled. Confirm the warning to continue.",
          )
        }

        const history = await loadOwnershipHistory(tx, user.organizationId, vehicle.id)
        const from = history.currentOwner
        if (!from) throw new Error("This bike has no owner on record.")

        // New owner: an existing customer, or a new one under the same NIC rules as everywhere else.
        let toCustomerId = data.newCustomerId || ""
        if (toCustomerId) {
          const existing = await tx.customer.findFirst({ where: { id: toCustomerId, organizationId: user.organizationId }, select: { id: true } })
          if (!existing) throw new Error("The selected customer was not found.")
        } else if (data.newCustomer) {
          const nic = normalizeNic(data.newCustomer.nic)
          if (nic) {
            const clash = await findNicConflict(tx, user.organizationId, nic)
            if (clash) throw new Error(nicConflictMessage(clash))
          }
          const crn = await generateNextCustomerCrn(tx)
          const created = await tx.customer.create({
            data: {
              organizationId: user.organizationId,
              category: "DIRECT",
              customerType: "SALE",
              name: data.newCustomer.name,
              phone: data.newCustomer.phone,
              nic,
              address: data.newCustomer.address || null,
              crn,
            },
            select: { id: true },
          })
          toCustomerId = created.id
        }
        if (toCustomerId === from.id) throw new Error("The new owner is the current owner. Choose a different person.")

        // Registration in the new owner's name, only while it is not completed.
        const dmt = sale.dmtRegistration
        const moveDmt = data.updateDmtOwner && Boolean(dmt) && dmt?.status !== "Completed"
        if (moveDmt && dmt) {
          await tx.dMTRegistration.update({ where: { id: dmt.id }, data: { ownerCustomerId: toCustomerId } })
        }

        const slipNumber = `OT-${data.transferDate.replaceAll("-", "")}-${randomUUID().slice(0, 6).toUpperCase()}`
        const transfer = await tx.vehicleOwnershipTransfer.create({
          data: {
            organizationId: user.organizationId,
            slipNumber,
            vehicleId: vehicle.id,
            saleId: sale.id,
            fromCustomerId: from.id,
            toCustomerId,
            transferDate: new Date(Date.UTC(date.year, date.month, date.day)),
            reason: data.reason || null,
            transferFee: data.transferFee,
            docTransferForm: data.docTransferForm,
            docNicCopies: data.docNicCopies,
            docRegistrationBook: data.docRegistrationBook,
            dmtOwnerUpdated: moveDmt,
            dmtPreviousOwnerId: moveDmt ? (dmt?.ownerCustomerId ?? null) : null,
            financeWarningConfirmed: isFinanceSale && data.financeWarningConfirmed,
            createdById: user.id,
            createdByName: user.name,
          },
          select: { id: true, slipNumber: true },
        })

        const to = await tx.customer.findUniqueOrThrow({ where: { id: toCustomerId }, select: { name: true, nic: true } })
        await recordAudit(tx, actor, {
          action: "VEHICLE_OWNERSHIP_TRANSFERRED",
          entityType: "Vehicle",
          entityId: vehicle.id,
          branchId: null,
          description: `Slip ${transfer.slipNumber}: bike ${vehicle.chassisNumber} transferred from ${from.name} (${from.nic ?? "no NIC"}) to ${to.name} (${to.nic ?? "no NIC"}) on ${data.transferDate}; fee ${data.transferFee.toFixed(2)}${
            moveDmt ? "; registration moved to the new owner" : ""
          }${isFinanceSale ? "; finance sale warning confirmed" : ""}`,
        })
        return { transferId: transfer.id, slipNumber: transfer.slipNumber, customerIds: [from.id, toCustomerId], saleId: sale.id }
      },
      { maxWait: 10000, timeout: 30000 },
    )

    revalidatePath(`/dashboard/bikes/${data.vehicleId}`)
    revalidatePath("/dashboard/customers")
    revalidatePath("/dashboard/customers/crm")
    revalidatePath("/dashboard/customers/sales")
    for (const id of result.customerIds) revalidatePath(`/dashboard/customers/${id}`)
    revalidatePath("/dashboard/documents/rmv")
    return { success: true, transferId: result.transferId, slipNumber: result.slipNumber }
  } catch (error) {
    console.error("transferVehicleOwnership error:", error)
    if (isNicUniqueViolation(error)) return { success: false, error: NIC_RACE_MESSAGE }
    if (error instanceof z.ZodError) return { success: false, error: error.issues[0]?.message ?? "Check the transfer details." }
    return { success: false, error: error instanceof Error ? error.message : "Could not transfer the bike." }
  }
}

export interface CustomerTransferRow {
  id: string
  slipNumber: string
  transferDate: string
  direction: "out" | "in"
  vehicleId: string
  vehicleLabel: string
  otherPartyId: string
  otherPartyName: string
  staffName: string
}

/** Transfers a customer gave bikes away in or received bikes by, and the bikes they own today. */
export async function getCustomerOwnership(customerId: string) {
  const user = await requireAnyPermission("MANAGE_CUSTOMERS", "CREATE_SALE")
  const transfers = await prisma.vehicleOwnershipTransfer.findMany({
    where: {
      organizationId: user.organizationId,
      OR: [{ fromCustomerId: customerId }, { toCustomerId: customerId }],
    },
    orderBy: [{ transferDate: "desc" }, { createdAt: "desc" }],
    include: {
      vehicle: { select: { chassisNumber: true, vehicleModel: { select: { brand: true, modelName: true } } } },
      fromCustomer: { select: { id: true, name: true } },
      toCustomer: { select: { id: true, name: true } },
    },
  })
  const rows: CustomerTransferRow[] = transfers.map((t) => {
    const out = t.fromCustomerId === customerId
    return {
      id: t.id,
      slipNumber: t.slipNumber,
      transferDate: t.transferDate.toISOString().slice(0, 10),
      direction: out ? "out" : "in",
      vehicleId: t.vehicleId,
      vehicleLabel: `${t.vehicle.vehicleModel.brand} ${t.vehicle.vehicleModel.modelName} · ${t.vehicle.chassisNumber}`,
      otherPartyId: out ? t.toCustomer.id : t.fromCustomer.id,
      otherPartyName: out ? t.toCustomer.name : t.fromCustomer.name,
      staffName: t.createdByName,
    }
  })
  const canTransfer = hasPermission(user, "TRANSFER_OWNERSHIP")
  return {
    transfers: rows,
    canTransfer,
    owned: canTransfer ? await loadOwnedVehicles(prisma, user.organizationId, customerId) : [],
  }
}
